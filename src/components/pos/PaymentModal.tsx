'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCartStore, useToastStore, useSettingsStore } from '@/lib/store';
import { processSale } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import { Banknote, CreditCard, WifiOff } from 'lucide-react';
import confetti from 'canvas-confetti';
import PaystackHandler from './PaystackHandler';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { queueOfflineSale } from '@/lib/offlineDb';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (saleId: string) => void;
  discount: number;
  finalTotal: number;
  customerId?: string;
  customerType?: 'IN_STORE' | 'ONLINE' | 'BOTH';
  promotionId?: string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  discount,
  finalTotal,
  customerId,
  promotionId,
}) => {
  const cart = useCartStore();
  const { addToast } = useToastStore();
  const { currencySymbol, currency } = useSettingsStore();
  const { user } = useAuth();
  const isOnline = useNetworkStatus();
  
  const paystackInitializeRef = React.useRef<((options: { onSuccess?: (res: { reference: string }) => void; onClose?: () => void }) => void) | null>(null);

  const [method, setMethod] = useState<'CASH' | 'PAYSTACK'>('CASH');
  const [amountGiven, setAmountGiven] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const given = parseFloat(amountGiven) || 0;
  const change = given - finalTotal;
  const isValidCash = method === 'CASH' ? given >= finalTotal : true;

  const triggerConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      zIndex: 9999,
    });
  };

  const handleCheckout = async () => {
    if (cart.items.length === 0) return;

    if (method === 'PAYSTACK') {
      if (!isOnline) {
        addToast('Paystack is only available online.', 'error');
        return;
      }
      if (!paystackInitializeRef.current) {
        addToast('Payment system is initializing...', 'info');
        return;
      }
      setIsProcessing(true);
      paystackInitializeRef.current({
         onSuccess: (response: { reference: string }) => {
          completeSale('PAYSTACK', response.reference);
        },
        onClose: () => {
          setIsProcessing(false);
          addToast('Payment cancelled.', 'info');
        },
      });
      return;
    }

    if (!isOnline) {
      handleOfflineSale();
      return;
    }

    completeSale('CASH');
  };

  const handleOfflineSale = async () => {
    setIsProcessing(true);
    try {
      const saleData = {
        id: `OFFLINE-${Date.now()}`,
        cashierId: user?.id || 'unknown',
        customerId,
        items: cart.items.map(item => ({ ...item })),
        totalAmount: cart.getTotal(),
        discount,
        finalAmount: finalTotal,
        paymentMethodId: 'CASH' as const,
        paymentReference: `OFFLINE-${Date.now()}`,
        promotionId,
        timestamp: new Date().toISOString(),
      };

      await queueOfflineSale(saleData);
      triggerConfetti();
      addToast('Offline sale recorded and queued for sync! 💾', 'success');
      cart.clearCart();
      onComplete('offline-id');
    } catch {
      addToast('Failed to record offline sale.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const completeSale = async (paymentMethodId: 'CASH' | 'PAYSTACK', reference?: string) => {
    setIsProcessing(true);
    try {
      const sale = await processSale({
        cashierId: user?.id || 'unknown',
        customerId,
        items: cart.items.map(item => ({ ...item })),
        totalAmount: cart.getTotal(),
        discount,
        finalAmount: finalTotal,
        paymentMethodId,
        paymentReference: reference,
        promotionId,
      });

      triggerConfetti();
      addToast('Payment successful! 🎉', 'success');
      cart.clearCart();
      onComplete(sale.id);
    } catch (err: unknown) {
      console.error('Sale Processing Error Full Details:', JSON.stringify(err, null, 2));
      const error = err as Record<string, unknown>;
      const errorMessage = (error?.message as string) || (error?.details as string) || 'Payment failed. Please try again.';
      addToast(errorMessage, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Complete Payment">
      <PaystackHandler
        email={user?.username ? `${user.username}@starmart.com` : 'cashier@starmart.com'}
        amount={Math.round(finalTotal * 100)}
        publicKey={process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || ''}
        currency={currency}
        initializeRef={paystackInitializeRef}
      />
      <div className="space-y-5">
        {!isOnline && (
          <div className="p-3 bg-warning/10 border border-warning/20 rounded-xl text-warning text-xs font-bold text-center">
            OFFLINE MODE: Only Cash payments are allowed.
          </div>
        )}

        {/* Payment Method Selector */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMethod('CASH')}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-1 ${
              method === 'CASH'
                ? 'border-primary bg-primary/5 cursor-default'
                : 'border-border hover:border-border/50 hover:cursor-pointer'
            }`}
          >
            <Banknote className={`h-6 w-6 ${method === 'CASH' ? 'text-primary' : ''}`} />
            <span className="text-xs font-medium text-center leading-tight">Cash</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!isOnline) {
                addToast('Online payment requires an internet connection', 'error');
                return;
              }
              setMethod('PAYSTACK');
            }}
            className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-1 ${
              method === 'PAYSTACK'
                ? 'border-primary bg-primary/5 cursor-default'
                : !isOnline
                ? 'opacity-40 grayscale cursor-not-allowed border-muted'
                : 'border-border hover:border-border/50 hover:cursor-pointer'
            }`}
          >
            <div className="relative">
              <CreditCard className={`h-6 w-6 ${method === 'PAYSTACK' ? 'text-primary' : ''}`} />
              {!isOnline && (
                <div className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5 shadow-sm">
                  <WifiOff className="h-3 w-3" />
                </div>
              )}
            </div>
            <span className="text-xs font-medium text-center leading-tight">Paystack</span>
            {!isOnline && <span className="text-[8px] text-destructive font-bold absolute bottom-1 uppercase">Offline</span>}
          </button>
        </div>

        {/* Summary */}
        <div className="bg-muted/30 p-4 rounded-xl space-y-1.5 text-sm">
          {discount > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Discount applied</span>
              <span className="text-success">-{currencySymbol}{discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline">
            <span className="text-muted-foreground text-base">Total Due</span>
            <span className="font-bold text-3xl">{currencySymbol}{finalTotal.toFixed(2)}</span>
          </div>

        </div>

        {/* Cash Tendered */}
        {method === 'CASH' && (
          <div className="space-y-3">
            <Input
              label={`Amount Tendered (${currencySymbol})`}
              type="number"
              step="0.01"
              min={finalTotal}
              placeholder={finalTotal.toFixed(2)}
              value={amountGiven}
              onChange={(e) => setAmountGiven(e.target.value)}
              className="text-xl h-12"
              autoFocus
            />
            {given > 0 && (
              <div className={`p-3 rounded-xl flex justify-between items-center font-semibold ${
                change >= 0
                  ? 'bg-success/10 text-success'
                  : 'bg-destructive/10 text-destructive'
              }`}>
                <span>Change Due:</span>
                <span>{change >= 0 ? `${currencySymbol}${change.toFixed(2)}` : 'Insufficient amount'}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleCheckout}
            disabled={!isValidCash || isProcessing || cart.items.length === 0}
          >
            {isProcessing ? 'Processing...' : `Confirm Payment`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

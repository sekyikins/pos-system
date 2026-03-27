'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCartStore, useToastStore } from '@/lib/store';
import { processSale } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import { Banknote, CreditCard, Smartphone } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (saleId: string) => void;
  discount: number;
  finalTotal: number;
  customerId?: string;
  customerType?: 'POS' | 'ECOMMERCE';
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  discount,
  finalTotal,
  customerId,
  customerType,
}) => {
  const cart = useCartStore();
  const { addToast } = useToastStore();
  const { user } = useAuth();

  const [method, setMethod] = useState<'CASH' | 'CARD' | 'MOBILE_MONEY'>('CASH');
  const [amountGiven, setAmountGiven] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const given = parseFloat(amountGiven) || 0;
  const change = given - finalTotal;
  const isValidCash = method === 'CASH' ? given >= finalTotal : true;

  const handleCheckout = async () => {
    if (cart.items.length === 0) return;

    setIsProcessing(true);
    try {
      const sale = await processSale({
        cashierId: user?.id || 'unknown',
        customerId,
        customerType,
        items: cart.items.map(item => ({ ...item })),
        totalAmount: cart.getTotal(),
        discount,
        finalAmount: finalTotal,
        paymentMethod: method,
      });

      addToast('Payment successful! 🎉', 'success');
      cart.clearCart();
      onComplete(sale.id);
    } catch {
      addToast('Payment failed. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Complete Payment">
      <div className="space-y-5">

        {/* Payment Method Selector */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'CASH', label: 'Cash', Icon: Banknote },
            { id: 'CARD', label: 'Card', Icon: CreditCard },
            { id: 'MOBILE_MONEY', label: 'Mobile Money', Icon: Smartphone },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setMethod(id as typeof method)}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-1 ${
                method === id
                  ? 'border-primary bg-primary/5 hover:cursor-not-allowed'
                  : 'border-border hover:border-border/50 hover:cursor-pointer'
              }`}
            >
              <Icon className={`h-6 w-6 ${method === id ? 'text-primary' : ''}`} />
              <span className="text-xs font-medium text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>

        {/* Summary */}
        <div className="bg-muted/30 p-4 rounded-xl space-y-1.5 text-sm">
          {discount > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Discount applied</span>
              <span className="text-success">-${discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline">
            <span className="text-muted-foreground text-base">Total Due</span>
            <span className="font-black text-3xl">${finalTotal.toFixed(2)}</span>
          </div>

        </div>

        {/* Cash Tendered */}
        {method === 'CASH' && (
          <div className="space-y-3">
            <Input
              label="Amount Tendered ($)"
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
                <span>{change >= 0 ? `$${change.toFixed(2)}` : 'Insufficient amount'}</span>
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

'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Search, AlertCircle, ArrowRight, PackageX, Minus, Plus } from 'lucide-react';
import { getSaleForReturn, checkReturnEligibility, initiateInStoreReturn } from '@/lib/db_extended';
import { Sale, TransactionItem } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { useToastStore, useSettingsStore } from '@/lib/store';
import { CopyableId } from '@/components/ui/CopyableId';

interface InitiateReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InitiateReturnModal({ isOpen, onClose }: InitiateReturnModalProps) {
  const { user } = useAuth();
  const { addToast } = useToastStore();
  const { currencySymbol } = useSettingsStore();

  const [step, setStep] = useState<1 | 2>(1);
  const [saleId, setSaleId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sale, setSale] = useState<Sale | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Return state
  const [reason, setReason] = useState('');
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});

  const resetState = () => {
    setStep(1);
    setSaleId('');
    setSale(null);
    setReason('');
    setReturnQuantities({});
    setError(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const isItemReturnable = (item: TransactionItem) => {
    return item.is_returnable !== false;
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleId.trim()) return;

    setIsLoading(true);
    try {
      // 1. Fetch sale
      const foundSale = await getSaleForReturn(saleId.trim());
      if (!foundSale) throw new Error('Sale not found. Please check the ID.');

      // 2. Check eligibility (limits)
      await checkReturnEligibility(foundSale.id, foundSale.customerId);

      setSale(foundSale);
      
      // Init quantities
      const initialQtys: Record<string, number> = {};
      foundSale.items.forEach(i => {
         if (isItemReturnable(i)) initialQtys[i.productId] = 0;
      });
      setReturnQuantities(initialQtys);
      
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuantityChange = (productId: string, change: number, max: number) => {
    setReturnQuantities(prev => {
      const current = prev[productId] || 0;
      const next = Math.max(0, Math.min(max, current + change));
      return { ...prev, [productId]: next };
    });
  };

  const handleSubmitReturn = async () => {
    const selectedItems = sale?.items.filter(i => returnQuantities[i.productId] > 0) || [];
    if (selectedItems.length === 0) {
      addToast('Please select at least one item to return', 'error');
      return;
    }
    if (!reason.trim()) {
      addToast('Please provide a reason for the return', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const itemsPayload = selectedItems.map(i => ({
        productId: i.productId,
        quantity: returnQuantities[i.productId],
        unitPrice: i.price
      }));

      await initiateInStoreReturn(sale!.id, user!.id, sale!.customerId, reason, itemsPayload);
      
      addToast('Return request initiated successfully', 'success');
      handleClose();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to initiate return', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const totalReturnQuantity = Object.values(returnQuantities).reduce((a, b) => a + b, 0);
  
  // Calculate potential refund
  let returnSubtotal = 0;
  if (sale) {
    sale.items.forEach(i => {
       if (returnQuantities[i.productId] > 0) {
         returnSubtotal += i.price * returnQuantities[i.productId];
       }
    });
  }
  const estimatedRefund = returnSubtotal * 0.8;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Initiate Return" size={step === 1 ? 'sm' : 'md'}>
      {step === 1 ? (
        <form onSubmit={handleLookup} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Sale ID / Receipt Number</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                autoFocus
                placeholder="e.g. e89b12d3..."
                value={saleId}
                onChange={e => {
                  setSaleId(e.target.value);
                  if (error) setError(null);
                }}
                className={`w-full h-10 pl-10 pr-3 rounded-xl border bg-background focus:outline-none focus:ring-2 ${error ? 'border-destructive focus:ring-destructive/30' : 'border-border focus:ring-primary/30'}`}
              />
            </div>
            {error ? (
              <p className="text-xs font-bold text-destructive mt-2 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {error}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-2">Returns are only allowed within 7 days of purchase. A 20% restocking fee applies.</p>
            )}
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" type="button" onClick={handleClose}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={isLoading || !saleId.trim()}>
              {isLoading ? 'Searching...' : 'Find Sale'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="bg-muted/30 p-4 rounded-xl border border-border flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Sale Found</p>
              <CopyableId id={sale?.id || ''} className="scale-90 origin-left" />
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Date</p>
              <p className="font-medium text-sm">{new Date(sale!.timestamp).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Select Items to Return</label>
            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
              {sale?.items.map(item => {
                const returnable = isItemReturnable(item);
                const qty = returnQuantities[item.productId] || 0;
                return (
                  <div key={item.productId} className={`p-3 rounded-xl border ${returnable ? 'border-border bg-card' : 'border-destructive/20 bg-destructive/5 opacity-70'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-sm">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">Purchased: {item.quantity} × {currencySymbol}{item.price.toFixed(2)}</p>
                        {!returnable && (
                           <p className="text-[10px] font-bold text-destructive flex items-center gap-1 mt-1">
                             <PackageX className="h-3 w-3" /> Non-returnable item
                           </p>
                        )}
                      </div>
                    </div>
                    {returnable && (
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-sm font-medium text-muted-foreground">Return Qty:</span>
                        <div className="flex items-center gap-3">
                          <button 
                            type="button"
                            onClick={() => handleQuantityChange(item.productId, -1, item.quantity)}
                            disabled={qty === 0}
                            className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-50"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-4 text-center font-bold">{qty}</span>
                          <button 
                            type="button"
                            onClick={() => handleQuantityChange(item.productId, 1, item.quantity)}
                            disabled={qty === item.quantity}
                            className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-50"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-sm font-medium">Reason for Return</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Please explain why the items are being returned..."
              className="w-full h-20 p-3 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex justify-between items-center">
            <div className="flex items-center gap-2 text-primary">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-bold">Estimated Refund (80%)</span>
            </div>
            <span className="text-lg font-bold text-primary">{currencySymbol}{estimatedRefund.toFixed(2)}</span>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" type="button" onClick={() => setStep(1)}>Back</Button>
            <Button variant="primary" type="button" onClick={handleSubmitReturn} disabled={isLoading || totalReturnQuantity === 0 || !reason.trim()}>
              {isLoading ? 'Processing...' : 'Submit Request'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

'use client';

import { useSyncExternalStore, useCallback, useEffect } from 'react';
import { getQueuedSales, deleteQueuedSale } from '@/lib/offlineDb';
import { processSale } from '@/lib/db';
import { useToastStore } from '@/lib/store';

function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

export function useNetworkStatus() {
  const isOnline = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true // Initial value for server-side rendering
  );

  const addToast = useToastStore(state => state.addToast);

  const syncOfflineSales = useCallback(async () => {
    const queued = await getQueuedSales();
    if (queued.length === 0) return;

    let successCount = 0;
    for (const sale of queued) {
      try {
        await processSale({
          cashierId: sale.cashierId,
          customerId: sale.customerId,
          items: sale.items,
          totalAmount: sale.totalAmount,
          discount: sale.discount,
          finalAmount: sale.finalAmount,
          paymentMethodId: sale.paymentMethodId,
          paymentReference: sale.paymentReference,
          promotionId: sale.promotionId,
        });
        await deleteQueuedSale(sale.id);
        successCount++;
      } catch (err) {
        console.error('Failed to sync offline sale:', err);
      }
    }

    if (successCount > 0) {
      addToast(`Successfully synced ${successCount} offline sales!`, 'success');
    }
  }, [addToast]);

  // Handle toast notifications and syncing when coming online
  useEffect(() => {
    if (isOnline) {
      // We don't want to toast on initial mount if usually online
      // but only when transitioning from offline
    } else {
      addToast('Working offline. Paystack disabled.', 'info');
    }
  }, [isOnline, addToast]);

  // Trigger sync on reconnection
  useEffect(() => {
    const handleOnline = () => {
      addToast('Back online! Syncing data...', 'success');
      syncOfflineSales();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [addToast, syncOfflineSales]);

  return isOnline;
}

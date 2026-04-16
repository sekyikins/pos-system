'use client';

import React, { useEffect } from 'react';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { AuthProvider } from '@/lib/auth';
import { useSettingsStore, useCartStore } from '@/lib/store';
import { Product } from '@/lib/types';
import { supabase } from '@/lib/supabase';

function SettingsInitializer({ children }: { children: React.ReactNode }) {
  const { refreshSettings } = useSettingsStore();
  
  useEffect(() => {
    refreshSettings();

    const channel = supabase
      .channel('settings-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_settings' }, () => {
        refreshSettings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshSettings]);
  
  return <>{children}</>;
}

function CartSynchronizer() {
  useEffect(() => {
    const channel = supabase
      .channel('cart-realtime-prices')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'products' }, (payload) => {
        const updatedProduct = payload.new as Product;
        const items = useCartStore.getState().items;
        
        const hasMatch = items.some(i => i.productId === updatedProduct.id);
        if (hasMatch) {
          useCartStore.setState((state) => ({
            items: state.items.map(item => 
              item.productId === updatedProduct.id 
                ? { 
                    ...item, 
                    price: updatedProduct.price,
                    costPrice: updatedProduct.costPrice || item.costPrice,
                    subtotal: item.quantity * updatedProduct.price 
                  }
                : item
            )
          }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  return null;
}

export function LayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <SettingsInitializer>
          <CartSynchronizer />
          {children}
        </SettingsInitializer>
      </AuthProvider>
    </ThemeProvider>
  );
}

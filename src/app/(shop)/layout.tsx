'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { CartSidebar } from '@/components/cart/CartSidebar';

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const pathname = usePathname();

  const isCheckout = pathname === '/checkout';

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className={`flex-1 flex flex-col min-w-0 transition-all ${isMobileCartOpen && !isCheckout ? 'hidden lg:flex' : 'flex'}`}>
        <Navbar 
          variant="storefront" 
          onMobileCartToggle={() => setIsMobileCartOpen(true)}
        />
        {/* We let the page itself handle its scrolling if it wants to, or provide a default */}
        {children}
      </div>
      
      {!isCheckout && (
        <CartSidebar 
          variant="storefront"
          isOpen={isMobileCartOpen}
          onClose={() => setIsMobileCartOpen(false)}
        />
      )}
    </div>
  );
}

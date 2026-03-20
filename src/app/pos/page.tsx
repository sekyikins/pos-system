'use client';

import React, { useState, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { useCartStore, useToastStore } from '@/lib/store';
import { getProducts, getProductByBarcode } from '@/lib/mock-db';
import { Product } from '@/lib/types';
import { Navbar } from '@/components/layout/Navbar';
import { CartSidebar } from '@/components/cart/CartSidebar';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Search } from 'lucide-react';

export default function POSPage() {
  const { user, isLoading } = useAuth();
  const cart = useCartStore();
  const { addToast } = useToastStore();
  const searchRef = useRef<HTMLInputElement>(null);

  const [products] = useState<Product[]>(getProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [lastBarcodeHit, setLastBarcodeHit] = useState<string | null>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    
    if (!val.trim()) {
      setLastBarcodeHit(null);
      return;
    }
    const match = getProductByBarcode(val.trim());
    if (match && match.barcode === val.trim() && lastBarcodeHit !== val.trim()) {
      setLastBarcodeHit(val.trim());
      if (match.quantity > 0) {
        cart.addItem(match);
        addToast(`✓ Added ${match.name} via barcode`, 'success');
        setTimeout(() => setSearchQuery(''), 300);
      } else {
        addToast(`${match.name} is out of stock`, 'error');
      }
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.barcode.includes(searchQuery) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddToCart = (product: Product) => {
    if (product.quantity <= 0) {
      addToast('Product out of stock', 'error');
      return;
    }
    cart.addItem(product);
    addToast(`Added ${product.name}`, 'success');
  };

  if (isLoading || !user || user.role === 'CUSTOMER') return null;

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      <div className={`flex-1 flex flex-col min-w-0 transition-all ${isMobileCartOpen ? 'hidden lg:flex' : 'flex'}`}>
        <Navbar 
          variant="pos" 
          onMobileCartToggle={() => setIsMobileCartOpen(true)}
        />

        <div className="px-4 lg:px-6 py-3 shrink-0 bg-card border-b border-border shadow-sm">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3.5 top-3 h-5 w-5 text-muted-foreground/60" />
            <input
              ref={searchRef}
              className="w-full h-11 rounded-xl border border-border bg-muted/50 pl-11 pr-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-base transition-all placeholder:text-muted-foreground/50"
              placeholder="Search by name, category or scan barcode..."
              value={searchQuery}
              onChange={handleSearchChange}
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 lg:p-5">
          <ProductGrid 
            products={filteredProducts}
            searchQuery={searchQuery}
            variant="pos"
            onAddToCart={handleAddToCart}
          />
        </div>
      </div>

      <CartSidebar 
        variant="pos"
        isOpen={isMobileCartOpen}
        onClose={() => setIsMobileCartOpen(false)}
      />
    </div>
  );
}

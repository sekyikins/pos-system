'use client';

import React from 'react';
import { Product } from '@/lib/types';
import { ProductCard } from './ProductCard';
import { useCartStore } from '@/lib/store';
import { Search } from 'lucide-react';

interface ProductGridProps {
  products: Product[];
  searchQuery: string;
  variant?: 'storefront' | 'pos';
  onAddToCart: (product: Product) => void;
}

export function ProductGrid({ products, searchQuery, variant = 'storefront', onAddToCart }: ProductGridProps) {
  const cart = useCartStore();

  const currentCartQuantity = (productId: string) => {
    const item = cart.items.find(i => i.productId === productId);
    return item ? item.quantity : 0;
  };

  if (products.length === 0) {
    if (variant === 'pos') {
      return (
        <div className="col-span-full py-12 text-center text-slate-400">
          No products found for &quot;{searchQuery}&quot;
        </div>
      );
    }
    
    return (
      <div className="col-span-full py-16 flex flex-col items-center justify-center text-center text-slate-500">
         <Search className="h-12 w-12 text-slate-300 mb-4" />
         <h3 className="text-xl font-medium mb-1">No products found</h3>
         <p>Try adjusting your search criteria</p>
      </div>
    );
  }

  // POS Variant grid is tighter
  if (variant === 'pos') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
        {products.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            variant="pos"
            onAddToCart={onAddToCart}
            inCartQuantity={currentCartQuantity(product.id)}
          />
        ))}
      </div>
    );
  }

  // Storefront variant grid
  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20 lg:pb-0">
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          variant="storefront"
          onAddToCart={onAddToCart}
        />
      ))}
    </div>
  );
}

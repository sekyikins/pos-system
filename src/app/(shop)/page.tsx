'use client';

import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { getProducts } from '@/lib/mock-db';
import { Product } from '@/lib/types';
import { useCartStore, useToastStore } from '@/lib/store';
import { ProductGrid } from '@/components/product/ProductGrid';

export default function StorefrontPage() {
  const [products] = useState<Product[]>(getProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const cart = useCartStore();
  const { addToast } = useToastStore();

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddToCart = (product: Product) => {
    if (product.quantity <= 0) {
      addToast('Sorry, this product is out of stock', 'error');
      return;
    }
    cart.addItem(product);
    addToast(`Added ${product.name} to cart`, 'success');
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Hero Section */}
      <div className="bg-primary/5 py-8 px-4 lg:px-8 text-center sm:text-left shrink-0 border-b border-border">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-2 tracking-tight">
              Welcome to ModernStore!
            </h1>
            <p className="text-muted-foreground max-w-lg">
              Browse our products, add them to your cart, and experience our responsive customer portal simulated view.
            </p>
          </div>
          
          <div className="w-full sm:w-auto relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground/60" />
            <input
              className="w-full h-12 rounded-full border border-border bg-card pl-11 pr-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50 text-foreground"
              placeholder="Search our catalog..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Product Grid Area */}
      <div className="p-4 lg:p-8">
        <ProductGrid 
          products={filteredProducts} 
          searchQuery={searchQuery} 
          variant="storefront"
          onAddToCart={handleAddToCart}
        />
      </div>
    </div>
  );
}

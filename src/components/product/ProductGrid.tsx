import React from 'react';
import { Product } from '@/lib/types';
import { Plus, LayoutGrid } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { useSettingsStore } from '@/lib/store';

interface ProductGridProps {
  products: Product[];
  searchQuery: string;
  variant: 'pos' | 'storefront';
  onAddToCart: (product: Product) => void;
  isLoading?: boolean;
}

export const ProductGrid: React.FC<ProductGridProps> = ({ products, searchQuery, onAddToCart, isLoading }) => {
  const { currencySymbol } = useSettingsStore();
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4">
        {[...Array(15)].map((_, i) => (
          <div key={i} className="bg-card rounded-xl border border-border overflow-hidden h-44 flex flex-col p-4 space-y-3 animate-pulse">
             <div className="space-y-2">
               <Skeleton className="h-5 w-3/4 rounded-md" />
               <Skeleton className="h-4 w-1/2 rounded-md opacity-60" />
             </div>
             <Skeleton className="h-3 w-1/4 mt-auto rounded-sm opacity-40" />
             <div className="flex justify-between items-end">
               <Skeleton className="h-7 w-16 rounded-lg" />
               <Skeleton className="h-5 w-10 rounded border border-border/50" />
             </div>
             <Skeleton className="h-10 w-full rounded-lg mt-2" />
          </div>
        ))}
      </div>
    );
  }


  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
        <LayoutGrid className="h-12 w-12 mb-4 opacity-50" />
        <p>No products found matching &apos;{searchQuery}&apos;</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4">
      {products.map(product => (
        <div key={product.id} className="bg-card rounded-xl border border-border overflow-hidden hover:border-primary/50 transition-all flex flex-col shadow-sm hover:shadow-md">
          <div className="p-3 md:p-4 flex-1 flex flex-col">
            <div className="flex justify-between items-start mb-2">
               <h3 className="font-bold text-sm md:text-base leading-tight line-clamp-2 pr-2">{product.name}</h3>
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground mb-3 mt-auto uppercase tracking-wider font-semibold">{product.category}</p>
            <div className="flex items-end justify-between">
              <span className="font-black text-lg md:text-xl">{currencySymbol}{product.price.toFixed(2)}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border leading-tight ${
                product.quantity > 10 ? 'bg-success/10 text-success border-success/20' 
                : product.quantity > 0 ? 'bg-warning/10 text-warning border-warning/20' 
                : 'bg-destructive/10 text-destructive border-destructive/20'
              }`}>
                {product.quantity > 0 ? `${product.quantity} left` : 'Out'}
              </span>
            </div>
          </div>
          <button 
            onClick={() => onAddToCart(product)}
            disabled={product.quantity <= 0}
            className="w-full bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground font-semibold py-2.5 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:hover:bg-primary/10 disabled:hover:text-primary disabled:cursor-not-allowed text-sm"
          >
            <Plus className="h-4 w-4 shrink-0" /> Add to Cart
          </button>
        </div>
      ))}
    </div>
  );
};

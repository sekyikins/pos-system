'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Product } from '@/lib/types';
import { Package, Store, ShoppingCart } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  inCartQuantity?: number;
  onAddToCart: (product: Product) => void;
  variant?: 'storefront' | 'pos';
}

export function ProductCard({ product, inCartQuantity = 0, onAddToCart, variant = 'storefront' }: ProductCardProps) {
  const isOutOfStock = product.quantity <= 0;

  if (variant === 'pos') {
    return (
      <Card
        className={`cursor-pointer transition-all hover:shadow-lg active:scale-95 border-border hover:border-primary flex flex-col ${
          isOutOfStock ? 'opacity-50' : ''
        } ${inCartQuantity > 0 ? 'ring-2 ring-primary' : ''}`}
        onClick={() => !isOutOfStock && onAddToCart(product)}
      >
        <CardContent className="p-3 flex flex-col h-full">
          <div className="flex justify-between items-start mb-2 gap-1 flex-wrap">
            {isOutOfStock ? (
              <Badge variant="destructive" className="text-[10px] py-0 px-1.5 h-4">Out of stock</Badge>
            ) : product.quantity <= 5 ? (
              <Badge variant="warning" className="text-[10px] py-0 px-1.5 h-4">Low: {product.quantity}</Badge>
            ) : (
              <span className="text-[10px] text-slate-500">Qty: {product.quantity}</span>
            )}
            {inCartQuantity > 0 && (
              <Badge className="bg-success text-success-foreground text-[10px] py-0 px-1.5 h-4 ml-auto">{inCartQuantity}×</Badge>
            )}
          </div>
          <div className="flex-1 flex flex-col items-center justify-center py-3">
            <div className="h-10 w-10 bg-muted/50 rounded-lg flex items-center justify-center mb-3">
              <Package className="h-6 w-6 text-muted-foreground/30" />
            </div>
            <h3 className="font-semibold text-sm text-center leading-tight line-clamp-2">{product.name}</h3>
            <span className="text-[11px] text-muted-foreground mt-1 uppercase tracking-wider">{product.category}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-border">
            <span className="font-bold text-base text-foreground">${product.price.toFixed(2)}</span>
            <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
              <span className="text-xl leading-none -mt-1 font-bold">+</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Storefront variant
  return (
    <Card 
      className={`overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1.5 group border-border hover:border-primary/50 ${
        isOutOfStock ? 'opacity-60 grayscale' : ''
      }`}
    >
      <div className="h-48 bg-muted/30 flex flex-col items-center justify-center p-6 relative">
         <div className="h-24 w-24 bg-card rounded-2xl shadow-md flex items-center justify-center mb-4 rotate-3 group-hover:rotate-0 transition-transform duration-300 border border-border/50">
            <Store className="h-10 w-10 text-primary opacity-40 group-hover:opacity-100 transition-opacity" />
         </div>
         
         {isOutOfStock && (
            <div className="absolute inset-0 bg-background/20 backdrop-blur-sm flex items-center justify-center z-10">
               <Badge variant="destructive" className="px-3 py-1 shadow-lg">Out of stock</Badge>
            </div>
         )}
         {product.quantity <= 5 && !isOutOfStock && (
            <Badge variant="warning" className="absolute top-3 right-3 shadow-sm">Only {product.quantity} left</Badge>
         )}
         <Badge variant="secondary" className="absolute top-3 left-3">{product.category}</Badge>
      </div>
      
      <CardContent className="p-5">
         <h3 className="font-bold text-xl mb-1 group-hover:text-primary transition-colors line-clamp-1">{product.name}</h3>
         <p className="text-2xl font-black text-foreground mb-4">${product.price.toFixed(2)}</p>
         
         <Button 
           fullWidth 
           onClick={() => onAddToCart(product)}
           disabled={isOutOfStock}
           className="h-12 text-sm font-bold uppercase tracking-wider gap-2 shadow-lg hover:shadow-primary/20"
         >
           <ShoppingCart className="h-4 w-4" /> Add to Cart
         </Button>
      </CardContent>
    </Card>
  );
}

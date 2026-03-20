'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCartStore, useToastStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Customer, Product } from '@/lib/types';
import { getCustomers, getProducts } from '@/lib/mock-db';
import { PaymentModal } from '@/components/pos/PaymentModal';
import { ReceiptModal } from '@/components/pos/ReceiptModal';
import { ShoppingCart, X, Minus, Plus, UserCircle, ChevronDown, Tag } from 'lucide-react';

export type CartVariant = 'storefront' | 'pos';

interface CartSidebarProps {
  variant: CartVariant;
  isOpen: boolean;
  onClose: () => void;
}

export function CartSidebar({ variant, isOpen, onClose }: CartSidebarProps) {
  const cart = useCartStore();
  const { addToast } = useToastStore();
  const { user } = useAuth();
  const router = useRouter();

  // Reference for products (used for max stock checks)
  const [products, setProducts] = useState<Product[]>(getProducts);
  
  // POS-specific state
  const [customers] = useState<Customer[]>(variant === 'pos' ? getCustomers() : []);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [discountValue, setDiscountValue] = useState('0');
  const [discountType, setDiscountType] = useState<'FLAT' | 'PERCENT'>('FLAT');
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone && c.phone.includes(customerSearch))
  );

  const subtotal = cart.getTotal();
  let discountAmount = 0;
  
  if (variant === 'pos') {
    discountAmount = discountType === 'PERCENT'
      ? subtotal * (Math.min(parseFloat(discountValue) || 0, 100) / 100)
      : Math.min(parseFloat(discountValue) || 0, subtotal);
  }
  
  const finalTotal = Math.max(subtotal - discountAmount, 0);

  const handleCheckoutClick = () => {
    if (variant === 'storefront') {
      if (!user) {
        addToast('Please sign in to complete checkout', 'info');
        router.push('/login');
      } else {
        router.push('/checkout');
      }
    } else {
      setIsPaymentOpen(true);
    }
  };

  return (
    <>
      {/* Mobile Cart Overlay */}
      <div 
        className={`fixed inset-0 z-40 bg-background/20 backdrop-blur-sm lg:hidden ${isOpen ? 'block' : 'hidden'}`}
        onClick={onClose}
      />
      
      {/* Cart Sidebar Panel */}
      <div 
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-96 shadow-2xl border-l border-border flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static bg-card ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Cart Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/40 shrink-0">
           <h2 className="text-xl font-bold flex items-center gap-2">
             <ShoppingCart className={`h-5 w-5 ${variant === 'storefront' ? 'text-primary' : ''}`} /> 
             {variant === 'pos' ? 'Current Order' : 'Your Cart'}
             {variant === 'storefront' && (
               <Badge className="bg-success/10 text-success hover:bg-success/20 ml-2 rounded-full py-0">
                  {cart.items.length} items
               </Badge>
             )}
           </h2>
           <div className="flex items-center gap-2">
             <Button variant="ghost" size="sm" onClick={cart.clearCart} disabled={cart.items.length === 0} className="text-xs text-destructive hover:text-destructive/80">
               Clear
             </Button>
             <button 
               className="lg:hidden p-2 rounded-full hover:bg-muted text-muted-foreground"
               onClick={onClose}
             >
               <X className="h-5 w-5" />
             </button>
           </div>
        </div>

        {/* POS Customer Extension */}
        {variant === 'pos' && (
          <div className="p-3 border-b border-border shrink-0">
            <div className="relative">
              <button
                onClick={() => setIsCustomerDropdownOpen(prev => !prev)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm hover:border-primary/50 transition-colors"
              >
                <UserCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="flex-1 text-left truncate">
                  {selectedCustomer ? selectedCustomer.name : <span className="text-muted-foreground/60">Link a customer (optional)</span>}
                </span>
                {selectedCustomer && (
                  <span className="text-xs text-primary shrink-0 font-bold">{selectedCustomer.loyaltyPoints} pts</span>
                )}
                <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-300 ${isCustomerDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isCustomerDropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-card border border-border rounded-lg shadow-xl overflow-hidden glass-effect">
                  <div className="p-2 border-b border-border bg-muted/30">
                    <input
                      className="w-full text-sm px-2 py-1.5 rounded border border-border bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Search customers..."
                      value={customerSearch}
                      onChange={e => setCustomerSearch(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    <button
                      className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                      onClick={() => { setSelectedCustomer(null); setIsCustomerDropdownOpen(false); }}
                    >
                      — No customer
                    </button>
                    {filteredCustomers.map(c => (
                      <button
                        key={c.id}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex justify-between items-center transition-colors"
                        onClick={() => { setSelectedCustomer(c); setIsCustomerDropdownOpen(false); setCustomerSearch(''); }}
                      >
                        <span className="font-medium">{c.name}</span>
                        <span className="text-xs text-muted-foreground">{c.loyaltyPoints} pts</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4">
           {cart.items.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4">
                <div className={`h-24 w-24 rounded-full flex items-center justify-center ${variant === 'storefront' ? 'bg-muted/50' : ''}`}>
                   <ShoppingCart className={`h-10 w-10 ${variant === 'storefront' ? 'text-muted-foreground/40' : 'opacity-20'}`} />
                </div>
                <p className={variant === 'storefront' ? 'font-medium text-muted-foreground' : 'text-sm'}>
                  {variant === 'pos' ? 'Cart is empty' : 'Your cart is empty'}
                </p>
                {variant === 'storefront' && (
                  <Button variant="primary" onClick={onClose} className="lg:hidden">
                     Start Shopping
                  </Button>
                )}
             </div>
           ) : (
             <div className="space-y-4">
               {cart.items.map(item => (
                 <div key={item.id} className={`flex gap-4 relative ${
                   variant === 'storefront' 
                     ? 'bg-card rounded-xl shadow-sm p-4 border border-border'
                     : 'flex flex-col gap-1.5 bg-muted/40 rounded-lg p-3'
                 }`}>
                    {variant === 'storefront' && (
                      <button 
                        onClick={() => cart.removeItem(item.productId)}
                        className="absolute top-2 right-2 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:cursor-pointer rounded-full transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    
                    <div className="flex-1 flex flex-col justify-between">
                      {variant === 'storefront' ? (
                        <div>
                          <div className="font-bold text-foreground line-clamp-1 pr-6" title={item.productName}>{item.productName}</div>
                          <div className="text-sm font-medium text-primary mb-2">${item.price.toFixed(2)}</div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-start">
                          <span className="font-medium text-sm truncate pr-2" title={item.productName}>{item.productName}</span>
                          <span className="font-bold text-sm shrink-0">${item.subtotal.toFixed(2)}</span>
                        </div>
                      )}
                      
                      <div className={`flex items-center justify-between ${variant === 'storefront' ? 'mt-auto' : ''}`}>
                         {variant === 'pos' && (
                            <span className="text-xs text-muted-foreground/60">${item.price.toFixed(2)} each</span>
                         )}
                         <div className={`flex items-center gap-1 border dark:border-slate-700 ${
                           variant === 'storefront' 
                             ? 'bg-muted/50 rounded-lg p-1 border border-border' 
                             : 'bg-card rounded-full px-1 py-0.5 border border-border'
                         }`}>
                            <button 
                              className={`flex items-center justify-center hover:text-destructive disabled:opacity-30 disabled:hover:cursor-not-allowed hover:cursor-pointer ${
                                variant === 'storefront'
                                  ? 'h-7 w-7 rounded-sm bg-card shadow-sm border border-border hover:text-destructive'
                                  : 'h-6 w-6 rounded-full hover:bg-muted hover:text-destructive'
                              }`}
                              onClick={() => {
                                if (item.quantity > 1) {
                                  cart.updateQuantity(item.productId, item.quantity - 1);
                                } else if (variant === 'pos') {
                                  cart.removeItem(item.productId);
                                }
                              }}
                              disabled={variant === 'storefront' && item.quantity <= 1}
                            >
                              {(variant === 'pos' && item.quantity === 1) ? <X className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                            </button>
                            <span className={`${variant === 'storefront' ? 'w-8' : 'w-5'} text-center text-sm font-bold`}>{item.quantity}</span>
                            <button 
                              className={`flex items-center justify-center hover:text-success disabled:opacity-50 disabled:hover:cursor-not-allowed hover:cursor-pointer ${
                                variant === 'storefront'
                                  ? 'h-7 w-7 rounded-sm bg-card shadow-sm'
                                  : 'h-6 w-6 rounded-full hover:bg-muted'
                              }`}
                              onClick={() => {
                                 const product = products.find(p => p.id === item.productId);
                                 if (product) {
                                   cart.updateQuantity(item.productId, item.quantity + 1, product.quantity);
                                 }
                              }}
                              disabled={(() => {
                                const product = products.find(p => p.id === item.productId);
                                return product ? item.quantity >= product.quantity : false;
                              })()}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                         </div>
                         {variant === 'storefront' && (
                           <div className="font-bold text-lg text-foreground">
                              ${item.subtotal.toFixed(2)}
                           </div>
                         )}
                      </div>
                    </div>
                 </div>
               ))}
             </div>
           )}
        </div>

        {/* POS Discount Section */}
        {variant === 'pos' && (
          <div className="px-4 py-3 border-t border-border shrink-0">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground shrink-0">Discount:</span>
              <div className="flex flex-1 gap-1">
                <input
                  type="number"
                  min="0"
                  value={discountValue}
                  onChange={e => setDiscountValue(e.target.value)}
                  className="w-full h-8 px-2 text-sm rounded border border-border bg-muted/30 focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="0"
                />
                <select
                  value={discountType}
                  onChange={e => setDiscountType(e.target.value as 'FLAT' | 'PERCENT')}
                  className="h-8 px-2 text-sm rounded border border-border bg-muted/30 focus:outline-none cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <option value="FLAT">$</option>
                  <option value="PERCENT">%</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Cart Total & Checkout Actions */}
        <div className={`shrink-0 ${
          variant === 'storefront'
            ? 'p-6 bg-muted/20 border-t border-border rounded-t-3xl sm:rounded-none shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]'
            : 'p-4 border-t border-border bg-muted/30'
        }`}>
           <div className={`space-y-3 mb-6 ${variant === 'pos' ? 'text-sm text-muted-foreground mb-3 space-y-1.5' : ''}`}>
              <div className={`flex justify-between ${variant === 'storefront' ? 'text-sm text-muted-foreground font-medium' : ''}`}>
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {variant === 'storefront' ? (
                <div className="flex justify-between text-sm text-muted-foreground font-medium">
                  <span>Tax (Estimated)</span>
                  <span>$0.00</span>
                </div>
              ) : (
                discountAmount > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Discount ({discountType === 'PERCENT' ? `${discountValue}%` : `$${discountValue}`})</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )
              )}
              <div className={`flex justify-between items-end border-t border-border ${
                variant === 'storefront' ? 'pt-3' : 'pt-2 font-bold text-base text-foreground'
              }`}>
                <span className={variant === 'storefront' ? 'text-sm font-bold text-foreground uppercase tracking-wider' : ''}>Total</span>
                <span className={variant === 'storefront' ? 'text-3xl font-black text-foreground' : ''}>${finalTotal.toFixed(2)}</span>
              </div>
           </div>

            <Button 
              fullWidth 
              className={`font-bold bg-primary hover:bg-primary/90 text-primary-foreground ${
                variant === 'storefront' 
                  ? 'h-14 text-lg rounded-xl shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5'
                  : 'h-13 text-base'
              }`}
             size={variant === 'pos' ? 'lg' : undefined}
             disabled={cart.items.length === 0}
             onClick={handleCheckoutClick}
           >
             {variant === 'storefront' ? 'Proceed to Checkout' : `Charge $${finalTotal.toFixed(2)}`}
           </Button>
           
            {variant === 'storefront' && !user && cart.items.length > 0 && (
              <p className="text-center text-xs text-muted-foreground mt-4">
                <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link> for faster checkout
              </p>
            )}
        </div>
      </div>

      {/* POS Modals */}
      {variant === 'pos' && isPaymentOpen && (
        <PaymentModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          customerId={selectedCustomer?.id}
          discount={discountAmount}
          finalTotal={finalTotal}
          onComplete={(saleId) => {
            setIsPaymentOpen(false);
            setLastSaleId(saleId);
            setIsReceiptOpen(true);
            setSelectedCustomer(null);
            setDiscountValue('0');
            setProducts(getProducts()); // refresh product stock
          }}
        />
      )}

      {variant === 'pos' && isReceiptOpen && lastSaleId && (
        <ReceiptModal
          isOpen={isReceiptOpen}
          onClose={() => { setIsReceiptOpen(false); setLastSaleId(null); }}
          saleId={lastSaleId}
        />
      )}
    </>
  );
}

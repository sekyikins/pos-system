'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCartStore, useToastStore, useSettingsStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Product, Customer, Promotion } from '@/lib/types';
import { getProducts, getPosCustomers, addPosCustomer, getPromotions } from '@/lib/db';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import { PaymentModal } from '@/components/pos/PaymentModal';
import { ReceiptModal } from '@/components/pos/ReceiptModal';
import { ShoppingCart, X, Minus, Plus, UserCircle, Tag, UserPlus, Search as SearchIcon } from 'lucide-react';

export type CartVariant = 'storefront' | 'pos';

interface CartSidebarProps {
  variant: CartVariant;
  isOpen: boolean;
  onClose: () => void;
}

export function CartSidebar({ variant, isOpen, onClose }: CartSidebarProps) {
  const cart = useCartStore();
  const { addToast } = useToastStore();
  const { currencySymbol } = useSettingsStore();
  const { user } = useAuth();
  const router = useRouter();

  // Reference for products (used for max stock checks)
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [csQuery, setCsQuery] = useState('');
  const [isQuickAdd, setIsQuickAdd] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState({ name: '', phone: '' });

  const { data: allCustomers, refetch: refetchCustomers } = useRealtimeTable<Customer>({
    table: 'customer',
    initialData: [],
    fetcher: getPosCustomers,
    refetchOnChange: true
  });

  const { data: promotions } = useRealtimeTable<Promotion>({
    table: 'promotions',
    initialData: [],
    fetcher: getPromotions,
    refetchOnChange: true
  });

  React.useEffect(() => {
    async function loadData() {
      const p = await getProducts();
      setProducts(p);
    }
    loadData();
  }, []);
  
  const selectedCustomer = allCustomers.find((c: Customer) => c.id === selectedCustomerId);
  const filteredCustomers = allCustomers.filter((c: Customer) => 
    c.name.toLowerCase().includes(csQuery.toLowerCase()) || 
    c.phone?.includes(csQuery)
  );

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddForm.name) return;
    try {
      const newC = await addPosCustomer({ name: quickAddForm.name, phone: quickAddForm.phone || undefined });
      await refetchCustomers();
      setSelectedCustomerId(newC.id);
      setIsQuickAdd(false);
      setIsCustomerSearchOpen(false);
      setQuickAddForm({ name: '', phone: '' });
      addToast('Customer added & selected', 'success');
    } catch { addToast('Failed to add customer', 'error'); }
  };
  
  const [discountValue, setDiscountValue] = useState('0');
  const [discountType, setDiscountType] = useState<'FLAT' | 'PERCENT'>('FLAT');
  const [selectedPromoId, setSelectedPromoId] = useState<string | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);

  const subtotal = cart.getTotal();
  let manualDiscount = 0;
  let promoDiscount = 0;
  
  if (variant === 'pos') {
    manualDiscount = discountType === 'PERCENT'
      ? subtotal * (Math.min(parseFloat(discountValue) || 0, 100) / 100)
      : Math.min(parseFloat(discountValue) || 0, subtotal);

    if (selectedPromoId) {
      const promo = promotions.find(p => p.id === selectedPromoId && p.isActive);
      if (promo && subtotal >= (promo.minSubtotal || 0)) {
        promoDiscount = promo.discountType === 'PERCENT'
          ? subtotal * (promo.discountValue / 100)
          : Math.min(promo.discountValue, subtotal - manualDiscount);
      }
    }
  }
  
  const discountAmount = manualDiscount + promoDiscount;
  const finalTotal = Math.max(subtotal - discountAmount, 0);

  const handleCheckoutClick = () => {
    if (variant === 'storefront') {
      if (!user) {
        addToast('Please sign in to complete checkout', 'info');
        router.replace('/login');
      } else {
        router.replace('/checkout');
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


        {/* Customer Section (POS only) */}
        {variant === 'pos' && (
          <div className="px-4 py-3 border-b border-border bg-muted/20 shrink-0">
            {!selectedCustomer ? (
              <Button 
                variant="outline" 
                size="sm" 
                fullWidth 
                className="justify-start gap-2 h-10 border-dashed"
                onClick={() => setIsCustomerSearchOpen(true)}
              >
                <UserPlus className="h-4 w-4" /> Select Customer
              </Button>
            ) : (
              <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl p-2.5">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                    <UserCircle className="h-5 w-5" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-sm font-bold truncate">{selectedCustomer.name}</div>
                    <div className="text-[10px] text-muted-foreground">{selectedCustomer.phone || 'No phone'}</div>
                  </div>
                </div>
                <button onClick={() => setSelectedCustomerId(null)} className="p-1.5 hover:bg-primary/20 rounded-full text-primary transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Customer Search / Quick Add Modal-ish Overlay */}
            {isCustomerSearchOpen && (
              <div className="absolute inset-x-0 top-15 bottom-0 z-30 bg-card flex flex-col animate-in slide-in-from-top duration-200">
                <div className="p-4 border-b border-border flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm">Customer Lookup</h3>
                    <button onClick={() => setIsCustomerSearchOpen(false)} className="p-1 hover:bg-muted rounded-md"><X className="h-4 w-4" /></button>
                  </div>
                  
                  {!isQuickAdd ? (
                    <>
                      <div className="relative">
                        <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input 
                          autoFocus
                          placeholder="Search customers..." 
                          className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-muted focus:ring-1 focus:ring-primary outline-none text-sm"
                          value={csQuery}
                          onChange={e => setCsQuery(e.target.value)}
                        />
                      </div>
                      <Button variant="ghost" size="sm" fullWidth className="h-9 gap-1 text-primary" onClick={() => setIsQuickAdd(true)}>
                        <UserPlus className="h-4 w-4" /> Add New Customer
                      </Button>
                    </>
                  ) : (
                    <form onSubmit={handleQuickAdd} className="space-y-3 p-1">
                       <div className="text-xs font-semibold uppercase text-muted-foreground/60">Quick Add</div>
                       <input 
                         required 
                         placeholder="Customer Name" 
                         className="w-full h-9 px-3 rounded-lg border border-border bg-muted outline-none text-sm"
                         value={quickAddForm.name}
                         onChange={e => setQuickAddForm({...quickAddForm, name: e.target.value})}
                         autoFocus
                       />
                       <input 
                         placeholder="Phone (optional)" 
                         className="w-full h-9 px-3 rounded-lg border border-border bg-muted outline-none text-sm"
                         value={quickAddForm.phone}
                         onChange={e => setQuickAddForm({...quickAddForm, phone: e.target.value})}
                       />
                       <div className="flex gap-2">
                         <Button type="submit" size="sm" fullWidth>Save & Select</Button>
                         <Button type="button" variant="outline" size="sm" onClick={() => setIsQuickAdd(false)}>Back</Button>
                       </div>
                    </form>
                  )}
                </div>

                {!isQuickAdd && (
                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {filteredCustomers.length > 0 ? filteredCustomers.map(c => (
                      <button 
                        key={c.id} 
                        className="w-full flex items-center gap-3 p-2.5 hover:bg-muted rounded-xl transition-colors text-left group"
                        onClick={() => {
                          setSelectedCustomerId(c.id);
                          setIsCustomerSearchOpen(false);
                          setCsQuery('');
                        }}
                      >
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          <UserCircle className="h-5 w-5" />
                        </div>
                        <div className="overflow-hidden">
                          <div className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{c.name}</div>
                          <div className="text-xs text-muted-foreground">{c.phone || 'No phone'}</div>
                        </div>
                      </button>
                    )) : (
                      <div className="py-8 text-center text-sm text-muted-foreground">No matches found</div>
                    )}
                  </div>
                )}
              </div>
            )}
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
                     : 'flex flex-col gap-1.5 bg-muted/40 rounded-xl p-3'
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
                          <div className="text-sm font-medium text-primary mb-2">{currencySymbol}{item.price.toFixed(2)}</div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-start">
                          <span className="font-medium text-sm truncate pr-2" title={item.productName}>{item.productName}</span>
                          <span className="font-bold text-sm shrink-0">{currencySymbol}{item.subtotal.toFixed(2)}</span>
                        </div>
                      )}
                      
                      <div className={`flex items-center justify-between ${variant === 'storefront' ? 'mt-auto' : ''}`}>
                         {variant === 'pos' && (
                            <span className="text-xs text-muted-foreground/60">{currencySymbol}{item.price.toFixed(2)} each</span>
                         )}
                         <div className={`flex items-center gap-1 ${
                           variant === 'storefront' 
                             ? 'bg-muted/50 rounded-xl p-1 border border-border' 
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
                              {currencySymbol}{item.subtotal.toFixed(2)}
                           </div>
                         )}
                      </div>
                    </div>
                 </div>
               ))}
             </div>
           )}
        </div>

        {/* POS Discount & Promotions */}
        {variant === 'pos' && (
          <div className="px-4 py-3 border-t border-border bg-muted/20 space-y-3 shrink-0">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <select
                  value={selectedPromoId || ''}
                  onChange={e => setSelectedPromoId(e.target.value || null)}
                  className="w-full h-9 px-2 text-xs font-bold rounded-xl border hover:cursor-pointer border-border bg-card focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                >
                  <option value="">Apply Promotion...</option>
                  {promotions.filter(p => p.isActive).map(p => (
                    <option key={p.id} value={p.id} disabled={subtotal < (p.minSubtotal || 0)}>
                      {p.name} ({p.discountType === 'PERCENT' ? `${p.discountValue}%` : `${currencySymbol}${p.discountValue}`})
                      {subtotal < (p.minSubtotal || 0) && ` - Min ${currencySymbol}${p.minSubtotal}`}
                    </option>
                  ))}
                </select>
              </div>
              {selectedPromoId && (
                <button onClick={() => setSelectedPromoId(null)} className="p-1 hover:bg-destructive/10 text-destructive rounded-full hover:cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground shrink-0">Add Discount:</span>
              <div className="flex flex-1 gap-1">
                <input
                  type="number"
                  min="0"
                  value={discountValue}
                  onChange={e => setDiscountValue(e.target.value)}
                  className="w-full h-8 px-2 text-sm font-bold rounded-lg border border-border bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="0"
                />
                <select
                  value={discountType}
                  onChange={e => setDiscountType(e.target.value as 'FLAT' | 'PERCENT')}
                  className="h-8 px-2 text-[10px] font-bold rounded-lg border border-border bg-card focus:outline-none cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <option value="FLAT">{currencySymbol}</option>
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
                <span>{currencySymbol}{subtotal.toFixed(2)}</span>
              </div>
              {variant === 'storefront' ? (
                <div className="flex justify-between text-sm text-muted-foreground font-medium">
                  <span>Tax (Estimated)</span>
                  <span>{currencySymbol}0.00</span>
                </div>
              ) : (
                discountAmount > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Discount ({discountType === 'PERCENT' ? `${discountValue}%` : `${currencySymbol}${discountValue}`})</span>
                    <span>-{currencySymbol}{discountAmount.toFixed(2)}</span>
                  </div>
                )
              )}
              <div className={`flex justify-between items-end border-t border-border ${
                variant === 'storefront' ? 'pt-3' : 'pt-2 font-bold text-base text-foreground'
              }`}>
                <span className={variant === 'storefront' ? 'text-sm font-bold text-foreground uppercase tracking-wider' : ''}>Total</span>
                <span className={variant === 'storefront' ? 'text-3xl font-bold text-foreground' : ''}>{currencySymbol}{finalTotal.toFixed(2)}</span>
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
             disabled={cart.items.length === 0 || (variant === 'pos' && !selectedCustomerId)}
             onClick={handleCheckoutClick}
           >
             {variant === 'storefront' ? 'Proceed to Checkout' : `Charge ${currencySymbol}${finalTotal.toFixed(2)}`}
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
          discount={discountAmount}
          finalTotal={finalTotal}
          customerId={selectedCustomerId || undefined}
          customerType={selectedCustomer?.type}
          promoCode={promotions.find(p => p.id === selectedPromoId)?.code}
          onComplete={(saleId) => {
            setIsPaymentOpen(false);
            setLastSaleId(saleId);
            setIsReceiptOpen(true);
            setDiscountValue('0');
            setSelectedCustomerId(null);
            getProducts().then(setProducts); // refresh product stock
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

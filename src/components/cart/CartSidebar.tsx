'use client';

import React, { useState } from 'react';
import { useCartStore, useToastStore, useSettingsStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { Product, Customer, Promotion } from '@/lib/types';
import { getProducts, getPosCustomers, addPosCustomer, getPromotions } from '@/lib/db';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import { PaymentModal } from '@/components/pos/PaymentModal';
import { ReceiptModal } from '@/components/pos/ReceiptModal';
import { ShoppingCart, X, UserCircle, Tag, UserPlus, Search as SearchIcon } from 'lucide-react';
import { CopyableId } from '@/components/ui/CopyableId';

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
  const cart = useCartStore();
  const { addToast } = useToastStore();
  const { currencySymbol } = useSettingsStore();

  // Reference for products (used for real-time stock numbers and max checks)
  const { data: allProducts } = useRealtimeTable<Product>({
    table: 'products',
    initialData: [],
    fetcher: getProducts,
    refetchOnChange: true,
    cacheKey: 'pos-cart-products'
  });

  const { 
    selectedCustomerId, setSelectedCustomerId,
    discountValue, setDiscountValue,
    discountType, setDiscountType,
    selectedPromoId, setSelectedPromoId
  } = cart;

  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [csQuery, setCsQuery] = useState('');
  const [isQuickAdd, setIsQuickAdd] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState({ name: '', phone: '', email: '' });

  const { data: allCustomers, refetch: refetchCustomers } = useRealtimeTable<Customer>({
    table: 'customers',
    initialData: [],
    fetcher: getPosCustomers,
    refetchOnChange: true,
    cacheKey: 'pos-cart-customers'
  });

  const { data: promotions } = useRealtimeTable<Promotion>({
    table: 'promotions',
    initialData: [],
    fetcher: getPromotions,
    refetchOnChange: true,
    cacheKey: 'pos-cart-promos'
  });
  
  const selectedCustomer = allCustomers.find((c: Customer) => c.id === selectedCustomerId);
  const filteredCustomers = allCustomers.filter((c: Customer) => 
    c.name.toLowerCase().includes(csQuery.toLowerCase()) || 
    c.phone?.includes(csQuery) ||
    c.email?.toLowerCase().includes(csQuery.toLowerCase())
  );

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddForm.name) return;
    try {
      const newC = await addPosCustomer({ 
        name: quickAddForm.name, 
        phone: quickAddForm.phone || undefined,
        email: quickAddForm.email || undefined
      });
      await refetchCustomers();
      setSelectedCustomerId(newC.id);
      setIsQuickAdd(false);
      setIsCustomerSearchOpen(false);
      setQuickAddForm({ name: '', phone: '', email: '' });
      addToast(newC.type === 'BOTH' ? 'Online account linked!' : 'Customer added & selected', 'success');
    } catch { addToast('Failed to add customer', 'error'); }
  };
  
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);

  const subtotal = cart.getTotal();
  
  const manualDiscount = discountType === 'PERCENT'
    ? subtotal * (Math.min(parseFloat(discountValue) || 0, 100) / 100)
    : Math.min(parseFloat(discountValue) || 0, subtotal);

  let promoDiscount = 0;
  if (selectedPromoId) {
    const promo = promotions.find(p => p.id === selectedPromoId && p.isActive);
    if (promo && subtotal >= (promo.minSubtotal || 0)) {
      promoDiscount = promo.discountType === 'PERCENT'
        ? subtotal * (promo.discountValue / 100)
        : Math.min(promo.discountValue, subtotal - manualDiscount);
    }
  }
  
  const discountAmount = manualDiscount + promoDiscount;
  const finalTotal = Math.max(subtotal - discountAmount, 0);

  const handleCheckoutClick = () => {
    setIsPaymentOpen(true);
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
             <ShoppingCart className="h-5 w-5" /> 
             Current Order
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

        {/* Customer Section */}
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
                 <div className="overflow-hidden flex flex-col">
                   <div className="text-sm font-bold truncate leading-tight">{selectedCustomer.name}</div>
                   <div className="flex items-center gap-1.5 mt-0.5">
                     <span className="text-[10px] text-muted-foreground font-mono tracking-tighter">ID:</span>
                     <CopyableId id={selectedCustomer.id} className="scale-75 origin-left" />
                   </div>
                 </div>
              </div>
              <button onClick={() => setSelectedCustomerId(null)} className="p-1.5 hover:bg-primary/20 rounded-full text-primary transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Customer Search Overlay */}
          {isCustomerSearchOpen && (
            <div className="absolute inset-x-0 top-15 bottom-0 z-30 bg-card flex flex-col animate-in slide-in-from-top duration-200">
              <div className="p-4 border-b border-border flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm">Customer Lookup</h3>
                  <button onClick={() => setIsCustomerSearchOpen(false)} className="p-1 hover:bg-muted rounded-md cursor-pointer"><X className="h-4 w-4" /></button>
                </div>
                
                {!isQuickAdd ? (
                  <>
                    <div className="relative">
                      <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <input 
                        autoFocus
                        placeholder="Search customers..." 
                        className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-muted/60 focus:ring-1 focus:ring-primary outline-none text-sm"
                        value={csQuery}
                        onChange={e => setCsQuery(e.target.value)}
                      />
                    </div>
                    <Button variant="ghost" size="sm" fullWidth className="h-9 gap-1 text-primary border" onClick={() => setIsQuickAdd(true)}>
                      <UserPlus className="h-4 w-4" /> Add New Customer
                    </Button>
                  </>
                ) : (
                  <form onSubmit={handleQuickAdd} className="space-y-3 p-1">
                     <div className="text-xs font-semibold uppercase text-muted-foreground/60">Quick Add</div>
                     <input 
                       required 
                       placeholder="Customer Name" 
                       className="w-full h-9 px-3 rounded-lg border border-border bg-muted/60 outline-none text-sm"
                       value={quickAddForm.name}
                       onChange={e => setQuickAddForm({...quickAddForm, name: e.target.value})}
                       autoFocus
                     />
                      <input 
                       placeholder="Phone (optional)" 
                       className="w-full h-9 px-3 rounded-lg border border-border bg-muted/60 outline-none text-sm"
                       value={quickAddForm.phone}
                       onChange={e => setQuickAddForm({...quickAddForm, phone: e.target.value})}
                     />
                     <input 
                       type="email"
                       placeholder="Email (for Online Account linking)" 
                       className="w-full h-9 px-3 rounded-lg border border-border bg-muted/60 outline-none text-sm"
                       value={quickAddForm.email}
                       onChange={e => setQuickAddForm({...quickAddForm, email: e.target.value})}
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
                      title={`Select ${c.name}`}
                      className="w-full flex items-center gap-3 p-2.5 hover:bg-muted/30 cursor-pointer rounded-xl transition-colors text-left group"
                      onClick={() => {
                        setSelectedCustomerId(c.id);
                        setIsCustomerSearchOpen(false);
                        setCsQuery('');
                      }}
                    >
                      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <UserCircle className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{c.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-muted-foreground/80 font-mono tracking-tighter">ID:</span>
                          <CopyableId id={c.id} className="scale-75 origin-left" />
                        </div>
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

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4">
           {cart.items.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 group">
                <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                   <ShoppingCart className="h-10 w-10 opacity-60" />
                </div>
                <p className="text-sm group-hover:text-foreground transition-colors">Cart is empty</p>
             </div>
           ) : (
             <div className="space-y-4">
               {cart.items.map((item, index) => (
                 <div 
                    title={`Click to Change Number of ${item.productName}`}
                    key={item.id} 
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      // Don't focus if they clicked a button or the input itself
                      if (target.closest('button') || target.closest('input')) return;
                      e.currentTarget.querySelector('input')?.focus();
                    }}
                    className="flex flex-col gap-1.5 bg-muted/40 rounded-xl p-3 relative group hover:bg-muted/60 hover:cursor-pointer active:scale-[0.98] transition-all"
                 >
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                        <span className="font-medium text-sm truncate" title={item.productName}>{item.productName}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-muted-foreground font-mono">BC:</span>
                          <CopyableId id={item.productId} className="scale-[0.6] origin-left" />
                        </div>
                      </div>
                      <span className="font-bold text-sm shrink-0" title={`${currencySymbol}${item.subtotal.toFixed(2)}`}>{currencySymbol}{item.subtotal.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                       {(() => {
                          const product = allProducts.find(p => p.id === item.productId);
                          return (
                             <span title={`${product?.quantity} available`} className={`text-xs font-medium ${product && product.quantity < 5 ? 'text-destructive animate-pulse' : 'text-foreground/80'}`}>
                               {product ? `${product.quantity} available` : 'Checking stock...'}
                             </span>
                          );
                       })()}

                       <div className="flex items-center gap-2">
                         <div className="relative group">
                           <input
                             type="number"
                             min="1"
                             autoFocus={index === cart.items.length - 1}
                             onFocus={(e) => e.target.select()}
                             max={(() => {
                               const product = allProducts.find(p => p.id === item.productId);
                               return product ? product.quantity : 999;
                             })()}
                             value={item.quantity}
                             onChange={(e) => {
                               const val = parseInt(e.target.value) || 1;
                               const product = allProducts.find(p => p.id === item.productId);
                               cart.updateQuantity(item.productId, val, product?.quantity);
                             }}
                             className="w-14 h-8 text-center text-sm font-bold bg-card border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                           />
                         </div>
                         
                         <button 
                           className="h-8 w-8 flex items-center justify-center rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all transform active:scale-95"
                           onClick={() => cart.removeItem(item.productId)}
                           title="Remove item"
                         >
                           <X className="h-4 w-4" />
                         </button>
                       </div>
                    </div>
                 </div>
               ))}
             </div>
           )}
        </div>

        {/* Discount & Promotions */}
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

        {/* Cart Total & Checkout Actions */}
        <div className="shrink-0 p-4 border-t border-border bg-muted/30">
           <div className="mb-3 space-y-1.5 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{currencySymbol}{subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount ({discountType === 'PERCENT' ? `${discountValue}%` : `${currencySymbol}${discountValue}`})</span>
                  <span>-{currencySymbol}{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-end border-t border-border pt-2 font-bold text-base text-foreground">
                <span>Total</span>
                <span>{currencySymbol}{finalTotal.toFixed(2)}</span>
              </div>
           </div>

            <Button 
              fullWidth 
              className="font-bold bg-primary hover:bg-primary/90 text-primary-foreground h-13 text-base"
              size="lg"
              disabled={cart.items.length === 0 || !selectedCustomerId}
              onClick={handleCheckoutClick}
            >
              {`Charge ${currencySymbol}${finalTotal.toFixed(2)}`}
            </Button>
        </div>
      </div>

      {/* POS Modals */}
      {isPaymentOpen && (
        <PaymentModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          discount={discountAmount}
          finalTotal={finalTotal}
          customerId={selectedCustomerId || undefined}
          customerType={selectedCustomer?.type}
          promotionId={selectedPromoId || undefined}
          onComplete={(saleId) => {
            setIsPaymentOpen(false);
            setLastSaleId(saleId);
            setIsReceiptOpen(true);
            setDiscountValue('0');
            setSelectedCustomerId(null);
          }}
        />
      )}

      {isReceiptOpen && lastSaleId && (
        <ReceiptModal
          isOpen={isReceiptOpen}
          onClose={() => { setIsReceiptOpen(false); setLastSaleId(null); }}
          saleId={lastSaleId}
        />
      )}
    </>
  );
}

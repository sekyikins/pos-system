'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { useCartStore, useToastStore } from '@/lib/store';
import { getProducts, getProductByBarcode } from '@/lib/db';
import { Product } from '@/lib/types';
import { Navbar } from '@/components/layout/Navbar';
import { CartSidebar } from '@/components/cart/CartSidebar';
import { ProductGrid } from '@/components/product/ProductGrid';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import { ShoppingCart, ShoppingBag, Search } from 'lucide-react';
import { OnlineOrdersList } from '@/components/pos';

export default function POSPage() {
  const { user, isLoading: authLoading } = useAuth();
  const cart = useCartStore();
  const { addToast } = useToastStore();
  const searchRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [lastBarcodeHit, setLastBarcodeHit] = useState<string | null>(null);
  const [view, setView] = useState<'POS' | 'ONLINE'>('POS');

  const { data: products, isLoading: isLoadingProducts } = useRealtimeTable<Product>({
    table: 'products',
    initialData: [],
    fetcher: getProducts,
    refetchOnChange: true
  });

  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    
    if (!val.trim()) {
      setLastBarcodeHit(null);
      return;
    }
    if (lastBarcodeHit === val.trim()) return;
    const match = await getProductByBarcode(val.trim());
    if (match && match.barcode === val.trim()) {
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

  if (authLoading || !user) return null;

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      <div className={`flex-1 flex flex-col min-w-0 transition-all ${isMobileCartOpen ? 'hidden lg:flex' : 'flex'}`}>
        <Navbar 
          variant="pos" 
          onMobileCartToggle={() => setIsMobileCartOpen(true)}
        />

        <div className="px-4 lg:px-6 py-3 shrink-0 bg-card border-b border-border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex bg-muted/30 p-1 rounded-2xl w-full sm:w-auto">
             <button
               onClick={() => setView('POS')}
               className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm hover:cursor-pointer font-bold transition-all ${view === 'POS' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-primary'}`}
             >
               <ShoppingCart className="h-4 w-4" />
               Checkout
             </button>
             <button
               onClick={() => setView('ONLINE')}
               className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm hover:cursor-pointer font-bold transition-all ${view === 'ONLINE' ? 'bg-indigo-600 text-white shadow-md' : 'text-muted-foreground hover:text-indigo-600'}`}
             >
               <ShoppingBag className="h-4 w-4" />
               Online Orders
             </button>
          </div>

          {view === 'POS' && (
            <div className="relative flex-1 w-full max-w-sm sm:max-w-md md:max-w-xl lg:max-w-3xl xl:max-w-4xl transition-all duration-300">
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
          )}
        </div>

        <div className={`flex-1 overflow-y-auto ${view === 'POS' ? 'p-3 lg:p-5' : ''}`}>
          {view === 'POS' ? (
            <ProductGrid 
              products={filteredProducts}
              searchQuery={searchQuery}
              variant="pos"
              onAddToCart={handleAddToCart}
              isLoading={isLoadingProducts}
            />
          ) : (
            <OnlineOrdersList />
          )}
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

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Sale } from '@/lib/types';
import { getSales } from '@/lib/db';
import { Search, ShoppingBag, Banknote, CreditCard, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useSettingsStore } from '@/lib/store';

import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import { TrendingUp } from 'lucide-react';
import { CopyableId } from '@/components/ui/CopyableId';

const METHOD_ICON: Record<string, React.ElementType> = { CASH: Banknote, PAYSTACK: CreditCard, PAY_ON_DELIVERY: Banknote };
const METHOD_COLOR: Record<string, string> = { CASH: 'text-success', PAYSTACK: 'text-info', PAY_ON_DELIVERY: 'text-success' };

export default function SalesPage() {
  const { currencySymbol } = useSettingsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMethod, setFilterMethod] = useState('ALL');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const { data: sales, isLoading } = useRealtimeTable<Sale>({
    table: 'sales',
    initialData: [],
    fetcher: getSales,
    refetchOnChange: true,
    cacheKey: 'admin-sales'
  });

  const filtered = sales.filter(s => {
    const matchSearch = s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.paymentMethodId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.cashierId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchMethod = filterMethod === 'ALL' || s.paymentMethodId === filterMethod;
    return matchSearch && matchMethod;
  });

  const handleView = async (sale: Sale) => {
    setSelectedSale(sale);
  };

  const filteredRevenue = filtered.reduce((s, sale) => s + sale.finalAmount, 0);
  const filteredCount = filtered.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 tracking-tight">
            Sales Transactions
          </h1>
          <p className="text-sm text-muted-foreground font-medium">All recorded point-of-sale transactions</p>
        </div>
      </div>

      {/* Dynamic Summary Stats - Compact */}
      <div className="grid grid-cols-2 gap-4">
        {isLoading ? (
          [...Array(2)].map((_, i) => (
            <Card key={i} className="border-2 border-border/50 shadow-sm">
              <CardContent className="py-4 flex flex-col items-center justify-center space-y-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-3 w-16 opacity-50" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="border-2 border-primary/20 bg-primary/5 shadow-sm overflow-hidden group hover:border-primary/40 transition-all">
              <CardContent className="py-4 flex flex-col items-center justify-center relative">
                <div className="absolute right-2 top-2 text-primary opacity-5">
                   <Banknote className="h-10 w-10" />
                </div>
                <div className="text-xl md:text-2xl font-bold text-primary tracking-tighter tabular-nums drop-shadow-sm">
                  {currencySymbol}{filteredRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3 text-primary/60" />
                  {filterMethod === 'ALL' ? 'Total Revenue' : `${filterMethod.replace('_', ' ')}`}
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-info/20 bg-info/5 shadow-sm overflow-hidden group hover:border-info/40 transition-all">
              <CardContent className="py-4 flex flex-col items-center justify-center relative">
                <div className="absolute right-2 top-2 text-info opacity-5">
                   <ShoppingBag className="h-10 w-10" />
                </div>
                <div className="text-xl md:text-2xl font-bold text-info tracking-tighter tabular-nums drop-shadow-sm">
                  {filteredCount}
                </div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 flex items-center gap-1.5">
                  <ShoppingBag className="h-3 w-3 text-info/60" />
                  {filterMethod === 'ALL' ? 'Total Sales' : 'Count'}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card className="border-2 border-border/50 overflow-hidden">
        <CardHeader className="border-b border-border/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/60" />
              <Input 
                placeholder="Search by ID, method, cashier..." 
                className="pl-10 h-11 rounded-xl border-border bg-muted/20" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
              />
            </div>
            <div className='relative'>
              <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="px-4 h-11 w-full sm:w-[160px] text-sm rounded-xl border-border border bg-muted/20 text-foreground font-bold focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer hover:bg-muted/30 shadow-sm"
              >
                <option value="ALL">All Methods</option>
                <option value="PAYSTACK">Paystack</option>
                <option value="CASH">Cash</option>
              </select>
              <div className="absolute right-3.5 top-4 pointer-events-none text-muted-foreground/60">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 py-0">
          {isLoading ? (
            <div className="space-y-0.5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-6 px-6 py-5 border-b border-border last:border-0 bg-muted/5 animate-pulse">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-6 w-24 rounded-lg" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-8 rounded-xl ml-auto" />
                </div>
              ))}
            </div>
          ) : (
            <div className="max-h-[calc(100vh-240px)] overflow-x-auto">
              <table className="w-full text-sm text-left align-middle font-medium">
                <thead className="sticky top-0 bg-muted text-[10px] uppercase font-bold text-muted-foreground/70 border-b border-border/50 z-20">
                  <tr>
                    <th className="px-6 py-4">Receipt ID</th>
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4">Items</th>
                    <th className="px-6 py-4">Method</th>
                    <th className="px-6 py-4">Adjustment</th>
                    <th className="px-6 py-4">Total</th>
                    <th className="px-6 py-4 text-center">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-12 text-center text-muted-foreground font-medium italic">No transactions detected.</td></tr>
                  ) : filtered.map(sale => {
                    const Icon = METHOD_ICON[sale.paymentMethodId] ?? ShoppingBag;
                    const color = METHOD_COLOR[sale.paymentMethodId] ?? '';
                    return (
                      <tr key={sale.id} className="hover:bg-primary/5 transition-all group">
                        <td className="p-5 flex flex-col gap-2 items-start">
                           <CopyableId id={sale.id} />
                           {sale.is_returned && (
                             <span className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-bold text-[10px]">
                               RETURNED
                             </span>
                           )}
                        </td>
                        <td className="p-5 text-muted-foreground/80 font-bold text-xs">{new Date(sale.timestamp).toLocaleString()}</td>
                        <td className="p-5">
                          <div className="flex justify-center">{sale.items.length}</div>
                        </td>
                        <td className="p-5">
                          <div className={`flex items-center gap-2 font-bold text-xs uppercase tracking-tight ${color}`}>
                            <Icon className="h-3.5 w-3.5" />
                            {sale.paymentMethodId?.replace('_', ' ')}
                          </div>
                        </td>
                        <td className="p-5">
                          {sale.discount > 0 ? (
                            <span className="text-success font-bold text-xs">-{currencySymbol}{sale.discount.toFixed(2)}</span>
                          ) : (
                            <span className="text-muted-foreground/60 font-medium italic text-[10px]">No discount</span>
                          )}
                        </td>
                        <td className="p-5 font-bold text-base text-foreground">
                          {currencySymbol}{sale.finalAmount.toFixed(2)}
                        </td>
                        <td className="p-5 text-center">
                          <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl bg-muted/50 text-primary hover:bg-primary/10" onClick={() => handleView(sale)}>
                            <Eye className="h-5 w-5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sale Detail Modal */}
      <Modal isOpen={!!selectedSale} onClose={() => setSelectedSale(null)} title={`Transaction #${selectedSale?.id.slice(-8)}`}>
        {selectedSale && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Date:</span> <span className="font-medium">{new Date(selectedSale.timestamp).toLocaleString()}</span></div>
              <div><span className="text-muted-foreground">Method:</span> <span className="font-medium">{selectedSale.paymentMethodId?.replace('_', ' ')}</span></div>
              <div><span className="text-muted-foreground mr-2">Cashier ID:</span> <CopyableId id={selectedSale.cashierId} className="scale-90 origin-left" /></div>
            </div>
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left">Item</th>
                    <th className="px-4 py-2 text-center">Qty</th>
                    <th className="px-4 py-2 text-right">Unit Price</th>
                    <th className="px-4 py-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {selectedSale.items.map(item => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">{item.productName}</td>
                      <td className="px-4 py-3 text-center">{item.quantity}</td>
                      <td className="px-4 py-3 text-right">{currencySymbol}{item.price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-medium">{currencySymbol}{item.subtotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-sm space-y-1.5 border-t border-border pt-3">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal:</span><span>{currencySymbol}{selectedSale.totalAmount.toFixed(2)}</span></div>
              {selectedSale.discount > 0 && <div className="flex justify-between text-success"><span>Discount:</span><span>-{currencySymbol}{selectedSale.discount.toFixed(2)}</span></div>}
              <div className="flex justify-between font-bold text-base border-t border-border pt-2 mt-2"><span>Total:</span><span>{currencySymbol}{selectedSale.finalAmount.toFixed(2)}</span></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

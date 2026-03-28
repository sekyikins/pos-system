'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Sale } from '@/lib/types';
import { getSales } from '@/lib/db';
import { Search, ShoppingBag, Banknote, CreditCard, Smartphone, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useSettingsStore } from '@/lib/store';

import { useRealtimeTable } from '@/hooks/useRealtimeTable';

const METHOD_ICON = { CASH: Banknote, CARD: CreditCard, MOBILE_MONEY: Smartphone };
const METHOD_COLOR = { CASH: 'text-success', CARD: 'text-info', MOBILE_MONEY: 'text-warning' };

export default function SalesPage() {
  const { currencySymbol } = useSettingsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const { data: sales, isLoading } = useRealtimeTable<Sale>({
    table: 'sales',
    initialData: [],
    fetcher: getSales,
    refetchOnChange: true
  });

  const filtered = sales.filter(s =>
    s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.cashierId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleView = async (sale: Sale) => {
    setSelectedSale(sale);
  };

  const totalRevenue = sales.reduce((s, sale) => s + sale.finalAmount, 0);
  const cashSales = sales.filter(s => s.paymentMethod === 'CASH').length;
  const cardSales = sales.filter(s => s.paymentMethod === 'CARD').length;
  const mobileSales = sales.filter(s => s.paymentMethod === 'MOBILE_MONEY').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 tracking-tight">
            <ShoppingBag className="h-8 w-8 text-primary" />
            Sales Transactions
          </h1>
          <p className="text-sm text-muted-foreground font-medium">All recorded point-of-sale transactions</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `${currencySymbol}${totalRevenue.toFixed(2)}`, color: 'text-success' },
          { label: 'Cash', value: cashSales, color: 'text-success' },
          { label: 'Card', value: cardSales, color: 'text-info' },
          { label: 'Mobile Money', value: mobileSales, color: 'text-warning' },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="pt-5">
              <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
              <p className="text-xs font-bold text-muted-foreground mt-1">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-2 border-border/50 overflow-hidden">
        <CardHeader className="pb-0 border-b border-border/50">
          <div className="flex items-center gap-2 pb-6">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/60" />
              <Input 
                placeholder="Search by ID, method, cashier..." 
                className="pl-10 h-11 rounded-xl border-border bg-muted/20" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left align-middle font-medium">
                <thead className="bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground/70 border-b border-border/50">
                  <tr>
                    <th className="px-6 py-4">Receipt ID</th>
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4">Items</th>
                    <th className="px-6 py-4">Method</th>
                    <th className="px-6 py-4">Adjustment</th>
                    <th className="px-6 py-4">Total</th>
                    <th className="px-6 py-4 text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-12 text-center text-muted-foreground font-medium italic">No transactions detected.</td></tr>
                  ) : filtered.map(sale => {
                    const Icon = METHOD_ICON[sale.paymentMethod] ?? ShoppingBag;
                    const color = METHOD_COLOR[sale.paymentMethod] ?? '';
                    return (
                      <tr key={sale.id} className="hover:bg-primary/5 transition-all group">
                        <td className="p-5">
                           <span className="font-mono text-[14px] font-bold bg-muted/50 px-2 py-0.5 rounded tracking-tighter">
                             #{sale.id.slice(-8).toUpperCase()}
                           </span>
                        </td>
                        <td className="p-5 text-muted-foreground/80 font-bold text-xs">{new Date(sale.timestamp).toLocaleString()}</td>
                        <td className="p-5">
                          <div className="flex justify-center">{sale.items.length}</div>
                        </td>
                        <td className="p-5">
                          <div className={`flex items-center gap-2 font-bold text-xs uppercase tracking-tight ${color}`}>
                            <Icon className="h-3.5 w-3.5" />
                            {sale.paymentMethod.replace('_', ' ')}
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
                        <td className="p-5 text-right">
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
              <div><span className="text-muted-foreground">Method:</span> <span className="font-medium">{selectedSale.paymentMethod.replace('_', ' ')}</span></div>
              <div><span className="text-muted-foreground">Cashier ID:</span> <span className="font-mono text-xs">{selectedSale.cashierId.slice(-8)}</span></div>
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

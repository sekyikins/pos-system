'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Sale } from '@/lib/types';
import { getSales } from '@/lib/db';
import { Search, ShoppingBag, Banknote, CreditCard, Smartphone, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useSettingsStore } from '@/lib/store';

const METHOD_ICON = { CASH: Banknote, CARD: CreditCard, MOBILE_MONEY: Smartphone };
const METHOD_COLOR = { CASH: 'text-success', CARD: 'text-info', MOBILE_MONEY: 'text-warning' };

export default function SalesPage() {
  const { currencySymbol } = useSettingsStore();
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  useEffect(() => {
    getSales()
      .then(setSales)
      .finally(() => setIsLoading(false));
  }, []);

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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sales Transactions</h1>
        <p className="text-sm text-muted-foreground">All recorded point-of-sale transactions</p>
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
              <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/60" />
              <Input placeholder="Search by ID, method, cashier..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-1">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-border last:border-0 bg-muted/5 animate-pulse">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-5 w-24 rounded-lg" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-8 rounded-md ml-auto" />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/90 text-xs uppercase font-semibold text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-6 py-3">Receipt ID</th>
                    <th className="px-6 py-3">Date & Time</th>
                    <th className="px-6 py-3">Items</th>
                    <th className="px-6 py-3">Payment</th>
                    <th className="px-6 py-3">Discount</th>
                    <th className="px-6 py-3">Total</th>
                    <th className="px-6 py-3 text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">No transactions found.</td></tr>
                  ) : filtered.map(sale => {
                    const Icon = METHOD_ICON[sale.paymentMethod] ?? ShoppingBag;
                    const color = METHOD_COLOR[sale.paymentMethod] ?? '';
                    return (
                      <tr key={sale.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs">#{sale.id.slice(-8)}</td>
                        <td className="px-6 py-4 text-muted-foreground">{new Date(sale.timestamp).toLocaleString()}</td>
                        <td className="px-6 py-4">{sale.items.length}</td>
                        <td className="px-6 py-4">
                          <div className={`flex items-center gap-1.5 font-medium ${color}`}>
                            <Icon className="h-4 w-4" />
                            {sale.paymentMethod.replace('_', ' ')}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {sale.discount > 0 ? <span className="text-success">-{currencySymbol}{sale.discount.toFixed(2)}</span> : <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-6 py-4 font-bold">{currencySymbol}{sale.finalAmount.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="md" className="h-8 w-8 p-0" onClick={() => handleView(sale)}>
                            <Eye className="h-4 w-4 text-primary" />
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

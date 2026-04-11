'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Product, InventoryLog, Supplier } from '@/lib/types';
import { getProducts, getInventoryLogs, adjustInventory, getSuppliers } from '@/lib/db';
import { useToastStore } from '@/lib/store';
import { Search, History, ArrowUpCircle, ArrowDownCircle, AlertCircle, Plus, Loader2, Truck, User } from 'lucide-react';
import { useAuth } from '@/lib/auth';

import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import { LiveStatus } from '@/components/ui/LiveStatus';

export default function InventoryPage() {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<'name' | 'stock' | 'adjusted'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState<'RESTOCK' | 'ADJUSTMENT' | 'PURCHASE_ORDER'>('RESTOCK');
  const [isSaving, setIsSaving] = useState(false);
  const { addToast } = useToastStore();

  useEffect(() => {
    getSuppliers().then(setSuppliers).catch(console.error);
  }, []);

  const { data: products, isLoading: productsLoading, connectionStatus: productsStatus, refetch: refetchProducts } = useRealtimeTable<Product>({
    table: 'products',
    initialData: [],
    fetcher: getProducts,
    refetchOnChange: true
  });

  const { data: logs, isLoading: logsLoading, connectionStatus: logsStatus, refetch: refetchLogs } = useRealtimeTable<InventoryLog>({
    table: 'inventory',
    initialData: [],
    fetcher: getInventoryLogs,
    refetchOnChange: true
  });

  const connectionStatus = productsStatus === 'connected' && logsStatus === 'connected' ? 'connected' : 
                          productsStatus === 'error' || logsStatus === 'error' ? 'error' : 'connecting';

  const isLoading = productsLoading || logsLoading;

  const processedProducts = useMemo(() => {
    const filtered = products.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode.includes(searchQuery)
    );

    const lastAdjusted = new Map<string, number>();
    logs.forEach(log => {
      const time = new Date(log.timestamp).getTime();
      if (!lastAdjusted.has(log.productId) || lastAdjusted.get(log.productId)! < time) {
        lastAdjusted.set(log.productId, time);
      }
    });

    return [...filtered].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';
      
      if (sortKey === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (sortKey === 'stock') {
        valA = a.quantity;
        valB = b.quantity;
      } else if (sortKey === 'adjusted') {
        valA = lastAdjusted.get(a.id) || 0;
        valB = lastAdjusted.get(b.id) || 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [products, searchQuery, logs, sortKey, sortOrder]);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    const amount = parseInt(adjustAmount);
    if (isNaN(amount) || amount === 0) { addToast('Enter a valid non-zero amount', 'error'); return; }
    setIsSaving(true);
    try {
      const supplierId = (adjustReason === 'RESTOCK' || adjustReason === 'PURCHASE_ORDER') ? (selectedSupplierId || undefined) : undefined;
      const staffId = user?.id;

      await adjustInventory(adjustingProduct.id, amount, adjustReason, supplierId, staffId);
      addToast(`Stock adjusted by ${amount > 0 ? '+' : ''}${amount}`, 'success');
      setAdjustingProduct(null);
      setAdjustAmount('');
      setSelectedSupplierId('');
      refetchProducts();
      refetchLogs();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to adjust', 'error');
    } finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-4 w-64 opacity-50" />
          </div>
        ) : (
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inventory Control</h1>
            <p className="text-sm text-muted-foreground">Monitor stock levels and view change history</p>
          </div>
        )}
        <LiveStatus status={connectionStatus} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Inventory List */}
        <Card className="lg:col-span-2 h-[calc(100vh-13rem)] overflow-hidden flex flex-col">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <CardTitle>Current Stock</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-[200px]">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/50" />
                  <Input placeholder="Search items..." className="pl-9 h-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <div className="relative w-full sm:w-auto shrink-0">
                  <select
                    value={`${sortKey}-${sortOrder}`}
                    onChange={(e) => {
                      const [newKey, newOrder] = e.target.value.split('-');
                      setSortKey(newKey as 'name' | 'stock' | 'adjusted');
                      setSortOrder(newOrder as 'asc' | 'desc');
                    }}
                    className="px-3 pr-8 h-9 w-full sm:w-[160px] text-xs rounded-lg border-border border bg-muted/20 text-foreground font-bold focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer hover:bg-muted/30 shadow-sm"
                  >
                    <option value="name-asc">Name (A-Z)</option>
                    <option value="name-desc">Name (Z-A)</option>
                    <option value="stock-desc">Highest Stock</option>
                    <option value="stock-asc">Lowest Stock</option>
                    <option value="adjusted-desc">Recently Adjusted</option>
                    <option value="adjusted-asc">Oldest Adjusted</option>
                  </select>
                  <div className="absolute right-2.5 top-2.5 pointer-events-none text-muted-foreground/60">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className='overflow-y-auto'>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg border-border bg-muted/5">
                    <div className="flex-1 space-y-2">
                       <Skeleton className="h-5 w-1/3" />
                       <Skeleton className="h-4 w-1/4" />
                    </div>
                    <div className="flex items-center gap-4">
                       <Skeleton className="h-10 w-12" />
                       <Skeleton className="h-9 w-24 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {processedProducts.map((product: Product) => (
                  <div key={product.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg border-border bg-muted/20">
                    <div className="flex-1 flex flex-col gap-1 mb-3 sm:mb-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{product.name}</span>
                        {product.quantity === 0 ? (
                          <Badge variant="destructive" className="flex items-center gap-1 px-1.5 text-[10px]"><AlertCircle className="w-3 h-3" />Out of Stock</Badge>
                        ) : product.quantity <= 10 ? (
                          <Badge variant="destructive" className="flex items-center gap-1 px-1.5 text-[10px]"><AlertCircle className="w-3 h-3" />Low Stock</Badge>
                        ) : null}
                      </div>
                      <span className="text-xs text-muted-foreground">Barcode: {product.barcode} · {product.category}</span>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 sm:w-[240px]">
                      <div className="text-center">
                        <span className="block text-xl font-bold">{product.quantity}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">In Stock</span>
                      </div>
                      <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => { setAdjustingProduct(product); setAdjustAmount(''); setAdjustReason('RESTOCK'); }}>
                        <Plus className="h-3.5 w-3.5" /> Adjust
                      </Button>
                    </div>
                  </div>
                ))}
                {processedProducts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">No products found in inventory.</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Log */}
        <Card className='h-[calc(100vh-13rem)] flex flex-col'>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Recent Activity</CardTitle>
            <CardDescription>Latest stock changes</CardDescription>
          </CardHeader>
          <CardContent className='overflow-y-auto'>
            {isLoading ? (
              <div className="space-y-4">
                 {[...Array(8)].map((_, i) => (
                   <div key={i} className="flex items-start gap-4 pb-4 border-b last:border-0 border-border">
                     <Skeleton className="h-8 w-8 rounded-full" />
                     <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-1/2" />
                     </div>
                   </div>
                 ))}
              </div>
            ) : (
              <div className="space-y-4">
                {logs.slice(0, 12).map(log => {
                  const isPositive = log.change > 0;
                  const product = products.find(p => p.id === log.productId);
                  return (
                    <div key={log.id} className="flex items-start gap-2 pb-4 border-b last:border-0 border-border">
                      <div className={`mt-0.5 rounded-full p-1.5 ${isPositive ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                        {isPositive ? <ArrowUpCircle className="h-4 w-4" /> : <ArrowDownCircle className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-semibold leading-none">
                          <span className={`${isPositive ? 'text-success' : 'text-warning'}`}>{isPositive ? '+' : ''}{log.change}</span> {product?.name || 'Unknown Item'}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground font-medium">
                          <span className="flex items-center gap-1"><History className="h-2.5 w-2.5" />{new Date(log.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })}</span>
                          <span>·</span>
                          <Badge variant="outline" className={`text-[8px] py-0 px-1 border-border/50 uppercase font-black ${
                            log.reason === 'RESTOCK' ? 'bg-primary/5 text-primary' : 
                            log.reason === 'PURCHASE_ORDER' ? 'bg-indigo-500/10 text-indigo-500' : ''
                          }`}>{log.reason}</Badge>
                          
                          {(log.staffName || log.supplierName) && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                {(log.reason === 'RESTOCK' || log.reason === 'PURCHASE_ORDER') && log.supplierName ? (
                                  <><Truck className="h-2.5 w-2.5 text-primary" /> {log.supplierName}</>
                                ) : (
                                  <><User className="h-2.5 w-2.5 text-info" /> {log.staffName || 'System'}</>
                                )}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {logs.length === 0 && <p className="text-sm text-center text-muted-foreground py-4">No recent activity.</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Adjust Stock Modal */}
      <Modal isOpen={!!adjustingProduct} onClose={() => setAdjustingProduct(null)} title={`Adjust Stock: ${adjustingProduct?.name}`}>
        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          <div className="p-3 bg-muted/30 rounded-xl text-sm flex justify-between">
            <span className="text-muted-foreground">Current Stock:</span>
            <span className="font-bold">{adjustingProduct?.quantity} units</span>
          </div>
          <Input
            label="Adjustment Amount (positive = add, negative = remove)"
            type="number"
            placeholder="e.g. 20 or -5"
            value={adjustAmount}
            onChange={(e) => setAdjustAmount(e.target.value)}
            required
          />
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              Reason for Adjustment
            </label>
            <select
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value as 'RESTOCK' | 'ADJUSTMENT')}
              className="w-full h-11 px-3 text-sm font-bold rounded-xl border-2 border-border bg-background focus:outline-none focus:border-primary transition-all"
            >
              <option value="RESTOCK">Restock / New Delivery</option>
              <option value="ADJUSTMENT">Manual Adjustment</option>
            </select>
          </div>

          {adjustReason === 'RESTOCK' ? (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" /> Donor Supplier
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full h-11 px-3 text-sm font-bold rounded-xl border-2 border-border bg-background focus:outline-none focus:border-primary transition-all"
                required
              >
                <option value="">Select a supplier...</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          ) : (
             <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div>
                   <p className="text-xs font-bold text-primary uppercase tracking-wider">Accountability</p>
                   <p className="text-sm font-bold text-foreground">Adjustment by: {user?.name || 'Anonymous'}</p>
                </div>
             </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button type="button" variant="outline" onClick={() => setAdjustingProduct(null)} disabled={isSaving} className="rounded-xl font-bold">Cancel</Button>
            <Button type="submit" disabled={isSaving} className="rounded-xl font-bold px-8 shadow-lg shadow-primary/20">
              {isSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : 'Apply Adjustment'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Sale, Product } from '@/lib/types';
import { getSales, getProducts } from '@/lib/db';
import { TrendingUp, Package, DollarSign, BarChart2, ArrowUp, Wifi, WifiOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRealtimeTable, ConnectionStatus } from '@/hooks/useRealtimeTable';
import { useSettingsStore } from '@/lib/store';

interface ProductStat { name: string; category: string; unitsSold: number; revenue: number; }
interface DailyStat { date: string; sales: number; revenue: number; }

function ConnBadge({ status }: { status: ConnectionStatus }) {
  if (status === 'connected') return <span className="flex items-center gap-1.5 text-[10px] font-bold text-success"><Wifi className="h-3 w-3" /> Live</span>;
  if (status === 'error' || status === 'disconnected') return <span className="flex items-center gap-1.5 text-[10px] font-bold text-destructive"><WifiOff className="h-3 w-3" /> Offline</span>;
  return <span className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground"><span className="h-2 w-2 rounded-full bg-primary animate-pulse" /> Syncing</span>;
}

export default function ReportsPage() {
  const { currencySymbol } = useSettingsStore();

  const { data: sales, isLoading: loadingSales, connectionStatus: salesStatus } = useRealtimeTable<Sale>({
    table: 'sales',
    initialData: [],
    fetcher: getSales,
    refetchOnChange: true
  });

  const { data: products, isLoading: loadingProducts, connectionStatus: productsStatus } = useRealtimeTable<Product>({
    table: 'products',
    initialData: [],
    fetcher: getProducts,
    refetchOnChange: true
  });

  const isLoading = loadingSales || loadingProducts;
  const connectionStatus: ConnectionStatus =
    salesStatus === 'connected' && productsStatus === 'connected' ? 'connected' :
    salesStatus === 'error' || productsStatus === 'error' ? 'error' : 'connecting';

  // ─── Compute stats (memoized) ────────────────────────────────────
  const totalRevenue = useMemo(() => sales.reduce((s, sale) => s + sale.finalAmount, 0), [sales]);
  const totalDiscount = useMemo(() => sales.reduce((s, sale) => s + sale.discount, 0), [sales]);
  const avgOrderValue = useMemo(() => sales.length > 0 ? totalRevenue / sales.length : 0, [sales, totalRevenue]);

  const paymentBreakdown = useMemo(() => {
    const breakdown: Record<string, { count: number; total: number }> = {};
    sales.forEach(sale => {
      if (!breakdown[sale.paymentMethod]) breakdown[sale.paymentMethod] = { count: 0, total: 0 };
      breakdown[sale.paymentMethod].count++;
      breakdown[sale.paymentMethod].total += sale.finalAmount;
    });
    return Object.values(breakdown).length > 0 ? breakdown : {};
  }, [sales]);

  const productStats = useMemo(() => {
    const map: Record<string, ProductStat> = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (!map[item.productId]) {
          const p = products.find(prod => prod.id === item.productId);
          map[item.productId] = { name: item.productName, category: p?.category ?? '—', unitsSold: 0, revenue: 0 };
        }
        map[item.productId].unitsSold += item.quantity;
        map[item.productId].revenue += item.subtotal;
      });
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [sales, products]);

  const { dailyStats, maxRevenue } = useMemo(() => {
    const dailyMap: Record<string, DailyStat> = {};
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dailyMap[key] = { date: key, sales: 0, revenue: 0 };
    }
    sales.forEach(sale => {
      const key = sale.timestamp.split('T')[0];
      if (dailyMap[key]) { dailyMap[key].sales++; dailyMap[key].revenue += sale.finalAmount; }
    });
    const stats = Object.values(dailyMap);
    return { dailyStats: stats, maxRevenue: Math.max(...stats.map(d => d.revenue), 1) };
  }, [sales]);

  const { categoryStats, maxCat } = useMemo(() => {
    const categoryMap: Record<string, number> = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const p = products.find(prod => prod.id === item.productId);
        const cat = p?.category ?? 'Other';
        categoryMap[cat] = (categoryMap[cat] ?? 0) + item.subtotal;
      });
    });
    const stats = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);
    return { categoryStats: stats, maxCat: Math.max(...stats.map(c => c[1]), 1) };
  }, [sales, products]);

  if (isLoading) return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64 mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}><CardContent className="pt-5 flex flex-col items-center"><Skeleton className="h-10 w-10 rounded-lg mb-3" /><Skeleton className="h-6 w-24 mb-2" /><Skeleton className="h-3 w-16" /></CardContent></Card>
        ))}
      </div>
      <Card className="h-[400px]">
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent className="flex items-end gap-2 px-6 h-[300px] pb-6">
          {[60, 45, 80, 55, 90, 40, 70, 85, 50, 65, 75, 55, 45, 95].map((h, i) => (
            <div key={i} className="flex-1 bg-muted animate-pulse rounded-t-sm" style={{ height: `${h}%` }} />
          ))}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports &amp; Analytics</h1>
          <p className="text-sm text-muted-foreground">Business performance overview</p>
        </div>
        <ConnBadge status={connectionStatus} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `${currencySymbol}${totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-success', bg: 'bg-success/10' },
          { label: 'Total Transactions', value: sales.length, icon: TrendingUp, color: 'text-info', bg: 'bg-info/10' },
          { label: 'Avg/Order', value: `${currencySymbol}${avgOrderValue.toFixed(2)}`, icon: BarChart2, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Discounts', value: `${currencySymbol}${totalDiscount.toFixed(2)}`, icon: ArrowUp, color: 'text-warning', bg: 'bg-warning/10' },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="pt-5 flex flex-col items-center sm:items-start">
              <div className={`p-2 rounded-lg mb-3 ${item.bg}`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <div className="text-xl sm:text-2xl font-bold">{item.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart2 className="h-5 w-5" />Daily Revenue — Last 14 Days</CardTitle>
          </CardHeader>
          <CardContent className="pb-10 overflow-y-auto">
            <div className="flex items-end gap-1.5 h-[300px]">
              {dailyStats.map(d => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="relative w-full flex justify-center">
                    <div title={`${currencySymbol}${d.revenue.toFixed(2)}`}
                      style={{ height: `${Math.max(4, (d.revenue / maxRevenue) * 240)}px` }}
                      className="w-full bg-primary/70 hover:bg-primary rounded-t-sm transition-all"
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground rotate-45 origin-left mt-1 whitespace-nowrap">
                    {new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className='max-h-[850px] overflow-y-hidden'>
          <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" />Top Products by Revenue</CardTitle></CardHeader>
          <CardContent className='max-h-[780px] overflow-y-auto'>
            <div className="space-y-3">
              {productStats.map((p, i) => (
                <div key={p.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs text-muted-foreground w-5 shrink-0 font-bold">#{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.category} · {p.unitsSold} units</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-success shrink-0">{currencySymbol}{p.revenue.toFixed(2)}</span>
                </div>
              ))}
              {productStats.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No data yet.</p>}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className='max-h-[600px] overflow-y-hidden'>
            <CardHeader><CardTitle>Revenue by Category</CardTitle></CardHeader>
            <CardContent className='max-h-[520px] overflow-y-auto'>
              <div className="space-y-3">
                {categoryStats.map(([cat, rev]) => (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{cat}</span>
                      <span className="text-muted-foreground">{currencySymbol}{rev.toFixed(2)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary/70 transition-all" style={{ width: `${(rev / maxCat) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Payment Method Breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(paymentBreakdown).map(([method, stat]) => (
                  <div key={method} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{method.replace('_', ' ')}</p>
                      <p className="text-xs text-muted-foreground">{stat.count} transactions</p>
                    </div>
                    <Badge variant="secondary">{currencySymbol}{stat.total.toFixed(2)}</Badge>
                  </div>
                ))}
                {Object.entries(paymentBreakdown).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No sales data.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

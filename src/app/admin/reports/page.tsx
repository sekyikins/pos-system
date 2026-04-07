'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Sale, Product, Promotion } from '@/lib/types';
import { getSales, getProducts } from '@/lib/db';
import { getStorefrontSales, getPromotions } from '@/lib/db_extended';
import { TrendingUp, Package, DollarSign, BarChart2, ArrowUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRealtimeTable, ConnectionStatus } from '@/hooks/useRealtimeTable';
import { LiveStatus } from '@/components/ui/LiveStatus';
import { useSettingsStore } from '@/lib/store';

interface ProductStat { name: string; category: string; unitsSold: number; revenue: number; }
interface DailyStat { date: string; sales: number; revenue: number; }

export default function ReportsPage() {
  const { currencySymbol } = useSettingsStore();
  const [reportSource, setReportSource] = React.useState<'IN-STORE' | 'STOREFRONT'>('IN-STORE');
  const [statusFilter, setStatusFilter] = React.useState<string>('DELIVERED');
  const [paymentFilter, setPaymentFilter] = React.useState<string>('ALL');

  const { data: posSales, isLoading: loadingSales, connectionStatus: salesStatus } = useRealtimeTable<Sale>({
    table: 'sales',
    initialData: [],
    fetcher: getSales,
    refetchOnChange: true
  });

  const { data: onlineSales, isLoading: loadingOnline, connectionStatus: onlineStatus } = useRealtimeTable<Sale>({
    table: 'online_orders',
    initialData: [],
    fetcher: getStorefrontSales,
    refetchOnChange: true
  });

  const { data: products, isLoading: loadingProducts, connectionStatus: productsStatus } = useRealtimeTable<Product>({
    table: 'products',
    initialData: [],
    fetcher: getProducts,
    refetchOnChange: true
  });

  const { data: promotions, isLoading: loadingPromos, connectionStatus: promosStatus } = useRealtimeTable<Promotion>({
    table: 'promotions',
    initialData: [],
    fetcher: getPromotions,
    refetchOnChange: true
  });

  const sales = useMemo(() => {
    let data = reportSource === 'IN-STORE' ? posSales : onlineSales.filter(s => {
      const st = s.status || 'PENDING';
      return st === statusFilter;
    });

    if (paymentFilter !== 'ALL') {
      data = data.filter(s => s.paymentMethod === paymentFilter);
    }
    return data;
  }, [reportSource, posSales, onlineSales, statusFilter, paymentFilter]);

  const isLoading = loadingSales || loadingProducts || loadingOnline || loadingPromos;
  const connectionStatus: ConnectionStatus =
    salesStatus === 'connected' && productsStatus === 'connected' && onlineStatus === 'connected' && promosStatus === 'connected' ? 'connected' :
    salesStatus === 'error' || productsStatus === 'error' || onlineStatus === 'error' || promosStatus === 'error' ? 'error' : 'connecting';

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
    const dailyMap: Record<string, DailyStat & { isCurrentWeek: boolean }> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);
    
    // 1. Find earliest sale date to start the chart from
    let startDate = new Date();
    startDate.setDate(startDate.getDate() - 13); // Default 14 days if no sales
    
    if (sales.length > 0) {
      const earliestSale = sales.reduce((min, s) => {
        const d = new Date(s.timestamp);
        return d < min ? d : min;
      }, new Date());
      startDate = new Date(earliestSale);
      startDate.setHours(0, 0, 0, 0);
    }
    
    // 2. Initialize map from start date to today
    const runner = new Date(startDate);
    while (runner <= today) {
      const key = runner.toISOString().split('T')[0];
      dailyMap[key] = { 
        date: key, 
        sales: 0, 
        revenue: 0, 
        isCurrentWeek: runner >= weekAgo 
      };
      runner.setDate(runner.getDate() + 1);
    }

    // 3. Populate stats
    sales.forEach(sale => {
      const key = sale.timestamp.split('T')[0];
      if (dailyMap[key]) {
        dailyMap[key].sales++;
        dailyMap[key].revenue += Number(sale.finalAmount);
      }
    });

    const stats = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
    return { dailyStats: stats, maxRevenue: Math.max(...stats.map(d => d.revenue), 1) };
  }, [sales]);

  const promoStats = useMemo(() => {
    const stats: Record<string, { count: number; totalDiscount: number }> = {};
    
    // Create a code-to-name lookup for in-store sales
    const promoLookup: Record<string, string> = {};
    promotions.forEach(p => {
      promoLookup[p.code] = p.name;
    });

    sales.forEach(sale => {
      if (sale.promoCode && sale.promoCode !== 'null' && sale.promoCode.trim() !== '') {
        // For In-Store, promoCode is the CODE. For Storefront, it's already the NAME (mapped in db_extended)
        // If it looks like a name (exists in names list) or we can't find the code, keep it.
        const displayName = reportSource === 'IN-STORE' 
          ? (promoLookup[sale.promoCode] || sale.promoCode)
          : sale.promoCode;

        if (!stats[displayName]) stats[displayName] = { count: 0, totalDiscount: 0 };
        stats[displayName].count++;
        stats[displayName].totalDiscount += sale.discount;
      }
    });
    return Object.entries(stats).sort((a, b) => b[1].totalDiscount - a[1].totalDiscount);
  }, [sales, promotions, reportSource]);

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


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-4 w-64 opacity-50" />
          </div>
        ) : (
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports &amp; Analytics</h1>
            <p className="text-sm text-muted-foreground">Business performance overview</p>
          </div>
        )}
        <div className="flex justify-end items-center gap-4 flex-wrap">
          <LiveStatus status={connectionStatus} />
          <div className="flex gap-2 ml-4">
            {reportSource === 'STOREFRONT' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-11 px-4 text-sm font-bold rounded-xl border border-border bg-card text-foreground hover:bg-muted/50 transition-all appearance-none cursor-pointer focus:outline-none focus:border-primary shadow-sm"
              >
                <option value="DELIVERED">Delivered</option>
                <option value="SHIPPED">Shipped</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PENDING">Pending</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            )}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="h-11 px-4 text-sm font-bold rounded-xl border border-border bg-card text-foreground hover:bg-muted/50 transition-all appearance-none cursor-pointer focus:outline-none focus:border-primary shadow-sm"
            >
              <option value="ALL">All Methods</option>
              <option value="CARD">Card</option>
              <option value="CASH">Cash & Delivery</option>
              <option value="MOBILE_MONEY">Mobile Money</option>
            </select>
            <select
              value={reportSource}
              onChange={(e) => {
                 setReportSource(e.target.value as 'IN-STORE' | 'STOREFRONT');
              }}
              className="h-11 px-4 text-sm font-bold rounded-xl border border-border bg-muted/20 text-foreground hover:bg-muted/30 transition-all appearance-none cursor-pointer shadow-sm focus:outline-none focus:border-primary"
            >
              <option value="IN-STORE">In-Store Analysis</option>
              <option value="STOREFRONT">Storefront Analysis</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-5 flex flex-col items-center sm:items-start space-y-2">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-7 w-24" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          [
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
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5" />
              Daily Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-10 overflow-x-auto no-scrollbar">
            {isLoading ? (
              <div className="flex items-end gap-1.5 h-[300px]">
                {[55, 30, 45, 60, 25, 80, 50, 65, 35, 75, 40, 20, 90, 55].map((h, i) => (
                  <div key={i} className="flex-1 bg-muted animate-pulse rounded-t-sm" style={{ height: `${h}%` }} />
                ))}
              </div>
            ) : (
              <div className="flex items-end gap-1.5 h-[300px] min-w-max pb-8">
                {dailyStats.map(d => (
                  <div key={d.date} className="w-12 flex flex-col items-center gap-1 group">
                    <div className="relative w-full flex justify-center px-1">
                      <div title={`${d.date}: ${currencySymbol}${d.revenue.toFixed(2)}`}
                        style={{ height: `${Math.max(4, (d.revenue / maxRevenue) * 240)}px` }}
                        className={`w-full rounded-t-lg transition-all duration-300 ${d.isCurrentWeek ? 'bg-primary shadow-[0_0_15px_-3px_rgba(var(--primary),0.4)]' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'}`}
                      />
                    </div>
                    <span className={`text-[10px] font-bold rotate-45 origin-left mt-2 whitespace-nowrap transition-colors ${d.isCurrentWeek ? 'text-primary' : 'text-muted-foreground/60'}`}>
                      {new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Other sections handle loading internally or can be simplified too */}
        <Card className='max-h-[850px] overflow-y-hidden'>
          <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" />Top Products by Revenue</CardTitle></CardHeader>
          <CardContent className='max-h-[780px] overflow-y-auto'>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {productStats.map((p, i) => (
                  <div key={p.name} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs text-muted-foreground w-5 shrink-0 font-bold">#{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.category} &#183; {p.unitsSold} units</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-success shrink-0">{currencySymbol}{p.revenue.toFixed(2)}</span>
                  </div>
                ))}
                {productStats.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No data yet.</p>}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className='max-h-[600px] overflow-y-hidden'>
            <CardHeader><CardTitle>Revenue by Category</CardTitle></CardHeader>
            <CardContent className='max-h-[520px] overflow-y-auto'>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => <div key={i} className="space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-2 w-full rounded-full" /></div>)}
                </div>
              ) : (
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
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader><CardTitle>Payment Method Breakdown</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                   {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
                </div>
              ) : (
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
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ArrowUp className="h-5 w-5"/>Promo Performance</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                   {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}
                </div>
              ) : (
                <div className="space-y-3 max-h-[250px] overflow-y-auto">
                  {promoStats.map(([name, stat]) => (
                    <div key={name} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                      <div>
                        <p className="text-sm font-bold tracking-tight">{name}</p>
                        <p className="text-xs text-muted-foreground">{stat.count} times applied</p>
                      </div>
                      <span className="text-sm font-bold text-warning">
                        -{currencySymbol}{stat.totalDiscount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {promoStats.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No promos used yet.</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

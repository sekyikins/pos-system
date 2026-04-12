'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Sale, Product } from '@/lib/types';
import { getSales, getProducts } from '@/lib/db';
import { getStorefrontSales } from '@/lib/db_extended';
import { TrendingUp, Package, DollarSign, BarChart2, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRealtimeTable, ConnectionStatus } from '@/hooks/useRealtimeTable';
import { LiveStatus } from '@/components/ui/LiveStatus';
import { useSettingsStore } from '@/lib/store';

interface ProductStat { name: string; category: string; unitsSold: number; revenue: number; }
interface DailyStat { date: string; sales: number; revenue: number; }

export default function ReportsPage() {
  const { currencySymbol, taxRate } = useSettingsStore();
  const [reportSource, setReportSource] = React.useState<'IN-STORE' | 'STOREFRONT'>('IN-STORE');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = React.useState<string>('ALL');
  const [sortBy, setSortBy] = React.useState<'revenue' | 'unitsSold'>('revenue');

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



  const sales = useMemo(() => {
    let data = reportSource === 'IN-STORE' ? posSales : onlineSales.filter(s => {
      const st = s.status || 'PENDING';
      if (statusFilter === 'ALL') return st !== 'CANCELLED';
      return st === statusFilter;
    });

    if (paymentFilter !== 'ALL') {
      data = data.filter(s => s.paymentMethodId === paymentFilter);
    }
    return data.filter(s => !s.is_returned);
  }, [reportSource, posSales, onlineSales, statusFilter, paymentFilter]);

  const isLoading = loadingSales || loadingProducts || loadingOnline;
  const connectionStatus: ConnectionStatus =
    salesStatus === 'connected' && productsStatus === 'connected' && onlineStatus === 'connected' ? 'connected' :
    salesStatus === 'error' || productsStatus === 'error' || onlineStatus === 'error' ? 'error' : 'connecting';

  // ─── Compute stats (memoized) ────────────────────────────────────
  const totalRevenue = useMemo(() => sales.reduce((s, sale) => s + sale.finalAmount, 0), [sales]);
  const totalDiscount = useMemo(() => sales.reduce((s, sale) => s + sale.discount, 0), [sales]);
  const totalProfit = useMemo(() => {
    return sales.reduce((sum, sale) => {
      const saleCost = sale.items.reduce((c, item) => {
        // Cost including tax incurred by the firm
        const effectiveCost = item.costPrice * (1 + (taxRate / 100));
        return c + (effectiveCost * item.quantity);
      }, 0);
      return sum + (sale.finalAmount - saleCost);
    }, 0);
  }, [sales, taxRate]);
  const grossMargin = useMemo(() => totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0, [totalRevenue, totalProfit]);
  const avgOrderValue = useMemo(() => sales.length > 0 ? totalRevenue / sales.length : 0, [sales, totalRevenue]);

  const paymentBreakdown = useMemo(() => {
    const breakdown: Record<string, { count: number; total: number }> = {};
    sales.forEach(sale => {
      const pm = sale.paymentMethodId || 'UNKNOWN';
      if (!breakdown[pm]) breakdown[pm] = { count: 0, total: 0 };
      breakdown[pm].count++;
      breakdown[pm].total += sale.finalAmount;
    });
    return Object.values(breakdown).length > 0 ? breakdown : {};
  }, [sales]);

  const productStats = useMemo(() => {
    const map: Record<string, ProductStat> = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (!map[item.productId]) {
          const p = products.find(prod => prod.id === item.productId);
          map[item.productId] = { name: item.productName || 'Unknown Product', category: p?.category ?? '—', unitsSold: 0, revenue: 0 };
        }
        map[item.productId].unitsSold += item.quantity;
        map[item.productId].revenue += item.subtotal;
      });
    });
    return Object.values(map).sort((a, b) => (b[sortBy] as number) - (a[sortBy] as number)).slice(0, 10);
  }, [sales, products, sortBy]);

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
    
    sales.forEach(sale => {
      if (sale.promoName) {
        const displayName = sale.promoName;
        if (!stats[displayName]) stats[displayName] = { count: 0, totalDiscount: 0 };
        stats[displayName].count++;
        stats[displayName].totalDiscount += sale.discount;
      }
    });
    return Object.entries(stats).sort((a, b) => b[1].totalDiscount - a[1].totalDiscount);
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

  const chartRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (chartRef.current && dailyStats.length > 0) {
      // Small timeout to ensure browser has rendered the content after loading state
      const timeout = setTimeout(() => {
        if (chartRef.current) {
          chartRef.current.scrollLeft = chartRef.current.scrollWidth;
        }
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [dailyStats, isLoading]);


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
                <option value="ALL">All Active</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            )}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="h-11 px-4 text-sm font-bold rounded-xl border border-border bg-card text-foreground hover:bg-muted/50 transition-all appearance-none cursor-pointer focus:outline-none focus:border-primary shadow-sm"
            >
              <option value="ALL">All Methods</option>
              <option value="PAYSTACK">Paystack</option>
              {reportSource === 'IN-STORE' ? (
                <option value="CASH">Cash</option>
              ) : (
                <option value="PAY_ON_DELIVERY">Pay On Delivery</option>
              )}
            </select>
            <select
              value={reportSource}
              onChange={(e) => {
                 setReportSource(e.target.value as 'IN-STORE' | 'STOREFRONT');
                 setPaymentFilter('ALL');
              }}
              className="h-11 px-4 text-sm font-bold rounded-xl border border-border bg-muted/20 text-foreground hover:bg-muted/30 transition-all appearance-none cursor-pointer shadow-sm focus:outline-none focus:border-primary"
            >
              <option value="IN-STORE">In-Store Analysis</option>
              <option value="STOREFRONT">Storefront Analysis</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
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
            { label: 'Net Profit', value: `${currencySymbol}${totalProfit.toFixed(2)}`, icon: TrendingUp, color: 'text-info', bg: 'bg-info/10' },
            { label: 'Gross Margin', value: `${grossMargin.toFixed(1)}%`, icon: BarChart2, color: 'text-primary', bg: 'bg-primary/10' },
            { label: 'Avg Order', value: `${currencySymbol}${avgOrderValue.toFixed(2)}`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { label: 'Discounts', value: `${currencySymbol}${totalDiscount.toFixed(2)}`, icon: ArrowUp, color: 'text-warning', bg: 'bg-warning/10' },
          ].map(item => (
            <Card key={item.label}>
              <CardHeader className='py-2'>
                <CardTitle className='flex items-center gap-2'>
                  <div className={`p-2 rounded-lg flex items-center ${item.bg}`}><item.icon className={`h-5 w-5 ${item.color}`} /></div>
                  <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
                </CardTitle>
              </CardHeader>
              <CardContent className="py-4 px-0 flex items-center sm:items-start">
                
                <div className="w-full text-center text-xl sm:text-2xl font-bold">{item.value}</div>
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
          <CardContent 
            ref={chartRef}
            className="pb-10 overflow-x-auto no-scrollbar scroll-smooth"
          >
            {isLoading ? (
              <div className="flex items-end gap-1.5 h-[300px]">
                {[55, 30, 45, 60, 25, 80, 50, 65, 35, 75, 40, 20, 90, 55].map((h, i) => (
                  <div key={i} className="flex-1 bg-muted animate-pulse rounded-t-sm" style={{ height: `${h}%` }} />
                ))}
              </div>
            ) : (
              <div className="flex items-end gap-1.5 h-[400px] min-w-max pb-8">
                {dailyStats.map(d => (
                  <div key={d.date} className="w-15 flex flex-col items-center gap-1 group">
                    <div className="relative w-full flex justify-center px-1">
                      <div title={`${d.date}: ${currencySymbol}${d.revenue.toFixed(2)}`}
                        style={{ height: `${Math.max(4, (d.revenue / maxRevenue) * 340)}px` }}
                        className={`w-full rounded-t-sm transition-all duration-300 ${d.isCurrentWeek ? 'bg-primary hover:bg-primary/80 shadow-[0_0_15px_-3px_rgba(var(--primary),0.4)]' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'}`}
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
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <div>Top Products by <span className='font-light'>{sortBy === 'revenue' ? 'Revenue' : 'Units Sold'}</span></div>
            </CardTitle>
            <Button
              variant="outline"
              onClick={() => setSortBy(prev => prev === 'revenue' ? 'unitsSold' : 'revenue')}
              className="h-8 px-2 rounded-lg border-2 hover:bg-muted/50"
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </CardHeader>
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
                        <p className="text-sm font-medium">{method.replace(/_/g, ' ')}</p>
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

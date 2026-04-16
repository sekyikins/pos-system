'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getSales, getProducts, getUsers } from '@/lib/db';
import { getStorefrontSales } from '@/lib/db_extended';
import { Sale, Product, StaffRecord, TransactionItem } from '@/lib/types';
import { DollarSign, Package, BarChart2, TrendingUp, AlertTriangle, Users, Monitor, Store, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import { useSettingsStore } from '@/lib/store';



export default function AdminDashboard() {
  const [cashierFilter, setCashierFilter] = useState<'ALL' | 'ONLINE' | 'INSTORE'>('INSTORE');
  const { currencySymbol, taxRate } = useSettingsStore();

  const { data: products, isLoading: loadingProducts } = useRealtimeTable<Product>({
    table: 'products',
    initialData: [],
    fetcher: getProducts,
    cacheKey: 'dash-products'
  });

  const { data: sales, isLoading: loadingSales } = useRealtimeTable<Sale>({
    table: 'sales',
    initialData: [],
    fetcher: getSales,
    cacheKey: 'dash-sales'
  });

  const { data: staff, isLoading: loadingStaff } = useRealtimeTable<StaffRecord>({
    table: 'pos_staff',
    initialData: [],
    fetcher: getUsers as unknown as () => Promise<StaffRecord[]>,
    cacheKey: 'dash-staff'
  });

  const { data: onlineOrders, isLoading: loadingOnline } = useRealtimeTable<Sale>({
    table: 'online_orders',
    initialData: [],
    fetcher: getStorefrontSales,
    cacheKey: 'dash-online'
  });


  const isLoading = loadingProducts || loadingSales || loadingStaff || loadingOnline;

  const stats = useMemo(() => {
    const activeOnlineOrders = onlineOrders.filter(o => o.status !== 'CANCELLED' && !o.is_returned);
    const activeSales = sales.filter(s => !s.is_returned);
    
    const posRevenue = activeSales.reduce((acc, s) => acc + s.finalAmount, 0);
    // Only delivered online orders count towards "Total Revenue"
    const deliveredOnline = activeOnlineOrders.filter(o => o.status === 'DELIVERED');
    const onlineRevenue = deliveredOnline.reduce((acc, o) => acc + o.finalAmount, 0);
    
    const lowStock = products.filter(p => p.quantity < 10);
    
    // Calculate Profit & Tax Incurred
    const calculateStats = (records: Sale[]) => {
      let profit = 0;
      let tax = 0;
      records.forEach(sale => {
        const saleCost = sale.items.reduce((acc: number, item: TransactionItem) => {
          const baseCost = (item.costPrice || 0) * item.quantity;
          const itemTax = baseCost * (taxRate / 100);
          tax += itemTax;
          return acc + (baseCost + itemTax);
        }, 0);
        profit += sale.finalAmount - saleCost;
      });
      return { profit, tax };
    };

    const posStats = calculateStats(activeSales);
    const onlineStats = calculateStats(deliveredOnline);

    return { 
      totalSales: sales.length + activeOnlineOrders.length, 
      totalRevenue: posRevenue + onlineRevenue, 
      totalProfit: posStats.profit + onlineStats.profit,
      totalTaxIncurred: posStats.tax + onlineStats.tax,
      totalProducts: products.length, 
      lowStock: lowStock.length 
    };
  }, [products, sales, onlineOrders, taxRate]);

  const recentSales = useMemo(() => {
    const instore = sales.filter(s => !s.is_returned).map(s => ({
      id: s.id,
      timestamp: s.timestamp,
      finalAmount: s.finalAmount,
      itemsCount: s.items.length,
      paymentMethodId: s.paymentMethodId,
      type: 'IN-STORE' as const
    }));
    
    const online = onlineOrders
      .filter(o => o.status !== 'CANCELLED' && !o.is_returned)
      .map(o => ({
        id: o.id,
        timestamp: o.timestamp,
        finalAmount: o.finalAmount,
        itemsCount: o.items.length,
        paymentMethodId: o.paymentMethodId,
        type: 'ONLINE' as const
      }));

    return [...instore, ...online].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [sales, onlineOrders]);
  
  const cashierStats = useMemo(() => {
    const stats: Record<string, { id: string, name: string, count: number, revenue: number }> = {};
    
    // Process POS Sales
    if (cashierFilter === 'ALL' || cashierFilter === 'INSTORE') {
      sales.filter(s => !s.is_returned).forEach(s => {
        if (!stats[s.cashierId]) stats[s.cashierId] = { id: s.cashierId, name: 'Unknown', count: 0, revenue: 0 };
        stats[s.cashierId].count++;
        stats[s.cashierId].revenue += s.finalAmount;
      });
    }

    // Process Online Orders
    if (cashierFilter === 'ALL' || cashierFilter === 'ONLINE') {
      onlineOrders.filter(o => !o.is_returned).forEach(o => {
        // Only count if it was processed by a staff member (not just 'ONLINE')
        if (o.cashierId && o.cashierId !== 'ONLINE' && (o.status === 'DELIVERED' || o.status === 'SHIPPED' || o.status === 'CONFIRMED')) {
          if (!stats[o.cashierId]) stats[o.cashierId] = { id: o.cashierId, name: 'Unknown', count: 0, revenue: 0 };
          stats[o.cashierId].count++;
          stats[o.cashierId].revenue += o.finalAmount;
        }
      });
    }

    // Resolve Names
    staff.forEach(user => {
      if (stats[user.id]) stats[user.id].name = user.name || user.username;
    });

    return Object.values(stats).sort((a, b) => b.revenue - a.revenue);
  }, [sales, onlineOrders, staff, cashierFilter]);

  if (isLoading) return (
    <div className="space-y-6">
      <div className="h-10 w-48 bg-muted animate-pulse rounded-lg mb-6" />
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
            <CardContent><Skeleton className="h-8 w-32 mb-2" /><Skeleton className="h-3 w-20" /></CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1].map(i => (
          <Card key={i}>
            <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
            <CardContent className="space-y-4">
              {[...Array(5)].map((_, j) => (
                <div key={j} className="flex justify-between items-center pb-3 border-b border-border/50">
                  <div className="space-y-2 flex-1"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-1/2" /></div>
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <Card className='overflow-hidden'>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currencySymbol}{stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Gross sales amount</p>
          </CardContent>
        </Card>

        <Card className='overflow-hidden'>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className={`h-4 w-4 ${stats.totalProfit >= 0 ? 'text-success' : 'text-destructive'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
              {currencySymbol}{stats.totalProfit.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              After {taxRate}% firm tax ({currencySymbol}{stats.totalTaxIncurred.toFixed(2)})
            </p>
          </CardContent>
        </Card>

        <Card className='overflow-hidden'>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <BarChart2 className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalSales < 1000 ? stats.totalSales : `${(stats.totalSales / 1000).toFixed(1)}k+`}
            </div>
            <p className="text-xs text-muted-foreground">Transactions processed</p>
          </CardContent>
        </Card>

        <Card className='overflow-hidden'>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">Active in inventory</p>
          </CardContent>
        </Card>

        <Card className='overflow-hidden'>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.lowStock}</div>
            <p className="text-xs text-muted-foreground">Items below threshold</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Sales */}
        <Card className='max-h-[60vh] overflow-y-hidden border-2 border-border/50'>
          <CardHeader className="border-b border-border/50 pb-4">
             <CardTitle className="flex items-center justify-between">
                <span>Unified Sales Feed</span>
                <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded-lg uppercase tracking-wider">{recentSales.length} Total</span>
             </CardTitle>
          </CardHeader>
          <CardContent className='max-h-[49vh] overflow-y-auto p-0'>
            {recentSales.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No sales recorded yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center gap-4 p-4 hover:bg-primary/5 transition-all group border-b border-border/40 last:border-0">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-110 ${
                      sale.type === 'ONLINE' 
                        ? 'bg-info/10 text-info border-info/20' 
                        : 'bg-success/10 text-success border-success/20'
                    }`}>
                      {sale.type === 'ONLINE' ? <Monitor className="h-5 w-5" /> : <Store className="h-5 w-5" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold truncate tracking-tight">#{sale.id.slice(-6).toUpperCase()}</p>
                        <Badge variant="outline" className={`text-[9px] font-bold px-1.5 py-0 h-4 border-transparent uppercase tracking-tighter ${
                          sale.type === 'ONLINE' ? 'bg-info/10 text-info' : 'bg-success/10 text-success'
                        }`}>
                          {sale.type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium mt-0.5">
                        <Clock className="h-3 w-3 opacity-50" />
                        <span>{new Date(sale.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</span>
                        {sale.type === 'IN-STORE' && (
                          <>
                            <span className="h-1 w-1 rounded-full bg-border" />
                            <span>{sale.itemsCount} {sale.itemsCount === 1 ? 'item' : 'items'}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                       <div className="font-bold text-base text-success tabular-nums">
                          +{currencySymbol}{sale.finalAmount.toFixed(2)}
                       </div>
                       <div className="bg-muted/30 px-2 py-0.5 rounded text-[9px] font-bold text-muted-foreground uppercase tracking-widest border border-border">
                          {sale.paymentMethodId?.replace('_', ' ')}
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cashier Performance */}
        <Card className='max-h-[460px] overflow-y-hidden'>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-primary flex items-center gap-2">
              <Users className="h-4 w-4" /> Cashier Performance
            </CardTitle>
            <div className="relative shrink-0">
              <select
                value={cashierFilter}
                onChange={(e) => setCashierFilter(e.target.value as 'ALL' | 'ONLINE' | 'INSTORE')}
                className="px-3 pr-8 h-8 text-xs rounded-lg border-border border bg-muted/20 text-foreground font-bold focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer shadow-sm"
              >
                <option value="ALL">All</option>
                <option value="INSTORE">In-Store</option>
                <option value="ONLINE">Online</option>
              </select>
              <div className="absolute right-2 top-2.5 pointer-events-none text-muted-foreground/60">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </CardHeader>
          <CardContent className='max-h-[400px] overflow-y-auto'>
            {cashierStats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No performance data yet.</p>
            ) : (
              <div className="space-y-4">
                {cashierStats.map((stat, i) => (
                  <div key={stat.id} className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0 gap-2">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{stat.name}</p>
                        <p className="text-xs text-muted-foreground">{stat.count} customers served</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-success sm:text-right">
                      {currencySymbol}{stat.revenue.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

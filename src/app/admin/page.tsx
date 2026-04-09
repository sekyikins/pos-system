'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getSales, getProducts, getUsers, getOnlineOrders } from '@/lib/db';
import { Sale, Product, StaffRecord, OnlineOrder } from '@/lib/types';
import { CircleDollarSign, Package, TrendingUp, AlertTriangle, Users, Monitor, Store, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRealtimeTable, ConnectionStatus } from '@/hooks/useRealtimeTable';
import { LiveStatus } from '@/components/ui/LiveStatus';
import { useSettingsStore } from '@/lib/store';

// Standardized LiveStatus used instead

export default function AdminDashboard() {
  const [cashierFilter, setCashierFilter] = useState<'ALL' | 'ONLINE' | 'INSTORE'>('INSTORE');
  const { currencySymbol } = useSettingsStore();

  const { data: products, isLoading: loadingProducts, connectionStatus: prodStatus } = useRealtimeTable<Product>({
    table: 'products',
    initialData: [],
    fetcher: getProducts,
  });

  const { data: sales, isLoading: loadingSales, connectionStatus: salesStatus } = useRealtimeTable<Sale>({
    table: 'sales',
    initialData: [],
    fetcher: getSales,
  });

  const { data: staff, isLoading: loadingStaff } = useRealtimeTable<StaffRecord>({
    table: 'pos_staff',
    initialData: [],
    fetcher: getUsers as unknown as () => Promise<StaffRecord[]>,
  });

  const { data: onlineOrders, isLoading: loadingOnline } = useRealtimeTable<OnlineOrder>({
    table: 'online_orders',
    initialData: [],
    fetcher: getOnlineOrders,
  });

  const isLoading = loadingProducts || loadingSales || loadingStaff || loadingOnline;
  const connectionStatus: ConnectionStatus = prodStatus === 'connected' && salesStatus === 'connected' ? 'connected' : prodStatus === 'error' || salesStatus === 'error' ? 'error' : 'connecting';

  const stats = useMemo(() => {
    const activeOnlineOrders = onlineOrders.filter(o => o.status !== 'CANCELLED');
    const posRevenue = sales.reduce((acc, s) => acc + s.finalAmount, 0);
    // Only delivered online orders count towards "Total Revenue"
    const deliveredOnline = activeOnlineOrders.filter(o => o.status === 'DELIVERED');
    const onlineRevenue = deliveredOnline.reduce((acc, o) => acc + o.totalAmount, 0);
    
    const lowStock = products.filter(p => p.quantity < 10);
    return { 
      totalSales: sales.length + activeOnlineOrders.length, 
      totalRevenue: posRevenue + onlineRevenue, 
      totalProducts: products.length, 
      lowStock: lowStock.length 
    };
  }, [products, sales, onlineOrders]);

  const recentSales = useMemo(() => {
    const instore = sales.map(s => ({
      id: s.id,
      timestamp: s.timestamp,
      finalAmount: s.finalAmount,
      itemsCount: s.items.length,
      paymentMethod: s.paymentMethod,
      type: 'IN-STORE' as const
    }));
    
    const online = onlineOrders
      .filter(o => o.status !== 'CANCELLED')
      .map(o => ({
        id: o.id,
        timestamp: o.createdAt,
        finalAmount: o.totalAmount,
        itemsCount: 0,
        paymentMethod: o.paymentMethod,
        type: 'ONLINE' as const
      }));

    return [...instore, ...online].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [sales, onlineOrders]);
  
  const cashierStats = useMemo(() => {
    const stats: Record<string, { id: string, name: string, count: number, revenue: number }> = {};
    
    // Process POS Sales
    if (cashierFilter === 'ALL' || cashierFilter === 'INSTORE') {
      sales.forEach(s => {
        if (!stats[s.cashierId]) stats[s.cashierId] = { id: s.cashierId, name: 'Unknown', count: 0, revenue: 0 };
        stats[s.cashierId].count++;
        stats[s.cashierId].revenue += s.finalAmount;
      });
    }

    // Process Online Orders
    if (cashierFilter === 'ALL' || cashierFilter === 'ONLINE') {
      onlineOrders.forEach(o => {
        if (o.processingStaffId && (o.status === 'DELIVERED' || o.status === 'SHIPPED' || o.status === 'CONFIRMED')) {
          if (!stats[o.processingStaffId]) stats[o.processingStaffId] = { id: o.processingStaffId, name: 'Unknown', count: 0, revenue: 0 };
          stats[o.processingStaffId].count++;
          stats[o.processingStaffId].revenue += o.totalAmount;
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
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
        <LiveStatus status={connectionStatus} />
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currencySymbol}{stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">In-store + Delivered Online</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalSales < 1000 ? stats.totalSales : `${(stats.totalSales / 1000).toFixed(1)}k+`}
            </div>
            <p className="text-xs text-muted-foreground">Transactions processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">Active in inventory</p>
          </CardContent>
        </Card>

        <Card>
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
                          {sale.paymentMethod.replace('_', ' ')}
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
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
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

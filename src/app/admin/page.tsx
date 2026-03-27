'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getSales, getProducts } from '@/lib/db';
import { Sale, Product } from '@/lib/types';
import { CircleDollarSign, Package, TrendingUp, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRealtimeTable, ConnectionStatus } from '@/hooks/useRealtimeTable';

function ConnectionDot({ status }: { status: ConnectionStatus }) {
  if (status === 'connected')    return <span className="flex items-center gap-1.5 text-[10px] font-black text-success"><Wifi className="h-3 w-3" /> Live</span>;
  if (status === 'error' || status === 'disconnected') return <span className="flex items-center gap-1.5 text-[10px] font-black text-destructive"><WifiOff className="h-3 w-3" /> Offline</span>;
  return <span className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground"><span className="h-2 w-2 rounded-full bg-primary animate-pulse" /> Syncing</span>;
}

export default function AdminDashboard() {
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

  const isLoading = loadingProducts || loadingSales;
  const connectionStatus: ConnectionStatus = prodStatus === 'connected' && salesStatus === 'connected' ? 'connected' : prodStatus === 'error' || salesStatus === 'error' ? 'error' : 'connecting';

  const stats = useMemo(() => {
    const revenue = sales.reduce((acc, s) => acc + s.finalAmount, 0);
    const lowStock = products.filter(p => p.quantity < 10);
    return { totalSales: sales.length, totalRevenue: revenue, totalProducts: products.length, lowStock: lowStock.length };
  }, [products, sales]);

  const recentSales = useMemo(() => [...sales].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 6), [sales]);
  const lowStockProducts = useMemo(() => products.filter(p => p.quantity < 10).slice(0, 6), [products]);

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
        <ConnectionDot status={connectionStatus} />
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">All time sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.totalSales}</div>
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
        <Card>
          <CardHeader><CardTitle>Recent Sales</CardTitle></CardHeader>
          <CardContent>
            {recentSales.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No sales recorded yet.</p>
            ) : (
              <div className="space-y-4">
                {recentSales.map((sale: Sale) => (
                  <div key={sale.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">Order #{sale.id.slice(-6)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sale.timestamp).toLocaleString()} · {sale.items.length} items · <span className="font-medium text-foreground">{sale.paymentMethod.replace('_', ' ')}</span>
                      </p>
                    </div>
                    <div className="font-bold text-success">+${sale.finalAmount.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock */}
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Low Stock Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">All products are well stocked.</p>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.map((p: Product) => (
                  <div key={p.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.category}</p>
                    </div>
                    <span className={`text-sm font-bold ${p.quantity === 0 ? 'text-destructive' : 'text-warning'}`}>
                      {p.quantity === 0 ? 'OUT OF STOCK' : `${p.quantity} left`}
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

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Sale, Product } from '@/lib/types';
import { getSales, getProducts } from '@/lib/db';
import { TrendingUp, Package, DollarSign, BarChart2, ArrowUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';

interface ProductStat {
  name: string;
  category: string;
  unitsSold: number;
  revenue: number;
}

interface DailyStat {
  date: string;
  sales: number;
  revenue: number;
}

export default function ReportsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    Promise.all([getSales(), getProducts()])
      .then(([s, p]) => { setSales(s); setProducts(p); })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64 mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}><CardContent className="pt-5 flex flex-col items-center"><Skeleton className="h-10 w-10 rounded-lg mb-3" /><Skeleton className="h-6 w-24 mb-2" /><Skeleton className="h-3 w-16" /></CardContent></Card>
        ))}
      </div>
      <Card className="h-64">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="flex items-end gap-2 px-6 h-40 pb-6">
          {[60, 45, 80, 55, 90, 40, 70, 85, 50, 65, 75, 55, 45, 95].map((h, i) => (
            <div key={i} className="flex-1 bg-muted animate-pulse rounded-t-sm" style={{ height: `${h}%` }} />
          ))}
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardHeader><Skeleton className="h-6 w-32" /></CardHeader><CardContent className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="flex justify-between"><Skeleton className="h-10 flex-1 mr-4" /><Skeleton className="h-6 w-16" /></div>)}</CardContent></Card>
        <Card><CardHeader><Skeleton className="h-6 w-32" /></CardHeader><CardContent className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-2 w-full" /></div>)}</CardContent></Card>
      </div>
    </div>
  );

  // ─── Compute stats ────────────────────────────────
  const totalRevenue = sales.reduce((s, sale) => s + sale.finalAmount, 0);
  const totalDiscount = sales.reduce((s, sale) => s + sale.discount, 0);
  const avgOrderValue = sales.length > 0 ? totalRevenue / sales.length : 0;

  // Payment method breakdown
  const paymentBreakdown: Record<string, { count: number; total: number }> = {};
  sales.forEach(sale => {
    if (!paymentBreakdown[sale.paymentMethod]) paymentBreakdown[sale.paymentMethod] = { count: 0, total: 0 };
    paymentBreakdown[sale.paymentMethod].count++;
    paymentBreakdown[sale.paymentMethod].total += sale.finalAmount;
  });

  // Product performance
  const productStatsMap: Record<string, ProductStat> = {};
  sales.forEach(sale => {
    sale.items.forEach(item => {
      if (!productStatsMap[item.productId]) {
        const p = products.find(prod => prod.id === item.productId);
        productStatsMap[item.productId] = { name: item.productName, category: p?.category ?? '—', unitsSold: 0, revenue: 0 };
      }
      productStatsMap[item.productId].unitsSold += item.quantity;
      productStatsMap[item.productId].revenue += item.subtotal;
    });
  });
  const productStats = Object.values(productStatsMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  // Daily sales (last 14 days)
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
    if (dailyMap[key]) {
      dailyMap[key].sales++;
      dailyMap[key].revenue += sale.finalAmount;
    }
  });
  const dailyStats = Object.values(dailyMap);
  const maxRevenue = Math.max(...dailyStats.map(d => d.revenue), 1);

  // Category breakdown
  const categoryMap: Record<string, number> = {};
  sales.forEach(sale => {
    sale.items.forEach(item => {
      const p = products.find(prod => prod.id === item.productId);
      const cat = p?.category ?? 'Other';
      categoryMap[cat] = (categoryMap[cat] ?? 0) + item.subtotal;
    });
  });
  const categoryStats = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(...categoryStats.map(c => c[1]), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-sm text-muted-foreground">Business performance overview and insights</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `$${totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-success', bg: 'bg-success/10' },
          { label: 'Total Transactions', value: sales.length, icon: TrendingUp, color: 'text-info', bg: 'bg-info/10' },
          { label: 'Avg. Order Value', value: `$${avgOrderValue.toFixed(2)}`, icon: BarChart2, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Total Discounts Given', value: `$${totalDiscount.toFixed(2)}`, icon: ArrowUp, color: 'text-warning', bg: 'bg-warning/10' },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="pt-5">
              <div className={`inline-flex p-2 rounded-lg mb-3 ${item.bg}`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 14-day revenue chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart2 className="h-5 w-5" />Daily Revenue — Last 14 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1.5 h-40">
              {dailyStats.map(d => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="relative w-full flex justify-center">
                    <div title={`$${d.revenue.toFixed(2)}`}
                      style={{ height: `${Math.max(4, (d.revenue / maxRevenue) * 120)}px` }}
                      className="w-full bg-primary/70 hover:bg-primary rounded-t-sm transition-all cursor-pointer"
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground rotate-45 origin-left mt-1">
                    {new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" />Top Products by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
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
                  <span className="text-sm font-bold text-success shrink-0">${p.revenue.toFixed(2)}</span>
                </div>
              ))}
              {productStats.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No data yet.</p>}
            </div>
          </CardContent>
        </Card>

        {/* Category & Payment Breakdown */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categoryStats.map(([cat, rev]) => (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{cat}</span>
                      <span className="text-muted-foreground">${rev.toFixed(2)}</span>
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
            <CardHeader>
              <CardTitle>Payment Method Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(paymentBreakdown).map(([method, stat]) => (
                  <div key={method} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{method.replace('_', ' ')}</p>
                      <p className="text-xs text-muted-foreground">{stat.count} transactions</p>
                    </div>
                    <Badge variant="secondary">${stat.total.toFixed(2)}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

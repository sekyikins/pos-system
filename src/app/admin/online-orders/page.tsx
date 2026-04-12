'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { OnlineOrder, DeliveryPoint } from '@/lib/types';
import { getOnlineOrders, updateOnlineOrderStatus, getDeliveryPoints } from '@/lib/db';
import { useToastStore } from '@/lib/store';
import { Search, ShoppingBag, Eye, TrendingUp, Truck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import { LiveStatus } from '@/components/ui/LiveStatus';
import { useSettingsStore } from '@/lib/store';

const STATUS_BADGE: Record<string, { label: string; class: string }> = {
  PENDING:   { label: 'Pending',   class: 'bg-warning/10 text-warning border-warning/20' },
  CONFIRMED: { label: 'Confirmed', class: 'bg-info/10 text-info border-info/20' },
  SHIPPED:   { label: 'Shipped',   class: 'bg-primary/10 text-primary border-primary/20' },
  DELIVERED: { label: 'Delivered', class: 'bg-success/10 text-success border-success/20' },
  CANCELLED: { label: 'Cancelled', class: 'bg-destructive/10 text-destructive border-destructive/20' },
};

export default function OnlineOrdersPage() {
  const [deliveryPoints, setDeliveryPoints] = useState<Record<string, DeliveryPoint>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const { addToast } = useToastStore();
  const { currencySymbol } = useSettingsStore();
  const [selectedOrder, setSelectedOrder] = useState<OnlineOrder | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: orders, isLoading, connectionStatus, refetch } = useRealtimeTable<OnlineOrder>({
    table: 'online_orders',
    initialData: [],
    fetcher: async () => {
      const [fetchedOrders, pts] = await Promise.all([getOnlineOrders(), getDeliveryPoints()]);
      const ptsMap: Record<string, DeliveryPoint> = {};
      pts.forEach(p => { ptsMap[p.id] = p; });
      setDeliveryPoints(ptsMap);
      return fetchedOrders;
    },
    refetchOnChange: true, // orders have joins + camelCase mapper
  });


  const filtered = useMemo(() =>
    orders.filter(o => {
      const matchSearch = o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          o.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          o.paymentMethodId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = filterStatus === 'ALL' || o.status === filterStatus;
      return matchSearch && matchStatus;
    }), [orders, searchQuery, filterStatus]);

  const revenueStats = useMemo(() => {
    const active = orders
      .filter(o => o.status !== 'CANCELLED')
      .reduce((acc, o) => acc + o.totalAmount, 0);
    const cancelled = orders
      .filter(o => o.status === 'CANCELLED')
      .reduce((acc, o) => acc + o.totalAmount, 0);
    return { active, cancelled };
  }, [orders]);

  const countStats = useMemo(() => {
    const active = orders.filter(o => o.status !== 'CANCELLED').length;
    const cancelled = orders.filter(o => o.status === 'CANCELLED').length;
    return { active, cancelled };
  }, [orders]);

  const filteredRevenue = filtered.reduce((acc, o) => acc + o.totalAmount, 0);
  const filteredCount = filtered.length;

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      await updateOnlineOrderStatus(orderId, newStatus);
      addToast(`Order status updated to ${newStatus}`, 'success');
      await refetch();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus as OnlineOrder['status'] } : null);
      }
    } catch {
      addToast('Failed to update status', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Online Orders</h1>
          <p className="text-sm text-muted-foreground">Manage E-commerce storefront orders</p>
        </div>
        <LiveStatus status={connectionStatus} />
      </div>

      {/* Dynamic Summary Stats - Compact */}
      <div className="grid grid-cols-2 gap-4">
        {isLoading ? (
          [...Array(2)].map((_, i) => (
            <Card key={i} className="border-2 border-border/50 shadow-sm">
              <CardContent className="py-4 flex flex-col items-center justify-center space-y-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-3 w-16 opacity-50" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className={`border-2 shadow-sm overflow-hidden group transition-all ${
              filterStatus === 'CANCELLED' ? 'border-destructive/20 bg-destructive/5 hover:border-destructive/40' : 'border-primary/20 bg-primary/5 hover:border-primary/40'
            }`}>
              <CardContent className="py-4 flex flex-col items-center justify-center relative">
                <div className={`absolute right-2 top-2 opacity-5 ${filterStatus === 'CANCELLED' ? 'text-destructive' : 'text-primary'}`}>
                   <ShoppingBag className="h-10 w-10" />
                </div>
                
                {filterStatus === 'ALL' ? (
                  <div className="flex flex-col items-center text-center">
                    <div className="text-xl md:text-2xl font-bold text-success tracking-tighter tabular-nums drop-shadow-sm">
                      {currencySymbol}{revenueStats.active.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] font-bold text-destructive tracking-tight">
                      +{currencySymbol}{revenueStats.cancelled.toLocaleString(undefined, { minimumFractionDigits: 2 })} Cancelled
                    </div>
                  </div>
                ) : (
                  <div className={`text-xl md:text-2xl font-bold tracking-tighter tabular-nums drop-shadow-sm ${
                    filterStatus === 'CANCELLED' ? 'text-destructive' : 'text-primary'
                  }`}>
                    {currencySymbol}{filteredRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                )}

                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 flex items-center gap-1.5">
                  <TrendingUp className={`h-3 w-3 ${filterStatus === 'CANCELLED' ? 'text-destructive/60' : 'text-primary/60'}`} />
                  {filterStatus === 'ALL' ? 'Cumulative Revenue' : `${filterStatus} Revenue`}
                </p>
              </CardContent>
            </Card>

            <Card className={`border-2 shadow-sm overflow-hidden group transition-all ${
              filterStatus === 'CANCELLED' ? 'border-destructive/20 bg-destructive/5 hover:border-destructive/40' : 'border-info/20 bg-info/5 hover:border-info/40'
            }`}>
              <CardContent className="py-4 flex flex-col items-center justify-center relative">
                <div className={`absolute right-2 top-2 opacity-5 ${filterStatus === 'CANCELLED' ? 'text-destructive' : 'text-info'}`}>
                   <Truck className="h-10 w-10" />
                </div>

                {filterStatus === 'ALL' ? (
                  <div className="flex flex-col items-center text-center">
                    <div className="text-xl md:text-2xl font-bold text-info tracking-tighter tabular-nums drop-shadow-sm">
                      {countStats.active}
                    </div>
                    <div className="text-[11px] font-bold text-destructive tracking-tight">
                      +{countStats.cancelled} Cancelled
                    </div>
                  </div>
                ) : (
                  <div className={`text-xl md:text-2xl font-bold tracking-tighter tabular-nums drop-shadow-sm ${
                    filterStatus === 'CANCELLED' ? 'text-destructive' : 'text-info'
                  }`}>
                    {filteredCount}
                  </div>
                )}

                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 flex items-center gap-1.5">
                  <ShoppingBag className={`h-3 w-3 ${filterStatus === 'CANCELLED' ? 'text-destructive/60' : 'text-info/60'}`} />
                  {filterStatus === 'ALL' ? 'Total Order Volume' : `${filterStatus} Count`}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/60" />
              <Input placeholder="Search by ID, Status, Route..." className="pl-9 h-11 rounded-xl" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 h-11 w-full sm:w-[160px] text-sm rounded-xl border-border border bg-card text-foreground font-bold focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer shadow-sm"
            >
              <option value="ALL">All Statuses</option>
              <option value="DELIVERED">Delivered</option>
              <option value="SHIPPED">Shipped</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PENDING">Pending</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-1">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-border last:border-0 bg-muted/5 animate-pulse">
                  <div className="flex items-center gap-2 flex-1"><Skeleton className="h-4 w-4 rounded-full" /><Skeleton className="h-4 w-20" /></div>
                  <Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-16" />
                  <Skeleton className="h-6 w-20 rounded-full" /><Skeleton className="h-8 w-12 rounded-md ml-auto" />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/90 text-xs uppercase font-semibold text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-6 py-3">Order ID</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Delivery Type</th>
                    <th className="px-6 py-3 text-center">Amount</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-center">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No orders found.</td></tr>
                  ) : filtered.map(o => {
                    const statusBadge = STATUS_BADGE[o.status] || { label: o.status, class: 'bg-muted text-muted-foreground' };
                    const isPickup = !!o.deliveryPointId;
                    return (
                      <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-5 font-mono text-xs gap-2">
                          <div className='flex justify-center gap-2'>
                            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                            {o.id.slice(-8).toUpperCase()}
                          </div>
                        </td>
                        <td className="p-5 text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</td>
                        <td className="p-5">
                          {isPickup
                            ? <span className="text-primary font-medium">Pickup ({deliveryPoints[o.deliveryPointId!]?.name || 'Unknown'})</span>
                            : <span className="text-info font-medium">Delivery</span>
                          }
                        </td>
                        <td className="p-5 font-bold text-success">
                          <div className=' flex justify-center'>{currencySymbol}{o.totalAmount.toFixed(2)}</div>
                        </td>
                        <td className="p-5">
                          <Badge variant="outline" className={statusBadge.class}>{statusBadge.label}</Badge>
                        </td>
                        <td className="p-5 text-center">
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedOrder(o); setIsViewOpen(true); }}>
                            <Eye className="h-4 w-4 mx-1" />
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

      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Order Details">
        {selectedOrder && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-muted-foreground">Order ID</p><p className="font-mono text-sm">{(selectedOrder.id.trim()).slice(-8).toUpperCase()}</p></div>
              <div><p className="text-xs text-muted-foreground">Date</p><p className="text-sm">{new Date(selectedOrder.createdAt).toLocaleString()}</p></div>
              <div><p className="text-xs text-muted-foreground">Payment Method</p><p className="text-sm font-medium">{selectedOrder.paymentMethodId.replace(/_/g, ' ')}</p></div>
              <div><p className="text-xs text-muted-foreground">Total Amount</p><p className="text-sm font-bold text-success">{currencySymbol}{selectedOrder.totalAmount.toFixed(2)}</p></div>
            </div>
            <div className="bg-muted/30 p-4 rounded-xl border border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Delivery Information</p>
              {selectedOrder.deliveryPointId ? (
                <div>
                  <p className="font-medium text-primary">Store Pickup - {deliveryPoints[selectedOrder.deliveryPointId]?.name}</p>
                  <p className="text-sm text-muted-foreground">{deliveryPoints[selectedOrder.deliveryPointId]?.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{deliveryPoints[selectedOrder.deliveryPointId]?.address}</p>
                </div>
              ) : (
                <div>
                  <p className="font-medium text-info">Home Delivery</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.deliveryAddress || 'Address not provided'}</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {(selectedOrder.status === 'DELIVERED' || selectedOrder.status === 'CANCELLED') ? (
                <div className={`flex items-center gap-3 p-3 rounded-xl border-2 ${
                  selectedOrder.status === 'DELIVERED'
                    ? 'bg-success/10 border-success/20 text-success'
                    : 'bg-destructive/10 border-destructive/20 text-destructive'
                }`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest">Order Finalised</p>
                    <p className="text-[11px] opacity-70 mt-0.5">This order is <span className="font-bold">{selectedOrder.status}</span> and cannot be updated further.</p>
                  </div>
                </div>
              ) : (
                <>
                  <label className="text-sm font-medium">Update Order Status</label>
                  <select value={selectedOrder.status} onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value)} disabled={isUpdating} className="w-full h-10 px-3 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="PENDING">Pending</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="SHIPPED">Shipped / Ready for Pickup</option>
                    <option value="DELIVERED">Delivered / Picked Up</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </>
              )}
            </div>
            <div className="flex justify-end pt-4 border-t border-border mt-6">
              <Button variant="outline" onClick={() => setIsViewOpen(false)}>Confirm</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

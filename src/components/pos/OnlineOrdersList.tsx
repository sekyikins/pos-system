'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { updateOnlineOrderStatus, startProcessingOnlineOrder, getUsers, getOnlineOrders } from '@/lib/db';
import { OnlineOrder, StaffRecord } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Loader2, ShoppingBag, Truck, CheckCircle, Package, Clock, XCircle, User, Wifi, WifiOff } from 'lucide-react';
import { useToastStore } from '@/lib/store';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/lib/auth';
import { useRealtimeTable, ConnectionStatus } from '@/hooks/useRealtimeTable';

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING:   { label: 'Pending',     color: 'bg-warning/10 text-warning border-warning/20',         icon: Clock },
  CONFIRMED: { label: 'Processing',  color: 'bg-info/10 text-info border-info/20',                  icon: Package },
  SHIPPED:   { label: 'In Transit',  color: 'bg-primary/10 text-primary border-primary/20',         icon: Truck },
  DELIVERED: { label: 'Delivered',   color: 'bg-success/10 text-success border-success/20',         icon: CheckCircle },
  CANCELLED: { label: 'Cancelled',   color: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
};

function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  if (status === 'connected') return (
    <span className="flex items-center gap-1.5 text-[10px] font-black text-success uppercase tracking-widest">
      <Wifi className="h-3.5 w-3.5" /> Live
    </span>
  );
  if (status === 'error' || status === 'disconnected') return (
    <span className="flex items-center gap-1.5 text-[10px] font-black text-destructive uppercase tracking-widest">
      <WifiOff className="h-3.5 w-3.5" /> Offline
    </span>
  );
  return (
    <span className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
      <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse" /> Syncing...
    </span>
  );
}

export function OnlineOrdersList() {
  const { addToast } = useToastStore();
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<'ACTIVE' | 'PROCESSING' | 'HISTORY'>('ACTIVE');

  // ── Realtime staff list ───────────────────────────────────────────
  const { data: staff } = useRealtimeTable<StaffRecord>({
    table: 'pos_staff',
    initialData: [],
    fetcher: getUsers,
  });

  // ── Realtime online orders ────────────────────────────────────────
  const { data: orders, isLoading, connectionStatus, refetch } = useRealtimeTable<OnlineOrder>({
    table: 'online_orders',
    initialData: [],
    fetcher: getOnlineOrders,
    // online_orders are fetched with joins and a camelCase mapper — refetch on any change
    refetchOnChange: true,
  });

  // ── Actions ───────────────────────────────────────────────────────
  const handleStartProcessing = useCallback(async (id: string) => {
    setIsUpdating(id);
    try {
      if (!user?.id) return;
      await startProcessingOnlineOrder(id, user.id);
      addToast(`Order ${id.slice(-6).toUpperCase()} picked up — processing started`, 'success');
      // Realtime will update the list automatically; no manual refetch needed
      setCurrentTab('PROCESSING');
    } catch {
      addToast('Failed to start processing', 'error');
    } finally {
      setIsUpdating(null);
    }
  }, [user, addToast]);

  const handleUpdateStatus = useCallback(async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'SHIPPED' ? 'DELIVERED' : 'SHIPPED';
    setIsUpdating(id);
    try {
      await updateOnlineOrderStatus(id, nextStatus, user?.id);
      addToast(`Order ${id.slice(-6).toUpperCase()} → ${nextStatus}`, 'success');
    } catch {
      addToast('Failed to update status', 'error');
    } finally {
      setIsUpdating(null);
    }
  }, [user, addToast]);

  // ── Derived lists ─────────────────────────────────────────────────
  const activeOrders = useMemo(
    () => orders.filter(o => o.status === 'PENDING' && !o.processingStaffId),
    [orders]
  );
  const processingOrders = useMemo(
    () => orders.filter(o => (o.status === 'CONFIRMED' || o.status === 'SHIPPED') && o.processingStaffId),
    [orders]
  );
  const historyOrders = useMemo(
    () => orders.filter(o =>
      (o.status === 'DELIVERED' || o.status === 'CANCELLED') &&
      (o.processedBy === user?.id || user?.role === 'ADMIN' || user?.role === 'MANAGER')
    ),
    [orders, user]
  );

  const displayOrders =
    currentTab === 'ACTIVE' ? activeOrders :
    currentTab === 'PROCESSING' ? processingOrders :
    historyOrders;

  const groupedHistory = useMemo(() => {
    if (currentTab !== 'HISTORY') return null;
    const groups: Record<string, OnlineOrder[]> = {};
    const todayStr = new Date().toDateString();
    [...displayOrders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .forEach(o => {
        const date = new Date(o.createdAt);
        let groupName = '';
        if (date.toDateString() === todayStr) {
          groupName = 'Today';
        } else {
          const now = new Date();
          const startOfThisWeek = new Date(now.setDate(now.getDate() - now.getDay()));
          startOfThisWeek.setHours(0, 0, 0, 0);
          if (date >= startOfThisWeek) {
            groupName = 'This Week';
          } else {
            const diffMs = startOfThisWeek.getTime() - date.getTime();
            const diffWeeks = Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 7));
            groupName = `${diffWeeks} Week${diffWeeks > 1 ? 's' : ''} Ago`;
          }
        }
        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push(o);
      });
    return groups;
  }, [displayOrders, currentTab]);

  if (isLoading) {
    return (
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="p-5 space-y-4 border-2 border-border/50">
            <div className="flex justify-between items-start">
              <div className="space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-5 w-24" /></div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-20 w-full rounded-2xl" />
            <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-8 w-full" /></div>
            <Skeleton className="h-11 w-full rounded-xl mt-4" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Tab Switcher + Connection Status */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex p-1 bg-muted/30 rounded-2xl w-full max-w-2xl">
          {(['ACTIVE', 'PROCESSING', 'HISTORY'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setCurrentTab(tab)}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 ${
                currentTab === tab
                  ? 'bg-primary text-primary-foreground shadow-lg scale-[1.02]'
                  : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              {tab === 'ACTIVE'     && <ShoppingBag className="h-4 w-4" />}
              {tab === 'PROCESSING' && <Package className="h-4 w-4" />}
              {tab === 'HISTORY'    && <Clock className="h-4 w-4" />}
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
              <Badge variant="secondary" className="ml-1 text-[10px] bg-background/20 text-inherit border-none">
                {tab === 'ACTIVE' ? activeOrders.length : tab === 'PROCESSING' ? processingOrders.length : historyOrders.length}
              </Badge>
            </button>
          ))}
        </div>
        <ConnectionBadge status={connectionStatus} />
      </div>

      {displayOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card rounded-[2.5rem] border border-dashed border-border text-center">
          <div className="h-24 w-24 rounded-full bg-muted/30 flex items-center justify-center mb-6">
            <ShoppingBag className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <h3 className="text-2xl font-black text-foreground mb-2">No {currentTab.toLowerCase()} orders</h3>
          <p className="text-muted-foreground mb-8">Everything looks quiet on this front.</p>
          <Button variant="outline" onClick={refetch}>Refresh Data</Button>
        </div>
      ) : groupedHistory ? (
        <div className="space-y-8">
          {Object.entries(groupedHistory).map(([group, grpOrders]) => (
            <div key={group} className="space-y-4">
              <h3 className="text-lg font-black text-foreground border-l-4 border-primary pl-3 ml-1">{group}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {grpOrders.map(order => (
                  <OrderCard key={order.id} order={order} staff={staff} currentUser={user} isUpdating={isUpdating} onStart={handleStartProcessing} onUpdate={handleUpdateStatus} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayOrders.map(order => (
            <OrderCard key={order.id} order={order} staff={staff} currentUser={user} isUpdating={isUpdating} onStart={handleStartProcessing} onUpdate={handleUpdateStatus} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, staff, currentUser, isUpdating, onStart, onUpdate }: any) {
  const meta = STATUS_MAP[order.status] || { label: order.status, color: 'bg-muted text-muted-foreground', icon: Package };
  const StatusIcon = meta.icon;
  const isBeingProcessedByMe = order.processingStaffId === currentUser?.id;
  const processingStaff = staff.find((s: StaffRecord) => s.id === order.processingStaffId);

  return (
    <Card className="overflow-hidden border-2 border-border/50 hover:border-primary/30 transition-all shadow-sm flex flex-col h-full bg-card">
      <div className="p-4 flex flex-col h-full">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs font-mono text-muted-foreground">#{order.id.slice(-8).toUpperCase()}</p>
            <p className="text-sm font-bold text-foreground">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <Badge variant="outline" className={`${meta.color} flex items-center gap-1 font-bold`}>
            <StatusIcon className="h-3 w-3" />
            {meta.label}
          </Badge>
        </div>

        <div className="space-y-4 flex-1">
          <div className="bg-muted/30 rounded-2xl p-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Amount</p>
            <p className="text-3xl font-black text-primary">${order.totalAmount.toFixed(2)}</p>
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
              <Badge variant="secondary" className="text-[10px] uppercase font-bold">{order.paymentMethod.replace(/_/g, ' ')}</Badge>
            </div>
          </div>

          <div className="px-1 space-y-2">
            <div className="flex items-start gap-2">
              <Truck className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold">Shipping Address</p>
                <p className="text-muted-foreground text-xs">{order.deliveryAddress || 'Store Pickup'}</p>
              </div>
            </div>
            {order.processingStaffId && (
              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                <User className="h-3.5 w-3.5 text-info" />
                <p className="text-xs font-medium">
                  {isBeingProcessedByMe
                    ? <span className="text-success">You are processing this order</span>
                    : <span className="text-info">Processing started by {processingStaff?.name || 'a colleague'}</span>
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 mt-4 border-t border-border">
          {order.status === 'PENDING' && (
            <Button fullWidth onClick={() => onStart(order.id)} disabled={isUpdating === order.id} className="h-11 font-black">
              {isUpdating === order.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Package className="h-4 w-4 mr-2" />}
              Start Processing
            </Button>
          )}
          {order.status === 'CONFIRMED' && isBeingProcessedByMe && (
            <Button fullWidth variant="info" onClick={() => onUpdate(order.id, 'CONFIRMED')} disabled={isUpdating === order.id} className="h-11 font-black">
              {isUpdating === order.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Truck className="h-4 w-4 mr-2" />}
              Mark as Shipped
            </Button>
          )}
          {order.status === 'SHIPPED' && isBeingProcessedByMe && (
            <Button fullWidth variant="success" onClick={() => onUpdate(order.id, 'SHIPPED')} disabled={isUpdating === order.id} className="h-11 font-black">
              {isUpdating === order.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Mark as Delivered
            </Button>
          )}
          {(order.status === 'CONFIRMED' || order.status === 'SHIPPED') && !isBeingProcessedByMe && (
            <Button fullWidth variant="outline" disabled className="h-11 opacity-50 font-black cursor-not-allowed">
              Order Processed by Others
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

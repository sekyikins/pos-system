'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { updateOnlineOrderStatus, startProcessingOnlineOrder, getUsers, getOnlineOrders, getDeliveryPoints } from '@/lib/db';
import { OnlineOrder, StaffRecord, AuthUser } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Loader2, ShoppingBag, Truck, CheckCircle, Package, Clock, XCircle, User } from 'lucide-react';
import { useToastStore, useSettingsStore } from '@/lib/store';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/lib/auth';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import { LiveStatus } from '@/components/ui/LiveStatus';

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING:   { label: 'Pending',     color: 'bg-warning/10 text-warning border-warning/20',         icon: Clock },
  CONFIRMED: { label: 'Processing',  color: 'bg-info/10 text-info border-info/20',                  icon: Package },
  SHIPPED:   { label: 'In Transit',  color: 'bg-primary/10 text-primary border-primary/20',         icon: Truck },
  DELIVERED: { label: 'Delivered',   color: 'bg-success/10 text-success border-success/20',         icon: CheckCircle },
  CANCELLED: { label: 'Cancelled',   color: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
};

// Removed local ConnectionBadge in favor of global LiveStatus

export function OnlineOrdersList() {
  const { addToast } = useToastStore();
  const { user } = useAuth();
  const { currencySymbol } = useSettingsStore();
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<'ACTIVE' | 'PROCESSING' | 'HISTORY'>('ACTIVE');
  const [deliveryPoints, setDeliveryPoints] = useState<Record<string, string>>({});

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
    fetcher: async () => {
      const [fetchedOrders, points] = await Promise.all([getOnlineOrders(), getDeliveryPoints()]);
      const pMap: Record<string, string> = {};
      points.forEach(p => { pMap[p.id] = p.name; });
      setDeliveryPoints(pMap);
      return fetchedOrders;
    },
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
    () => orders.filter(o => o.status === 'PENDING' && !o.startProcessStaffId),
    [orders]
  );
  const processingOrders = useMemo(
    () => orders.filter(o => (o.status === 'CONFIRMED' || o.status === 'SHIPPED') && o.startProcessStaffId),
    [orders]
  );
  const historyOrders = useMemo(
    () => orders.filter(o =>
      (o.status === 'DELIVERED' || o.status === 'CANCELLED') &&
      (o.endProcessStaffId === user?.id || user?.role === 'ADMIN' || user?.role === 'MANAGER')
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
      <div className="p-0 sm:p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
    <div className="flex flex-col h-full">
      {/* Sticky Header: Tab Switcher + Connection Status */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/40 px-4 py-4 sm:px-6 space-y-4 shadow-sm">
        <div className="flex flex-wrap justify-between gap-4 max-w-7xl mx-auto w-full">
          <div className="flex bg-muted/30 rounded-2xl w-full max-w-xl ring-1 ring-border/20">
            {(['ACTIVE', 'PROCESSING', 'HISTORY'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setCurrentTab(tab)}
                className={`flex-1 py-2 px-2 rounded-xl text-[11px] sm:text-xs lg:text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap min-w-fit ${
                  currentTab === tab
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                {tab === 'ACTIVE'     && <ShoppingBag className="h-4 w-4 shrink-0" />}
                {tab === 'PROCESSING' && <Package className="h-4 w-4 shrink-0" />}
                {tab === 'HISTORY'    && <Clock className="h-4 w-4 shrink-0" />}
                <span className="hidden xs:inline">{tab.charAt(0) + tab.slice(1).toLowerCase()}</span>
                <span className="xs:hidden">{tab === 'ACTIVE' ? 'Live' : tab === 'PROCESSING' ? 'Proc' : 'Done'}</span>
                <Badge variant="secondary" className="ml-1 text-[10px] bg-background/20 text-inherit border-none px-2 h-5">
                  {tab === 'ACTIVE' ? activeOrders.length : tab === 'PROCESSING' ? processingOrders.length : historyOrders.length}
                </Badge>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between md:justify-end gap-6 px-1">
             <div className="flex items-center gap-2">
                <LiveStatus status={connectionStatus} />
             </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="p-4 sm:p-6 lg:p-8 flex-1 overflow-y-auto">
        {displayOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-card rounded-[2.5rem] border-2 border-dashed border-border/50 text-center max-w-4xl mx-auto w-full">
            <div className="h-24 w-24 rounded-full bg-muted/30 flex items-center justify-center mb-6 shadow-inner">
              <ShoppingBag className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">No {currentTab.toLowerCase()} orders</h3>
            <p className="text-muted-foreground mb-8 font-medium">Everything looks quiet on this front.</p>
            <Button variant="outline" onClick={refetch} className="rounded-xl px-8">Refresh Data</Button>
          </div>
        ) : groupedHistory ? (
          <div className="space-y-12 max-w-7xl mx-auto w-full">
            {Object.entries(groupedHistory).map(([group, grpOrders]) => (
              <div key={group} className="space-y-6">
                <div className="flex items-center gap-4">
                   <h3 className="text-xl font-bold text-foreground">{group}</h3>
                   <div className="h-px flex-1 bg-linear-to-r from-border to-transparent" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {grpOrders.map(order => (
                    <OrderCard key={order.id} order={order} staff={staff} deliveryPoints={deliveryPoints} currentUser={user} isUpdating={isUpdating} currencySymbol={currencySymbol} onStart={handleStartProcessing} onUpdate={handleUpdateStatus} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto w-full">
            {displayOrders.map(order => (
              <OrderCard key={order.id} order={order} staff={staff} deliveryPoints={deliveryPoints} currentUser={user} isUpdating={isUpdating} currencySymbol={currencySymbol} onStart={handleStartProcessing} onUpdate={handleUpdateStatus} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface OrderCardProps {
  order: OnlineOrder;
  staff: StaffRecord[];
  deliveryPoints: Record<string, string>;
  currentUser: AuthUser | null;
  isUpdating: string | null;
  currencySymbol: string;
  onStart: (id: string) => void;
  onUpdate: (id: string, currentStatus: string) => void;
}

function OrderCard({ order, staff, deliveryPoints, currentUser, isUpdating, currencySymbol, onStart, onUpdate }: OrderCardProps) {
  const meta = STATUS_MAP[order.status] || { label: order.status, color: 'bg-muted text-muted-foreground', icon: Package };
  const StatusIcon = meta.icon;
  const isBeingProcessedByMe = order.startProcessStaffId === currentUser?.id;
  const processingStaff = staff.find((s: StaffRecord) => s.id === order.startProcessStaffId);

  return (
    <Card className="overflow-hidden border-2 border-border/50 hover:border-primary/30 transition-all shadow-sm flex flex-col h-full bg-card">
      <div className="p-3 sm:p-4 flex flex-col h-full">
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
          <div className="bg-muted/30 rounded-2xl p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Amount</p>
            <p className="text-2xl sm:text-3xl font-bold text-primary">{currencySymbol}{order.totalAmount.toFixed(2)}</p>
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
              <Badge variant="secondary" className="text-[10px] uppercase font-bold">{order.paymentMethodId.replace(/_/g, ' ')}</Badge>
            </div>
          </div>

          <div className="px-1 space-y-2">
            <div className="flex items-start gap-2">
              <Truck className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold">Shipping Address</p>
                <p className="text-muted-foreground text-xs">
                   {order.deliveryAddress || (order.deliveryPointId ? `Store Pickup - ${deliveryPoints[order.deliveryPointId] || 'Main'}` : 'Store Pickup')}
                </p>
              </div>
            </div>
            {order.startProcessStaffId && (
              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                <User className="h-3.5 w-3.5 text-info" />
                <p className="text-xs font-medium">
                  {isBeingProcessedByMe
                    ? <span className="text-success">You are processing this order</span>
                    : <span className="text-info">Started by {processingStaff?.name || 'a colleague'}</span>
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 mt-4 border-t border-border">
          {order.status === 'PENDING' && (
            <Button fullWidth onClick={() => onStart(order.id)} disabled={isUpdating === order.id} className="h-11 font-bold">
              {isUpdating === order.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Package className="h-4 w-4 mr-2" />}
              Start Processing
            </Button>
          )}
          {order.status === 'CONFIRMED' && isBeingProcessedByMe && (
            <Button fullWidth variant="info" onClick={() => onUpdate(order.id, 'CONFIRMED')} disabled={isUpdating === order.id} className="h-11 font-bold">
              {isUpdating === order.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Truck className="h-4 w-4 mr-2" />}
              Mark as Shipped
            </Button>
          )}
          {order.status === 'SHIPPED' && isBeingProcessedByMe && (
            <Button fullWidth variant="success" onClick={() => onUpdate(order.id, 'SHIPPED')} disabled={isUpdating === order.id} className="h-11 font-bold">
              {isUpdating === order.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Mark as Delivered
            </Button>
          )}
          {(order.status === 'CONFIRMED' || order.status === 'SHIPPED') && !isBeingProcessedByMe && (
            <Button fullWidth variant="outline" disabled className="h-11 opacity-50 font-bold cursor-not-allowed">
              Being Processed
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

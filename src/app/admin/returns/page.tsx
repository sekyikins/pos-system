'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import { Return } from '@/lib/types';
import { getReturns, updateReturnStatus } from '@/lib/db_extended';
import { Search, RotateCcw, CreditCard, Package, AlertCircle, CheckCircle2, Eye } from 'lucide-react';
import { useToastStore, useSettingsStore } from '@/lib/store';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: 'border-warning bg-warning/10 text-warning',
  APPROVED: 'border-info bg-info/10 text-info',
  COMPLETED: 'border-success bg-success/10 text-success',
  REJECTED: 'border-destructive bg-destructive/10 text-destructive',
};

export default function AdminReturnsPage() {
  const { user } = useAuth();
  const { addToast } = useToastStore();
  const { currencySymbol } = useSettingsStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'IN_STORE' | 'ONLINE'>('IN_STORE');

  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [actionModal, setActionModal] = useState<'APPROVE' | 'REJECT' | 'REFUND' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: returns, isLoading, refetch } = useRealtimeTable<Return>({
    table: 'returns',
    initialData: [],
    fetcher: getReturns,
    refetchOnChange: true
  });

  const filteredReturns = returns.filter(r => {
    if (r.source !== activeTab) return false;
    if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        r.id.toLowerCase().includes(q) ||
        r.saleId?.toLowerCase().includes(q) ||
        r.orderId?.toLowerCase().includes(q) ||
        r.customerName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleAction = async () => {
    if (!selectedReturn || !actionModal) return;
    
    setIsProcessing(true);
    try {
      let targetStatus: Return['status'] = 'REQUESTED';
      
      if (actionModal === 'APPROVE') targetStatus = 'APPROVED';
      else if (actionModal === 'REJECT') targetStatus = 'REJECTED';
      else if (actionModal === 'REFUND') targetStatus = 'COMPLETED';

      if (actionModal === 'REJECT' && !rejectionReason.trim()) {
        addToast('Please provide a rejection reason.', 'error');
        setIsProcessing(false);
        return;
      }

      await updateReturnStatus(selectedReturn.id, targetStatus, user!.id, rejectionReason);
      
      addToast(`Return ${targetStatus.toLowerCase()} successfully`, 'success');
      setActionModal(null);
      setSelectedReturn(null);
      setRejectionReason('');
      refetch();
    } catch (err) {
      addToast(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REQUESTED': return <span className="px-2.5 py-1 rounded-full text-xs font-bold border border-warning bg-warning/10 text-warning">Requested</span>;
      case 'APPROVED':  return <span className="px-2.5 py-1 rounded-full text-xs font-bold border border-info bg-info/10 text-info">Approved</span>;
      case 'COMPLETED': return <span className="px-2.5 py-1 rounded-full text-xs font-bold border border-success bg-success/10 text-success">Refunded</span>;
      case 'REJECTED':  return <span className="px-2.5 py-1 rounded-full text-xs font-bold border border-destructive bg-destructive/10 text-destructive">Rejected</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Returns & Refunds</h1>
          <p className="text-muted-foreground mt-1">Manage requested product returns and issue refunds.</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex rounded-xl bg-muted/50 p-1 w-full sm:w-auto overflow-x-auto">
             <button
               onClick={() => setActiveTab('IN_STORE')}
               className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'IN_STORE' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
             >
               In-Store Returns
             </button>
             <button
               onClick={() => setActiveTab('ONLINE')}
               className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'ONLINE' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
             >
               Online Returns
             </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
             <select
               value={filterStatus}
               onChange={(e) => setFilterStatus(e.target.value)}
               className="h-10 px-3 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
             >
               <option value="ALL">All Statuses</option>
               <option value="REQUESTED">Requested</option>
               <option value="APPROVED">Approved (Awaiting Refund)</option>
               <option value="COMPLETED">Completed (Refunded)</option>
               <option value="REJECTED">Rejected</option>
             </select>
             <div className="relative">
               <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
               <input
                 type="text"
                 placeholder="Search Return/Order ID..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="h-10 pl-10 pr-4 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm w-full sm:w-64"
               />
             </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/30 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-4">Return ID</th>
                <th className="px-6 py-4">{activeTab === 'IN_STORE' ? 'Sale ID' : 'Order ID'}</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Refund (80%)</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 bg-card">
               {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/10">
                    <td className="px-6 py-4"><Skeleton className="h-4 w-20 rounded" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-24 rounded" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-16 rounded" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-32 rounded" /></td>
                    <td className="px-6 py-4"><div className="flex justify-center"><Skeleton className="h-4 w-16 rounded" /></div></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                    <td className="px-6 py-4 text-center"><Skeleton className="h-8 w-8 mx-auto rounded-full" /></td>
                  </tr>
                ))
              ) : filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <RotateCcw className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium">No returns found matching your criteria</p>
                  </td>
                </tr>
              ) : (
                filteredReturns.map(ret => (
                  <tr key={ret.id} className="hover:bg-primary/5 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">
                       #{ret.id.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-6 py-4 font-medium text-primary">
                       #{ret.saleId?.slice(-8).toUpperCase() || ret.orderId?.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                      {new Date(ret.requestedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-medium text-foreground">
                      {ret.customerName || 'Walk-in Customer'}
                    </td>
                    <td className="px-6 py-4 font-bold">
                      <div className='flex justify-center'>{currencySymbol}{ret.refundAmount?.toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(ret.status)}
                    </td>
                    <td className="px-6 py-4 text-primary text-center">
                       <Button variant="ghost" size="sm" onClick={() => setSelectedReturn(ret)}><Eye className="h-4.5 w-4.5"/></Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details / Action Modal */}
      {selectedReturn && (
        <Modal 
          isOpen={true} 
          onClose={() => { setSelectedReturn(null); setActionModal(null); setRejectionReason(''); }} 
          title="Return Details"
          size="md"
        >
          <div className="space-y-6">
            <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold">Return #{selectedReturn.id.slice(-8).toUpperCase()}</h2>
                  <p className="text-sm text-muted-foreground">{new Date(selectedReturn.requestedAt).toLocaleString()}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[selectedReturn.status]}`}>
                  {selectedReturn.status}
                </div>
              </div>

            <div>
              <p className="text-sm font-bold text-foreground mb-3">Items to Return</p>
              <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border/50">
                 {selectedReturn.items?.map(item => (
                   <div key={item.id} className="p-3 flex justify-between items-center text-sm">
                     <div className="flex items-center gap-3">
                       <div className="h-8 w-8 bg-muted rounded flex items-center justify-center text-muted-foreground"><Package className="h-4 w-4" /></div>
                       <div>
                         <p className="font-medium">{item.productName}</p>
                         <p className="text-xs text-muted-foreground mt-0.5">Purchased at {currencySymbol}{item.unitPrice.toFixed(2)}</p>
                       </div>
                     </div>
                     <div className="text-right">
                       <p className="font-bold">x{item.quantity}</p>
                       <p className="text-xs font-bold mt-0.5">{currencySymbol}{item.subtotal.toFixed(2)}</p>
                     </div>
                   </div>
                 ))}
                 <div className="p-3 bg-primary/5 flex justify-between items-center border-t-2 border-primary/20">
                    <span className="text-sm font-bold text-primary">Refund Amount</span>
                    <span className="text-lg font-bold text-primary">{currencySymbol}{selectedReturn.refundAmount?.toFixed(2)}</span>
                 </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-foreground mb-2">Customer&apos;s Reason</p>
              <div className="p-4 bg-muted/30 rounded-xl border border-border text-sm italic text-muted-foreground">
                &quot;{selectedReturn.reason}&quot;
              </div>
            </div>

            {selectedReturn.status === 'REJECTED' && selectedReturn.rejectionReason && (
              <div>
                <p className="text-sm font-bold text-foreground mb-2">Rejection Reason</p>
                <div className="p-4 bg-destructive/10 rounded-xl border border-destructive/20 text-sm text-destructive font-medium">
                  {selectedReturn.rejectionReason}
                </div>
              </div>
            )}

            {/* Action Area */}
            {actionModal === 'APPROVE' ? (
              <div className="space-y-4 pt-4 border-t border-border text-sm">
                <div className="p-4 bg-info/10 text-info border border-info/30 rounded-xl flex gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-bold mb-1">Confirm Approval</p>
                    <p>By approving, you confirm that you have inspected the returned items and they meet the return policy. The next step will be to issue the refund.</p>
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <Button variant="outline" onClick={() => setActionModal(null)}>Cancel</Button>
                  <Button variant="primary" disabled={isProcessing} onClick={handleAction}>
                    Confirm Approval
                  </Button>
                </div>
              </div>
            ) : actionModal === 'REJECT' ? (
              <div className="space-y-3 pt-4 border-t border-border">
                <label className="text-sm font-bold text-destructive">Explain Rejection Reason</label>
                <textarea
                   className="w-full h-24 p-3 text-sm border border-destructive/30 rounded-xl bg-destructive/5 focus:ring-2 focus:ring-destructive/30 focus:outline-none"
                   placeholder="E.g., Item shows signs of use, not in original packaging..."
                   value={rejectionReason}
                   onChange={e => setRejectionReason(e.target.value)}
                />
                <div className="flex gap-3 justify-end pt-2">
                  <Button variant="outline" onClick={() => setActionModal(null)}>Cancel</Button>
                  <Button variant="danger" disabled={isProcessing} onClick={handleAction}>
                    Confirm Rejection
                  </Button>
                </div>
              </div>
            ) : actionModal === 'REFUND' ? (
              <div className="space-y-4 pt-4 border-t border-border text-sm">
                <div className="p-4 bg-info/10 text-info border border-info/30 rounded-xl flex gap-3">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-bold mb-1">Process Refund Manually</p>
                    <p>For Paystack payments, please process the refund of <b>{currencySymbol}{selectedReturn.refundAmount?.toFixed(2)}</b> in your Paystack Dashboard first. For Cash/POD, hand the cash to the customer, then click Confirm below.</p>
                    
                    {selectedReturn.paymentMethod === 'PAYSTACK' && selectedReturn.paymentReference && (
                      <div className="mt-3">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => window.open(`https://dashboard.paystack.com/#/search?model=transactions&query=${selectedReturn.paymentReference}`, '_blank')}
                          className="text-info border-info/50 bg-info/5 hover:bg-info/10 font-bold"
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Open Paystack Transaction
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <Button variant="outline" onClick={() => setActionModal(null)}>Cancel</Button>
                  <Button variant="primary" disabled={isProcessing} onClick={handleAction}>
                    Confirm Completed Refund
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end gap-3 pt-6 border-t border-border">
                 {selectedReturn.status === 'REQUESTED' && (
                   <>
                     <Button variant="danger" onClick={() => setActionModal('REJECT')}>Reject Request</Button>
                     <Button variant="primary" onClick={() => setActionModal('APPROVE')}>Approve</Button>
                   </>
                 )}
                 {selectedReturn.status === 'APPROVED' && (
                   <>
                     {user?.role === 'ADMIN' && <Button variant="danger" onClick={() => setActionModal('REJECT')}>Reject (Admin Override)</Button>}
                     <Button variant="primary" onClick={() => setActionModal('REFUND')}>Process Refund</Button>
                   </>
                 )}
                 {(selectedReturn.status === 'COMPLETED' || selectedReturn.status === 'REJECTED') && (
                   <Button variant="outline" onClick={() => setSelectedReturn(null)}>Close</Button>
                 )}
              </div>
            )}
            
            {(selectedReturn.status === 'REQUESTED' || selectedReturn.status === 'APPROVED') && !actionModal && (
              <p className="text-[10px] text-muted-foreground text-center font-bold uppercase tracking-widest mt-2 px-6">
                 Note: Completing the refund physically restores product inventory and marks the original sale as returned in analytics.
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

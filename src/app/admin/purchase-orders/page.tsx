'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Truck, Plus, Search, FileText, CheckCircle, XCircle, ChevronRight, Loader2, Package, Trash2, ArrowUpRight } from 'lucide-react';
import { PurchaseOrder, PurchaseOrderItem, Product, Supplier } from '@/lib/types';
import { getPurchaseOrders, addPurchaseOrder, updatePurchaseOrderStatus, getProducts, getSuppliers } from '@/lib/db_extended';
import { useToastStore, useSettingsStore } from '@/lib/store';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import { LiveStatus } from '@/components/ui/LiveStatus';

type NewPurchaseOrderItem = Omit<PurchaseOrderItem, 'id' | 'poId' | 'subtotal' | 'createdAt' | 'productName'>;

export default function PurchaseOrdersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { addToast } = useToastStore();
  const { currencySymbol } = useSettingsStore();

  const { data: purchaseOrders, isLoading, connectionStatus, refetch } = useRealtimeTable<PurchaseOrder>({
    table: 'purchase_orders',
    initialData: [],
    fetcher: getPurchaseOrders,
    refetchOnChange: true
  });

  // Modal Form State
  const [supplierId, setSupplierId] = useState('');
  const [poItems, setPoItems] = useState<NewPurchaseOrderItem[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [p, s] = await Promise.all([getProducts(), getSuppliers()]);
        setProducts(p);
        setSuppliers(s);
      } catch (e) {
        console.error('Failed to load PO data', e);
      }
    }
    loadData();
  }, []);

  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter(po => 
      po.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.supplierName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.status.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [purchaseOrders, searchQuery]);

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) { addToast('Select a supplier', 'error'); return; }
    if (poItems.length === 0) { addToast('Add at least one item', 'error'); return; }

    setIsSaving(true);
    try {
      const totalAmount = poItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
      const newPO = {
        supplierId,
        status: 'PENDING' as const,
        totalAmount,
      };

      const items = poItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.unitCost,
        subtotal: item.quantity * item.unitCost,
      }));

      await addPurchaseOrder(newPO, items);
      addToast('Purchase Order created', 'success');
      setIsModalOpen(false);
      setPoItems([]);
      setSupplierId('');
      refetch();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to create PO', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: PurchaseOrder['status']) => {
    const verb = status === 'RECEIVED' ? 'Receive' : status === 'APPROVED' ? 'Approve' : 'Cancel';
    if (!window.confirm(`Are you sure you want to ${verb} this order?`)) return;

    try {
      await updatePurchaseOrderStatus(id, status);
      addToast(`Order ${status.toLowerCase()}`, 'success');
      refetch();
      if (selectedPO?.id === id) setSelectedPO(null);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Update failed', 'error');
    }
  };

  const addItemToPO = () => {
    setPoItems([...poItems, { productId: '', quantity: 1, unitCost: 0 }]);
  };

  const removeItemFromPO = (index: number) => {
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof NewPurchaseOrderItem, value: string | number) => {
    const newItems = [...poItems];
    if (field === 'productId') {
      newItems[index].productId = value as string;
      const prod = products.find(p => p.id === value);
      if (prod) newItems[index].unitCost = prod.price * 0.7;
    } else {
      newItems[index][field] = value as number;
    }
    setPoItems(newItems);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-4 w-64 opacity-50" />
          </div>
        ) : (
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Truck className="h-8 w-8 text-primary" /> Purchase Orders
            </h1>
            <p className="text-sm text-muted-foreground font-medium">Manage restocking and supplier transactions</p>
          </div>
        )}
        <div className="flex items-center gap-4">
          <LiveStatus status={connectionStatus} />
          <Button onClick={() => setIsModalOpen(true)} className="gap-2 shadow-lg shadow-primary/20" disabled={isLoading}>
            <Plus className="h-4 w-4" /> New Order
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-2 border-border/50">
          <CardHeader className="pb-0 border-b border-border/50">
             {isLoading ? (
               <div className="pb-6"><Skeleton className="h-11 w-full max-w-sm rounded-xl" /></div>
             ) : (
               <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6">
                  <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/60" />
                    <Input 
                      placeholder="Search supplier, order ID, status..." 
                      className="pl-10 h-11 rounded-xl bg-muted/20"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
               </div>
             )}
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-0">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-6 px-6 py-5 border-b border-border last:border-0 bg-muted/5">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-3 w-1/6" />
                    </div>
                    <Skeleton className="h-6 w-24 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-lg ml-auto" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-medium">
                  <thead className="bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground/70 border-b border-border/50">
                    <tr>
                      <th className="p-5 text-left">Order Details</th>
                      <th className="p-5 text-left">Supplier</th>
                      <th className="p-5 text-left">Status</th>
                      <th className="p-5 text-right">Total Amount</th>
                      <th className="p-5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredOrders.length === 0 ? (
                      <tr><td colSpan={5} className="p-12 text-center text-muted-foreground">No purchase orders found.</td></tr>
                    ) : (
                      filteredOrders.map((po) => (
                        <tr key={po.id} className={`hover:bg-primary/5 transition-all group cursor-pointer ${selectedPO?.id === po.id ? 'bg-primary/5' : ''}`} onClick={() => setSelectedPO(po)}>
                          <td className="p-5">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors border border-border/50">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div>
                                <span className="font-bold text-foreground">#{po.id.slice(0, 8)}</span>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">{new Date(po.createdAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-5">
                             <div className="flex items-center gap-2">
                               <Truck className="h-3.5 w-3.5 text-muted-foreground/60" />
                               <span className="font-semibold">{po.supplierName || 'Manual/Unknown'}</span>
                             </div>
                          </td>
                          <td className="p-5">
                            <Badge variant={
                              po.status === 'RECEIVED' ? 'success' : 
                              po.status === 'CANCELLED' ? 'destructive' : 
                              po.status === 'APPROVED' ? 'secondary' : 'outline'
                            } className="font-bold uppercase text-[10px] tracking-widest px-2.5 py-0.5 rounded-full border-2">
                              {po.status}
                            </Badge>
                          </td>
                          <td className="p-5 text-right font-bold text-base text-primary">
                            {currencySymbol}{po.totalAmount.toFixed(2)}
                          </td>
                          <td className="p-5">
                            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                               <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg group-hover:bg-primary group-hover:text-white transition-all">
                                 <ChevronRight className="h-4 w-4" />
                               </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* PO Detail View / Sidebar */}
        <div className="space-y-6">
           {selectedPO ? (
             <Card className="border-2 border-primary/20 sticky top-6 shadow-xl">
               <CardHeader className="bg-primary/5 border-b border-primary/10">
                 <div className="flex justify-between items-start">
                   <div>
                     <CardTitle className="text-xl">Details: #{selectedPO.id.slice(0, 8)}</CardTitle>
                     <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-primary/70">
                       {new Date(selectedPO.createdAt).toLocaleString()}
                     </CardDescription>
                   </div>
                   <Button variant="ghost" size="sm" onClick={() => setSelectedPO(null)} className="h-8 w-8 p-0 rounded-full hover:bg-primary/10">
                     <XCircle className="h-5 w-5" />
                   </Button>
                 </div>
               </CardHeader>
               <CardContent className="pt-6 space-y-6">
                 <div className="space-y-3">
                   <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                     <Package className="h-3.5 w-3.5" /> Ordered Items
                   </h4>
                   <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                     {selectedPO.items?.map((item) => (
                       <div key={item.id} className="flex justify-between p-3 rounded-xl bg-muted/30 border border-border/50 text-sm">
                         <div>
                            <p className="font-bold">{item.productName || 'Unknown Product'}</p>
                            <p className="text-[10px] text-muted-foreground font-bold tracking-tight">
                              QTY: <span className="text-primary">{item.quantity}</span> · COST: {currencySymbol}{item.unitCost.toFixed(2)}
                            </p>
                         </div>
                         <div className="font-bold text-foreground self-center">
                           {currencySymbol}{item.subtotal.toFixed(2)}
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>

                 <div className="pt-4 border-t border-border flex justify-between items-center">
                   <span className="text-sm font-bold text-muted-foreground">Order Total</span>
                   <span className="text-2xl font-bold text-primary">{currencySymbol}{selectedPO.totalAmount.toFixed(2)}</span>
                 </div>

                 {selectedPO.status === 'PENDING' && (
                   <div className="grid grid-cols-2 gap-3 pt-4">
                     <Button variant="outline" className="font-bold border-destructive text-destructive hover:bg-destructive/5" onClick={() => handleUpdateStatus(selectedPO.id, 'CANCELLED')}>
                       <XCircle className="h-4 w-4 mr-2" /> Reject
                     </Button>
                     <Button className="font-bold bg-info hover:bg-info/90 text-white" onClick={() => handleUpdateStatus(selectedPO.id, 'APPROVED')}>
                       <CheckCircle className="h-4 w-4 mr-2" /> Approve
                     </Button>
                   </div>
                 )}

                 {selectedPO.status === 'APPROVED' && (
                   <Button className="w-full font-bold bg-success hover:bg-success/90" onClick={() => handleUpdateStatus(selectedPO.id, 'RECEIVED')}>
                     <ArrowUpRight className="h-4 w-4 mr-2" /> Confirm Receipt & Add to Stock
                   </Button>
                 )}

                 {selectedPO.status === 'RECEIVED' && (
                   <div className="p-4 bg-success/5 border border-success/20 rounded-2xl flex items-center gap-3 text-success">
                     <CheckCircle className="h-5 w-5" />
                     <p className="text-xs font-bold uppercase tracking-wide">Stock Updated Successfully</p>
                   </div>
                 )}
               </CardContent>
             </Card>
           ) : (
             <Card className="border-2 border-dashed border-border/50 h-[400px] flex flex-col items-center justify-center text-center p-8 bg-muted/10 rounded-2xl">
                {isLoading ? (
                  <div className="space-y-4 w-full px-4">
                    <Skeleton className="h-10 w-10 rounded-full mx-auto" />
                    <Skeleton className="h-4 w-3/4 mx-auto" />
                    <Skeleton className="h-32 w-full rounded-xl" />
                  </div>
                ) : (
                  <>
                    <Truck className="h-16 w-16 text-muted-foreground/20 mb-4" />
                    <h3 className="font-bold text-muted-foreground/60 tracking-tight">Select an order to view its details, items and management options.</h3>
                  </>
                )}
             </Card>
           )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Initialize Purchase Order" size="lg">
        <form onSubmit={handleCreatePO} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 ml-1">
              <Truck className="h-3.5 w-3.5 text-primary" /> Target Supplier
            </label>
            <select
              className="h-11 w-full rounded-xl border-2 border-border bg-muted/20 px-4 text-sm font-bold focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              required
            >
              <option value="">Select a supplier...</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="space-y-4">
             <div className="flex justify-between items-center border-b border-border pb-3">
               <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Order Composition</h4>
               <Button type="button" size="sm" variant="outline" onClick={addItemToPO} className="h-8 rounded-lg font-bold text-xs">
                 <Plus className="h-3.5 w-3.5 mr-1" /> Add Product
               </Button>
             </div>

             <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
               {poItems.map((item, index) => (
                 <div key={index} className="grid grid-cols-12 gap-3 items-end bg-muted/20 p-4 rounded-2xl border border-border/30 relative group">
                    <div className="col-span-12 md:col-span-5 space-y-1.5">
                       <label className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground px-1">Product</label>
                       <select
                        className="h-10 w-full rounded-lg border border-border bg-card px-3 text-xs font-bold appearance-none"
                        value={item.productId}
                        onChange={(e) => updateItem(index, 'productId', e.target.value)}
                        required
                      >
                        <option value="">Choose item...</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.quantity})</option>)}
                      </select>
                    </div>
                    <div className="col-span-6 md:col-span-3 space-y-1.5">
                       <label className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground px-1">Quantity</label>
                       <Input 
                        type="number" 
                        min="1" 
                        className="h-10 rounded-lg text-xs" 
                        value={item.quantity} 
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))} 
                        required 
                       />
                    </div>
                    <div className="col-span-6 md:col-span-3 space-y-1.5">
                       <label className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground px-1">Unit Cost</label>
                       <Input 
                        type="number" 
                        step="0.01" 
                        min="0" 
                        className="h-10 rounded-lg text-xs" 
                        value={item.unitCost} 
                        onChange={(e) => updateItem(index, 'unitCost', parseFloat(e.target.value))} 
                        required 
                       />
                    </div>
                    <div className="col-span-12 md:col-span-1 flex justify-end pb-1.5">
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeItemFromPO(index)} className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 rounded-lg">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                 </div>
               ))}
               {poItems.length === 0 && (
                 <div className="text-center py-8 bg-muted/10 rounded-2xl border-2 border-dashed border-border/50 text-xs font-medium text-muted-foreground">
                   No items added yet. Click &apos;Add Product&apos; to begin building your order.
                 </div>
               )}
             </div>
          </div>

          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex justify-between items-center">
             <span className="text-sm font-bold text-primary/70 uppercase tracking-widest">Est. Order Value</span>
             <span className="text-xl font-bold text-primary">{currencySymbol}{poItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0).toFixed(2)}</span>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-8">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSaving} className="font-bold rounded-xl">Discard</Button>
            <Button type="submit" disabled={isSaving} className="font-bold rounded-xl min-w-[180px] shadow-lg shadow-primary/20">
              {isSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing...</> : 'Launch Purchase Order'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

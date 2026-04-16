'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Customer } from '@/lib/types';
import { getAllCustomers, addPosCustomer, updateCustomer, deleteCustomer } from '@/lib/db';
import { useToastStore } from '@/lib/store';
import { Plus, Search, Edit, Trash2, User, Phone, Mail, Award, ArrowUpDown, Calendar, Monitor, Store, Layers } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import { CopyableId } from '@/components/ui/CopyableId';

type SortKey = 'name' | 'date' | 'loyalty';

export default function CustomersPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterType, setFilterType] = useState('ALL');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const { addToast } = useToastStore();
  const [form, setForm] = useState({ name: '', phone: '', email: '' });

  const { data: customers, isLoading, refetch } = useRealtimeTable<Customer>({
    table: 'customers',
    initialData: [],
    fetcher: getAllCustomers,
    refetchOnChange: true,
    cacheKey: 'admin-customers'
  });

  const processed = useMemo(() => {
    const filtered = customers.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.phone?.includes(searchQuery) ||
                          c.email?.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchType = true;
      if (filterType === 'STOREFRONT') matchType = c.type === 'ONLINE';
      else if (filterType === 'INSTORE') matchType = c.type === 'IN_STORE';
      else if (filterType === 'BOTH') matchType = c.type === 'BOTH';
      
      return matchSearch && matchType;
    });

    return [...filtered].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (sortKey === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (sortKey === 'loyalty') {
        valA = a.loyalty_points;
        valB = b.loyalty_points;
      } else if (sortKey === 'date') {
        valA = new Date(a.created_at || 0).getTime();
        valB = new Date(b.created_at || 0).getTime();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [customers, searchQuery, sortKey, sortOrder, filterType]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    setIsSaving(true);
    try {
      const result = await addPosCustomer({ name: form.name, phone: form.phone || undefined, email: form.email || undefined });
      addToast(result.type === 'BOTH' ? 'Online account linked & upgraded to BOTH!' : 'Customer added', 'success');
      refetch();
      setIsAddOpen(false);
      setForm({ name: '', phone: '', email: '' });
    } catch { addToast('Failed to add customer', 'error'); }
    finally { setIsSaving(false); }
  };

  const handleEditOpen = (c: Customer) => {
    if (c.type === 'ONLINE' || c.type === 'BOTH') { 
      addToast('Online accounts are read-only in POS Admin to protect identity data', 'info'); 
      return; 
    }
    setEditingCustomer(c);
    setForm({ name: c.name, phone: c.phone || '', email: c.email || '' });
    setIsEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    setIsSaving(true);
    try {
      await updateCustomer(editingCustomer.id, { name: form.name, phone: form.phone || undefined, email: form.email || undefined });
      addToast('Customer updated', 'success');
      refetch();
      setIsEditOpen(false);
    } catch { addToast('Failed to update', 'error'); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (c: Customer) => {
    if (c.type === 'ONLINE' || c.type === 'BOTH') { 
      addToast('Cannot delete accounts with associated online profiles from here.', 'error'); 
      return; 
    }
    if (!window.confirm('Delete this customer?')) return;
    try {
      await deleteCustomer(c.id);
      addToast('Customer deleted', 'info');
      refetch();
    } catch { addToast('Failed to delete', 'error'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Unified Customers
          </h1>
          <p className="text-sm text-muted-foreground font-medium">Overview of in-store, storefront, and omnichannel shoppers</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setIsAddOpen(true)} className="gap-2 shrink-0 font-bold rounded-xl shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4" /> New POS Customer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <Card key={i} className="bg-muted/5 border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-2xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="bg-primary/5 border-primary/20 overflow-hidden">
              <CardContent className="pt-6 flex">
                <div className="flex items-start gap-4">
                   <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                      <User className="h-6 w-6" />
                   </div>
                   <div>
                      <p className="text-sm font-bold text-muted-foreground">Total</p>
                      <p className="text-2xl font-bold">{customers.length}</p>
                   </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-info/5 border-info/20 overflow-hidden">
              <CardContent className="pt-6 flex">
                <div className="flex items-start gap-4">
                   <div className="h-12 w-12 rounded-2xl bg-info/20 flex items-center justify-center text-info">
                      <Monitor className="h-6 w-6" />
                   </div>
                   <div>
                      <p className="text-sm font-bold text-muted-foreground">Storefront</p>
                      <p className="text-2xl font-bold">{customers.filter(c => c.type === 'ONLINE').length}</p>
                   </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-success/5 border-success/20 overflow-hidden">
              <CardContent className="pt-6 flex">
                <div className="flex items-start gap-4">
                   <div className="h-12 w-12 rounded-2xl bg-success/20 flex items-center justify-center text-success">
                      <Store className="h-6 w-6" />
                   </div>
                   <div>
                      <p className="text-sm font-bold text-muted-foreground">In-Store</p>
                      <p className="text-2xl font-bold">{customers.filter(c => c.type === 'IN_STORE').length}</p>
                   </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-warning/5 border-warning/20 overflow-hidden">
              <CardContent className="pt-6 flex">
                <div className="flex items-start gap-4">
                   <div className="h-12 w-12 rounded-2xl bg-warning/20 flex items-center justify-center text-warning">
                      <Layers className="h-6 w-6" />
                   </div>
                   <div>
                      <p className="text-sm font-bold text-muted-foreground">Both</p>
                      <p className="text-2xl font-bold">{customers.filter(c => c.type === 'BOTH').length}</p>
                   </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card className="border-2 border-border/50">
        <CardHeader className="border-b border-border/50">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/60" />
              <Input 
                placeholder="Search name, phone, email..." 
                className="pl-10 h-11 rounded-xl border-border bg-muted/20" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
              />
            </div>
            
            <div className="flex gap-2 w-full md:w-auto shrink-0">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 h-11 w-full sm:w-[150px] text-sm rounded-xl border-border border bg-muted/20 text-foreground font-bold focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer hover:bg-muted/30 shadow-sm"
              >
                <option value="ALL">All Sources</option>
                <option value="STOREFRONT">Storefront</option>
                <option value="INSTORE">In-Store</option>
                <option value="BOTH">Both</option>
              </select>
              <div className="relative w-full sm:w-auto">
                <ArrowUpDown className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/60" />
                <select
                  value={`${sortKey}-${sortOrder}`}
                  onChange={(e) => {
                    const [newKey, newOrder] = e.target.value.split('-');
                    setSortKey(newKey as SortKey);
                    setSortOrder(newOrder as 'asc' | 'desc');
                  }}
                  className="pl-10 pr-8 h-11 w-full sm:w-[200px] text-sm rounded-xl border-border border bg-muted/20 text-foreground font-bold focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer hover:bg-muted/30 shadow-sm"
                >
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                  <option value="loyalty-desc">Highest Loyalty</option>
                  <option value="loyalty-asc">Lowest Loyalty</option>
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                </select>
                <div className="absolute right-3.5 top-4 pointer-events-none text-muted-foreground/60">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 py-0">
          {isLoading ? (
            <div className="space-y-0">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-6 p-5 border-b border-border last:border-0 bg-muted/5">
                  <Skeleton className="h-10 w-10 rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-9 rounded-xl" />
                    <Skeleton className="h-9 w-9 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="max-h-[calc(100vh-200px)] overflow-x-auto">
              <table className="w-full text-sm text-left align-middle">
                <thead className="sticky top-0 bg-muted text-xs uppercase font-bold text-muted-foreground/70 z-20">
                  <tr>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Contact Details</th>
                    <th className="px-6 py-4">Origin</th>
                    <th className="px-6 py-4">Status & Loyalty</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {processed.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-medium italic">No customers found.</td></tr>
                  ) : processed.map((c: Customer) => (
                    <tr key={c.id} className="hover:bg-primary/5 transition-all group">
                      <td className="p-5">
                        <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-2xl flex items-center justify-center font-bold shadow-sm ${
                            c.type === 'ONLINE' ? 'bg-info/20 text-info' : 
                            c.type === 'BOTH' ? 'bg-warning/20 text-warning' :
                            'bg-success/20 text-success'
                          }`}>
                            {c.name.charAt(0)}
                          </div>
                          <div>
                             <p className="font-bold text-foreground text-base">{c.name}</p>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-muted-foreground font-mono">ID:</span>
                                <CopyableId id={c.id} className="scale-75 origin-left" />
                              </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="space-y-1.5 focus-within:ring-0">
                          {c.phone ? (
                            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                              <Phone className="h-3 w-3 text-primary" /> {c.phone}
                            </div>
                          ) : <span className="text-xs text-muted-foreground/40 italic">No phone</span>}
                          {c.email ? (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" /> {c.email}
                            </div>
                          ) : <span className="text-xs text-muted-foreground/40 italic">No email</span>}
                        </div>
                      </td>
                      <td className="p-5">
                        <Badge variant="outline" className={`rounded-lg py-1 flex items-center gap-1.5 w-fit font-bold ${
                          c.type === 'ONLINE' ? 'border-info/30 bg-info/5 text-info' : 
                          c.type === 'BOTH' ? 'border-warning/30 bg-warning/5 text-warning' :
                          'border-success/30 bg-success/5 text-success'
                        }`}>
                          {c.type === 'ONLINE' ? <Monitor className="h-3 w-3" /> : 
                           c.type === 'BOTH' ? <Layers className="h-3 w-3" /> :
                           <Store className="h-3 w-3" />}
                          {c.type === 'ONLINE' ? 'Storefront' : 
                           c.type === 'BOTH' ? 'Both' :
                           'In-Store'}
                        </Badge>
                      </td>
                      <td className="p-5">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 font-bold text-warning bg-warning/10 w-fit px-2 py-1 rounded-lg text-sm border border-warning/20">
                            <Award className="h-4 w-4" /> {c.loyalty_points || 0} pts
                          </div>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-bold">
                            <Calendar className="h-2.5 w-2.5" /> Joined {new Date(c.created_at || '').toLocaleDateString()}
                          </p>
                        </div>
                      </td>
                      <td className="pr-0 p-5 text-right">
                        <div className="flex justify-around">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className={`h-10 w-10 p-0 rounded-xl bg-muted/30 hover:bg-info/20 text-info ${(c.type === 'ONLINE' || c.type === 'BOTH') ? 'opacity-20 cursor-not-allowed' : ''}`} 
                            onClick={() => handleEditOpen(c)}
                            disabled={c.type === 'ONLINE' || c.type === 'BOTH'}
                          >
                            <Edit className="h-4.5 w-4.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className={`h-10 w-10 p-0 rounded-xl bg-muted/30 hover:bg-destructive/10 text-destructive ${(c.type === 'ONLINE' || c.type === 'BOTH') ? 'opacity-20 cursor-not-allowed' : ''}`} 
                            onClick={() => handleDelete(c)}
                            disabled={c.type === 'ONLINE' || c.type === 'BOTH'}
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Register POS Customer">
        <form onSubmit={handleAdd} className="space-y-4">
          <Input label="Short Name / Label" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Regular John" />
          <Input label="Phone Number" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+234..." />
          <Input label="Email Address" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="john@example.com" />
          <div className="flex justify-end gap-3 pt-6 border-t border-border mt-6">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="rounded-xl">Cancel</Button>
            <Button type="submit" disabled={isSaving} className="rounded-xl font-bold min-w-[120px]">
              {isSaving ? 'Creating...' : 'Register'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit POS Customer Profile">
        <form onSubmit={handleUpdate} className="space-y-4">
          <Input label="Short Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <Input label="Phone Number" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          <Input label="Email Address" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <div className="flex justify-end gap-3 pt-6 border-t border-border mt-6">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="rounded-xl">Cancel</Button>
            <Button type="submit" disabled={isSaving} className="rounded-xl font-bold min-w-[120px]">
              {isSaving ? 'Saving...' : 'Update Record'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

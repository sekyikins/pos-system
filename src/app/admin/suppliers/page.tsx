'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Supplier } from '@/lib/types';
import { getSuppliers, addSupplier, updateSupplier, deleteSupplier } from '@/lib/db';
import { useToastStore } from '@/lib/store';
import { Plus, Search, Edit, Trash2, Truck, User, Phone, Mail, MapPin, Wifi, WifiOff, ArrowUpDown, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRealtimeTable, ConnectionStatus } from '@/hooks/useRealtimeTable';

type SortKey = 'name' | 'contact' | 'date';

function ConnBadge({ status }: { status: ConnectionStatus }) {
  if (status === 'connected') return <span className="flex items-center gap-1.5 text-[10px] font-bold text-success"><Wifi className="h-3 w-3" /> Live</span>;
  if (status === 'error' || status === 'disconnected') return <span className="flex items-center gap-1.5 text-[10px] font-bold text-destructive"><WifiOff className="h-3 w-3" /> Offline</span>;
  return <span className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground"><span className="h-2 w-2 rounded-full bg-primary animate-pulse" /> Syncing</span>;
}

export default function SuppliersPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const { addToast } = useToastStore();
  const [form, setForm] = useState({ name: '', contactPerson: '', email: '', phone: '', address: '' });

  const { data: suppliers, isLoading, connectionStatus, refetch } = useRealtimeTable<Supplier>({
    table: 'suppliers',
    initialData: [],
    fetcher: getSuppliers,
  });

  const processed = useMemo(() => {
    const filtered = suppliers.filter(s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return [...filtered].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (sortKey === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (sortKey === 'contact') {
        valA = a.contactPerson?.toLowerCase() || '';
        valB = b.contactPerson?.toLowerCase() || '';
      } else if (sortKey === 'date') {
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [suppliers, searchQuery, sortKey, sortOrder]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    setIsSaving(true);
    try {
      await addSupplier(form);
      addToast('Supplier added successfully', 'success');
      await refetch();
      setIsAddOpen(false);
      setForm({ name: '', contactPerson: '', email: '', phone: '', address: '' });
    } catch { addToast('Failed to add supplier', 'error'); }
    finally { setIsSaving(false); }
  };

  const handleEditOpen = (s: Supplier) => {
    setEditingSupplier(s);
    setForm({ 
      name: s.name, 
      contactPerson: s.contactPerson || '', 
      email: s.email || '', 
      phone: s.phone || '', 
      address: s.address || '' 
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;
    setIsSaving(true);
    try {
      await updateSupplier(editingSupplier.id, form);
      addToast('Supplier updated', 'success');
      await refetch();
      setIsEditOpen(false);
    } catch { addToast('Failed to update', 'error'); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return;
    try {
      await deleteSupplier(id);
      addToast('Supplier deleted', 'info');
      await refetch();
    } catch { addToast('Failed to delete supplier', 'error'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Truck className="h-8 w-8 text-primary" />
            Supplier Management
          </h1>
          <p className="text-sm text-muted-foreground font-medium">Manage your product vendors and contact details</p>
        </div>
        <div className="flex items-center gap-3">
          <ConnBadge status={connectionStatus} />
          <Button onClick={() => setIsAddOpen(true)} className="gap-2 shrink-0 font-bold rounded-xl shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4" /> Add Supplier
          </Button>
        </div>
      </div>

      <Card className="border-2 border-border/50">
        <CardHeader className="pb-0 border-b border-border/50">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pb-6">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/60" />
              <Input 
                placeholder="Search suppliers..." 
                className="pl-10 h-11 rounded-xl border-border bg-muted/20" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
              />
            </div>
            
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1">
               <Button 
                 variant={sortKey === 'name' ? 'primary' : 'ghost'} 
                 size="sm" 
                 onClick={() => toggleSort('name')}
                 className="whitespace-nowrap rounded-lg"
               >
                 <ArrowUpDown className="h-3 w-3 mr-1.5" /> Name {sortKey === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
               </Button>
               <Button 
                variant={sortKey === 'contact' ? 'primary' : 'ghost'} 
                size="sm" 
                onClick={() => toggleSort('contact')}
                className="whitespace-nowrap rounded-lg"
               >
                 <User className="h-3 w-3 mr-1.5" /> Contact {sortKey === 'contact' && (sortOrder === 'asc' ? '↑' : '↓')}
               </Button>
               <Button 
                variant={sortKey === 'date' ? 'primary' : 'ghost'} 
                size="sm" 
                onClick={() => toggleSort('date')}
                className="whitespace-nowrap rounded-lg"
               >
                 <Calendar className="h-3 w-3 mr-1.5" /> Date {sortKey === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
               </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-0">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-6 p-5 border-b border-border last:border-0 bg-muted/5">
                  <Skeleton className="h-10 w-10 rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-4 w-32" />
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-9 rounded-xl" />
                    <Skeleton className="h-9 w-9 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left align-middle">
                <thead className="bg-muted/30 text-xs uppercase font-bold text-muted-foreground/70">
                  <tr>
                    <th className="px-6 py-4">Supplier</th>
                    <th className="px-6 py-4">Contact Person</th>
                    <th className="px-6 py-4">Contact Details</th>
                    <th className="px-6 py-4">Address</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {processed.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-medium italic">No suppliers found.</td></tr>
                  ) : processed.map((s: Supplier) => (
                    <tr key={s.id} className="hover:bg-primary/5 transition-all group">
                      <td className="p-5">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-2xl bg-primary/20 text-primary flex items-center justify-center font-bold">
                            {s.name.charAt(0)}
                          </div>
                          <div>
                             <p className="font-bold text-foreground text-base">{s.name}</p>
                             <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter">REG: {s.id.slice(0,8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center gap-2 font-bold text-foreground">
                          <User className="h-4 w-4 text-primary/60" />
                          {s.contactPerson || <span className="text-muted-foreground/40 italic">Not set</span>}
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="space-y-1">
                          {s.email && (
                            <div className="flex items-center gap-2 text-xs font-medium">
                              <Mail className="h-3 w-3 text-muted-foreground" /> {s.email}
                            </div>
                          )}
                          {s.phone && (
                            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                              <Phone className="h-3 w-3 text-primary" /> {s.phone}
                            </div>
                          )}
                          {!s.email && !s.phone && <span className="text-xs text-muted-foreground/40 italic">No contact info</span>}
                        </div>
                      </td>
                      <td className="p-5">
                         <div className="flex items-start gap-2 max-w-[200px]">
                           <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                           <p className="text-xs text-muted-foreground line-clamp-2">{s.address || 'No address provided'}</p>
                         </div>
                      </td>
                      <td className="pr-0 p-5 text-right">
                        <div className="flex justify-around gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-10 w-10 p-0 rounded-xl bg-muted/30 hover:bg-info/20 text-info" 
                            onClick={() => handleEditOpen(s)}
                          >
                            <Edit className="h-4.5 w-4.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-10 w-10 p-0 rounded-xl bg-muted/30 hover:bg-destructive/10 text-destructive" 
                            onClick={() => handleDelete(s.id)}
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
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add New Supplier">
        <form onSubmit={handleAdd} className="space-y-4">
          <Input label="Supplier Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Acme Corp" />
          <Input label="Contact Person" value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} placeholder="John Doe" />
          <div className="grid grid-cols-2 gap-4">
             <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="contact@supplier.com" />
             <Input label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+234..." />
          </div>
          <Input label="Business Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="123 Street, City" />
          <div className="flex justify-end gap-3 pt-6 border-t border-border mt-6">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="rounded-xl">Cancel</Button>
            <Button type="submit" disabled={isSaving} className="rounded-xl font-bold min-w-[120px]">
              {isSaving ? 'Saving...' : 'Add Supplier'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Supplier Record">
        <form onSubmit={handleUpdate} className="space-y-4">
          <Input label="Supplier Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <Input label="Contact Person" value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
             <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
             <Input label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <Input label="Business Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          <div className="flex justify-end gap-3 pt-6 border-t border-border mt-6">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="rounded-xl">Cancel</Button>
            <Button type="submit" disabled={isSaving} className="rounded-xl font-bold min-w-[120px]">
              {isSaving ? 'Updating...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

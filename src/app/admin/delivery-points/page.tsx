'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { DeliveryPoint } from '@/lib/types';
import { getDeliveryPoints, addDeliveryPoint, updateDeliveryPoint, deleteDeliveryPoint } from '@/lib/db';
import { useToastStore } from '@/lib/store';
import { Plus, Search, Edit, Trash2, Loader2, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';

export default function DeliveryPointsPage() {
  const [points, setPoints] = useState<DeliveryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState<DeliveryPoint | null>(null);
  const { addToast } = useToastStore();

  const [form, setForm] = useState({ name: '', address: '', active: true });

  const load = async () => {
    setIsLoading(true);
    try { setPoints(await getDeliveryPoints()); } finally { setIsLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = points.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.address) return;
    setIsSaving(true);
    try {
      await addDeliveryPoint(form.name, form.address, form.active);
      addToast('Delivery point created', 'success');
      await load();
      setIsAddOpen(false);
      setForm({ name: '', address: '', active: true });
    } catch { addToast('Failed to create delivery point', 'error'); }
    finally { setIsSaving(false); }
  };

  const handleEditOpen = (p: DeliveryPoint) => {
    setEditingPoint(p);
    setForm({ name: p.name, address: p.address, active: p.active });
    setIsEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPoint) return;
    setIsSaving(true);
    try {
      await updateDeliveryPoint(editingPoint.id, form.name, form.address, form.active);
      addToast('Delivery point updated', 'success');
      await load();
      setIsEditOpen(false);
    } catch { addToast('Failed to update', 'error'); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (p: DeliveryPoint) => {
    if (!window.confirm(`Delete delivery point "${p.name}"?`)) return;
    try {
      await deleteDeliveryPoint(p.id);
      addToast('Delivery point deleted', 'info');
      await load();
    } catch { addToast('Failed to delete (may be in use)', 'error'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 tracking-tight">
            <MapPin className="h-8 w-8 text-primary" />
            Logistical Points
          </h1>
          <p className="text-sm text-muted-foreground font-medium">Manage E-commerce pickup locations and physical branch points</p>
        </div>
        <Button onClick={() => { setForm({ name: '', address: '', active: true }); setIsAddOpen(true); }} className="gap-2 shrink-0 font-bold rounded-xl shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4" /> Add Location
        </Button>
      </div>

      <Card className="border-2 border-border/50 overflow-hidden">
        <CardHeader className="pb-0 border-b border-border/50">
          <div className="flex items-center gap-2 pb-6">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/60" />
              <Input 
                placeholder="Search locations..." 
                className="pl-10 h-11 rounded-xl border-border bg-muted/20" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-0.5">
               {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-6 px-6 py-5 border-b border-border last:border-0 bg-muted/5">
                  <Skeleton className="h-10 w-10 rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-lg" />
                  <div className="flex gap-2">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <Skeleton className="h-10 w-10 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left align-middle font-medium">
                <thead className="bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground/70 border-b border-border/50">
                  <tr>
                    <th className="px-6 py-4">Location Detail</th>
                    <th className="px-6 py-4">Address</th>
                    <th className="px-6 py-4 text-center">Operational Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-muted-foreground font-medium italic">No delivery points found.</td></tr>
                  ) : filtered.map(p => (
                    <tr key={p.id} className="hover:bg-primary/5 transition-all group">
                      <td className="p-5">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 shadow-sm border border-primary/10 transition-transform group-hover:scale-110">
                            <MapPin className="h-5 w-5" />
                          </div>
                          <p className="font-bold text-foreground text-base tracking-tight">{p.name}</p>
                        </div>
                      </td>
                      <td className="p-5 text-muted-foreground/80 font-medium">
                         <span className="text-sm truncate block max-w-xs">{p.address}</span>
                      </td>
                      <td className="p-5 text-center">
                        {p.active ? (
                          <Badge variant="outline" className="rounded-lg bg-success/5 text-success border-success/20 font-bold text-[10px] uppercase px-2.5 py-1">Online</Badge>
                        ) : (
                          <Badge variant="outline" className="rounded-lg bg-muted text-muted-foreground border-border font-bold text-[10px] uppercase px-2.5 py-1">Offline</Badge>
                        )}
                      </td>
                      <td className="p-5 text-right">
                        <div className="flex justify-around">
                          <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl bg-muted/50 text-info hover:bg-info/20" onClick={() => handleEditOpen(p)}>
                            <Edit className="h-4.5 w-4.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-destructive rounded-xl bg-muted/50 hover:bg-destructive/10" onClick={() => handleDelete(p)}>
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

      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Register Logistical Point">
        <form onSubmit={handleAdd} className="space-y-4">
          <Input label="Site Name" placeholder="e.g. North Side Distribution" className="rounded-xl h-11 bg-muted/5 font-bold" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Physical Address" placeholder="Street, City, coordinates..." className="rounded-xl h-11 bg-muted/5 font-bold" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
          
          <div className="flex items-center gap-3 p-4 bg-muted/20 rounded-2xl border-2 border-border/50">
            <input 
              type="checkbox" 
              id="activeAdd" 
              checked={form.active} 
              onChange={(e) => setForm({ ...form, active: e.target.checked })} 
              className="h-5 w-5 rounded-lg border-primary accent-primary"
            />
            <label htmlFor="activeAdd" className="text-sm font-bold uppercase tracking-widest text-muted-foreground cursor-pointer select-none">
              Mark as Operational
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-border mt-6">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSaving} className="rounded-xl font-bold h-11 px-6">Discard</Button>
            <Button type="submit" disabled={isSaving} className="rounded-xl font-bold min-w-[200px] h-11 shadow-lg shadow-primary/20">
              {isSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Initializing...</> : 'Launch Point'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={`Configure Point: ${editingPoint?.name}`}>
        <form onSubmit={handleUpdate} className="space-y-4">
          <Input label="Site Name" className="rounded-xl h-11 bg-muted/5 font-bold" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Address" className="rounded-xl h-11 bg-muted/5 font-bold" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
          
          <div className="flex items-center gap-3 p-4 bg-muted/20 rounded-2xl border-2 border-border/50">
            <input 
              type="checkbox" 
              id="activeEdit" 
              checked={form.active} 
              onChange={(e) => setForm({ ...form, active: e.target.checked })} 
              className="h-5 w-5 rounded-lg border-primary accent-primary"
            />
            <label htmlFor="activeEdit" className="text-sm font-bold uppercase tracking-widest text-muted-foreground cursor-pointer select-none">
              Operational Status (Active)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-border mt-6">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSaving} className="rounded-xl font-bold h-11 px-6">Cancel</Button>
            <Button type="submit" disabled={isSaving} className="rounded-xl font-bold min-w-[200px] h-11 shadow-lg shadow-primary/20">
              {isSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Updating...</> : 'Save Core Changes'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}


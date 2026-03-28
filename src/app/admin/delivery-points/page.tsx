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
          <h1 className="text-3xl font-bold tracking-tight">Delivery Points</h1>
          <p className="text-sm text-muted-foreground">Manage E-commerce pickup locations</p>
        </div>
        <Button onClick={() => { setForm({ name: '', address: '', active: true }); setIsAddOpen(true); }} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Add Location
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/60" />
            <Input placeholder="Search locations..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="rounded-xl border border-border overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/90 text-xs uppercase font-semibold text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-6 py-3">Location Name</th>
                    <th className="px-6 py-3">Address</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">No locations found.</td></tr>
                  ) : filtered.map(p => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" /> {p.name}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{p.address}</td>
                      <td className="px-6 py-4">
                        {p.active ? (
                          <Badge variant="outline" className="border-success/50 text-success">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="border-muted-foreground text-muted-foreground">Inactive</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="mdh" className="h-8 w-8 p-0" onClick={() => handleEditOpen(p)}>
                            <Edit className="h-4 w-4 text-info" />
                          </Button>
                          <Button variant="ghost" size="mdh" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(p)}>
                            <Trash2 className="h-4 w-4" />
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

      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add Delivery Point">
        <form onSubmit={handleAdd} className="space-y-4">
          <Input label="Name" placeholder="e.g. Main Branch" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Address" placeholder="Full street address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
          <div className="flex items-center gap-2 mt-4">
            <input 
              type="checkbox" 
              id="activeAdd" 
              checked={form.active} 
              onChange={(e) => setForm({ ...form, active: e.target.checked })} 
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="activeAdd" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Active Location
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Delivery Point">
        <form onSubmit={handleUpdate} className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
          <div className="flex items-center gap-2 mt-4">
            <input 
              type="checkbox" 
              id="activeEdit" 
              checked={form.active} 
              onChange={(e) => setForm({ ...form, active: e.target.checked })} 
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="activeEdit" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Active Location
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

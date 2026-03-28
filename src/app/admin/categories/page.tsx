'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Category } from '@/lib/types';
import { getCategories, addCategory, updateCategory, deleteCategory } from '@/lib/db';
import { useToastStore } from '@/lib/store';
import { Plus, Search, Edit, Trash2, Package, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';

export default function CategoriesPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { addToast } = useToastStore();

  const { data: categories, isLoading, refetch } = useRealtimeTable<Category>({
    table: 'category',
    initialData: [],
    fetcher: getCategories,
    refetchOnChange: true
  });

  const [form, setForm] = useState({ name: '', description: '' });

  const filtered = categories.filter((c: Category) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    setIsSaving(true);
    try {
      await addCategory(form.name, form.description);
      addToast('Category created successfully', 'success');
      refetch();
      setIsAddOpen(false);
      setForm({ name: '', description: '' });
    } catch { addToast('Failed to create category', 'error'); }
    finally { setIsSaving(false); }
  };

  const handleEditOpen = (c: Category) => {
    setEditingCategory(c);
    setForm({ name: c.name, description: c.description || '' });
    setIsEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    setIsSaving(true);
    try {
      await updateCategory(editingCategory.id, form.name, form.description);
      addToast('Category updated', 'success');
      refetch();
      setIsEditOpen(false);
    } catch { addToast('Failed to update', 'error'); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (c: Category) => {
    if (!window.confirm(`Delete category "${c.name}"?`)) return;
    try {
      await deleteCategory(c.id);
      addToast('Category deleted', 'info');
      refetch();
    } catch { addToast('Failed to delete category (it may be in use)', 'error'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 tracking-tight">
            <Package className="h-8 w-8 text-primary" />
            Product Categories
          </h1>
          <p className="text-sm text-muted-foreground font-medium">Classify your inventory for better organization</p>
        </div>
        <Button onClick={() => { setForm({ name: '', description: '' }); setIsAddOpen(true); }} className="gap-2 shrink-0 font-bold rounded-xl shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4" /> Add Category
        </Button>
      </div>

      <Card className="border-2 border-border/50 overflow-hidden">
        <CardHeader className="pb-0 border-b border-border/50">
          <div className="flex items-center gap-2 pb-6">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/60" />
              <Input 
                placeholder="Search categories..." 
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
                    <th className="px-6 py-4">Category Details</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={3} className="px-6 py-12 text-center text-muted-foreground font-medium italic">No categories matched.</td></tr>
                  ) : filtered.map(c => (
                    <tr key={c.id} className="hover:bg-primary/5 transition-all group">
                      <td className="p-5">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 shadow-sm border border-primary/10 transition-transform group-hover:scale-110">
                            {c.name.charAt(0)}
                          </div>
                          <p className="font-bold text-foreground text-base tracking-tight">{c.name}</p>
                        </div>
                      </td>
                      <td className="p-5 text-muted-foreground/80 font-medium">{c.description || <span className="text-xs italic opacity-40">No description provided</span>}</td>
                      <td className="p-5 text-right">
                        <div className="flex justify-around">
                          <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl bg-muted/50 text-info hover:bg-info/20" onClick={() => handleEditOpen(c)}>
                            <Edit className="h-4.5 w-4.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-destructive rounded-xl bg-muted/50 hover:bg-destructive/10" onClick={() => handleDelete(c)}>
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

      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create Category">
        <form onSubmit={handleAdd} className="space-y-4">
          <Input label="Category Name" placeholder="e.g. Beverages" className="rounded-xl h-11 bg-muted/5 font-bold" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div className="space-y-1.5">
             <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Detail Description</label>
             <textarea 
               placeholder="Enter a brief context for this category..."
               className="w-full min-h-[100px] p-4 rounded-xl border-2 border-border bg-card text-sm font-bold focus:outline-none focus:border-primary transition-all shadow-sm"
               value={form.description} 
               onChange={(e) => setForm({ ...form, description: e.target.value })} 
             />
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-border mt-6">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSaving} className="rounded-xl font-bold h-11 px-6">Discard</Button>
            <Button type="submit" disabled={isSaving} className="rounded-xl font-bold min-w-[180px] h-11 shadow-lg shadow-primary/20">
              {isSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating...</> : 'Launch Category'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={`Update Category: ${editingCategory?.name}`}>
        <form onSubmit={handleUpdate} className="space-y-4">
          <Input label="Category Name" className="rounded-xl h-11 bg-muted/5 font-bold" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div className="space-y-1.5">
             <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Description</label>
             <textarea 
               className="w-full min-h-[100px] p-4 rounded-xl border-2 border-border bg-card text-sm font-bold focus:outline-none focus:border-primary transition-all shadow-sm"
               value={form.description} 
               onChange={(e) => setForm({ ...form, description: e.target.value })} 
             />
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-border mt-6">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSaving} className="rounded-xl font-bold h-11 px-6">Cancel</Button>
            <Button type="submit" disabled={isSaving} className="rounded-xl font-bold min-w-[180px] h-11 shadow-lg shadow-primary/20">
              {isSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : 'Confirm Updates'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

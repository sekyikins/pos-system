'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Category } from '@/lib/types';
import { getCategories, addCategory, updateCategory, deleteCategory } from '@/lib/db';
import { useToastStore } from '@/lib/store';
import { Plus, Search, Edit, Trash2, Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { addToast } = useToastStore();

  const [form, setForm] = useState({ name: '', description: '' });

  const load = async () => {
    setIsLoading(true);
    try { setCategories(await getCategories()); } finally { setIsLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = categories.filter(c =>
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
      await load();
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
      await load();
      setIsEditOpen(false);
    } catch { addToast('Failed to update', 'error'); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (c: Category) => {
    if (!window.confirm(`Delete category "${c.name}"?`)) return;
    try {
      await deleteCategory(c.id);
      addToast('Category deleted', 'info');
      await load();
    } catch { addToast('Failed to delete category (it may be in use)', 'error'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground">Manage product categories</p>
        </div>
        <Button onClick={() => { setForm({ name: '', description: '' }); setIsAddOpen(true); }} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Add Category
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/60" />
            <Input placeholder="Search categories..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-border last:border-0">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-5 w-1/2" />
                  <div className="flex gap-2 ml-auto">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/90 text-xs uppercase font-semibold text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">No categories found.</td></tr>
                  ) : filtered.map(c => (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" /> {c.name}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{c.description || '-'}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="md" className="h-8 w-8 p-0" onClick={() => handleEditOpen(c)}>
                            <Edit className="h-4 w-4 text-info" />
                          </Button>
                          <Button variant="ghost" size="md" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(c)}>
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

      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add Category">
        <form onSubmit={handleAdd} className="space-y-4">
          <Input label="Category Name" placeholder="e.g. Beverages" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Description" placeholder="Optional brief description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Category">
        <form onSubmit={handleUpdate} className="space-y-4">
          <Input label="Category Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

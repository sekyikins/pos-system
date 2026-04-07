'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Product, Category, Supplier } from '@/lib/types';
import { getProducts, addProduct, updateProduct, deleteProduct, getCategories, getSuppliers, addCategory, addSupplier } from '@/lib/db';
import { useToastStore, useSettingsStore } from '@/lib/store';
import { Plus, Search, Edit, Trash2, Loader2, Upload, ImageIcon, Boxes, Barcode, Truck, Tag } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import { LiveStatus } from '@/components/ui/LiveStatus';

export default function ProductsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<'name' | 'category' | 'price' | 'stock'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  
  const [newCatName, setNewCatName] = useState('');
  const [newSupName, setNewSupName] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { addToast } = useToastStore();
  const { currencySymbol } = useSettingsStore();

  const [formData, setFormData] = useState({
    name: '',
    categoryId: '', // Using this for both display name and selection logic in datalists
    category: '',
    price: '',
    quantity: '',
    barcode: '',
    description: '',
    supplierId: '',
    supplierName: '',
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fetchSupportingData = useCallback(async () => {
    try {
      const [cats, sups] = await Promise.all([getCategories(), getSuppliers()]);
      setCategories(cats);
      setSuppliers(sups);
    } catch (err) {
      console.error('Failed to fetch support data:', err);
    }
  }, []);

  useEffect(() => {
    fetchSupportingData();
  }, [fetchSupportingData]);

  const { data: products, isLoading, connectionStatus, refetch } = useRealtimeTable<Product>({
    table: 'products',
    initialData: [],
    fetcher: getProducts,
    refetchOnChange: true
  });

  const processedProducts = useMemo(() => {
    const filtered = products.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return [...filtered].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (sortKey === 'name') { valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); }
      else if (sortKey === 'category') { valA = (a.category || '').toLowerCase(); valB = (b.category || '').toLowerCase(); }
      else if (sortKey === 'price') { valA = a.price; valB = b.price; }
      else if (sortKey === 'stock') { valA = a.quantity; valB = b.quantity; }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [products, searchQuery, sortKey, sortOrder]);

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        categoryId: product.category, // In your datalist implementation, category name is used
        category: product.category,
        price: product.price.toString(),
        quantity: product.quantity.toString(),
        barcode: product.barcode,
        description: product.description || '',
        supplierId: product.supplierId || '',
        supplierName: product.supplierName || '',
      });
      setPreviewUrl(product.image_url || null);
    } else {
      setEditingProduct(null);
      setFormData({
        name: '', categoryId: '', category: '', price: '', quantity: '',
        barcode: '', description: '', supplierId: '', supplierName: '',
      });
      setPreviewUrl(null);
      setSelectedFile(null);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    setIsAddingNew(true);
    try {
      const cat = await addCategory(newCatName, '');
      await fetchSupportingData();
      setFormData(prev => ({ ...prev, categoryId: cat.name, category: cat.name }));
      setIsCategoryModalOpen(false);
      setNewCatName('');
      addToast('Category added successfully', 'success');
    } catch {
      addToast('Failed to add category', 'error');
    } finally {
      setIsAddingNew(false);
    }
  };

  const handleAddSupplier = async () => {
    if (!newSupName.trim()) return;
    setIsAddingNew(true);
    try {
      const sup = await addSupplier({ name: newSupName, contactPerson: null, email: null, phone: null, address: null });
      await fetchSupportingData();
      setFormData(prev => ({ ...prev, supplierId: sup.id, supplierName: sup.name }));
      setIsSupplierModalOpen(false);
      setNewSupName('');
      addToast('Supplier added successfully', 'success');
    } catch {
      addToast('Failed to add supplier', 'error');
    } finally {
      setIsAddingNew(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Find actual category object from the name in categoryId if possible
      const selectedCat = categories.find(c => c.name === formData.categoryId);
      const submissionData = {
        ...formData,
        categoryId: selectedCat?.id || undefined,
        category: formData.categoryId, // Ensure the name matches the datalist input
        price: Number(formData.price),
        quantity: Number(formData.quantity),
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, submissionData, undefined, selectedFile || undefined);
        addToast('Product updated', 'success');
      } else {
        await addProduct(submissionData, selectedFile || undefined);
        addToast('Product added', 'success');
      }
      setIsModalOpen(false);
      refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      addToast(message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
        await deleteProduct(id);
        addToast('Product deleted', 'success');
        refetch();
    } catch {
        addToast('Failed to delete', 'error');
    }
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
            <h1 className="text-3xl font-bold flex items-center gap-2 tracking-tight">
              <Boxes className="h-8 w-8 text-primary" />
              Products
            </h1>
            <p className="text-sm text-muted-foreground font-medium">Manage your store inventory and catalog</p>
          </div>
        )}
        <div className="flex items-center gap-4">
          <LiveStatus status={connectionStatus} />
          <Button onClick={() => handleOpenModal()} className="gap-2 shrink-0 h-11 px-6 rounded-xl font-bold shadow-lg shadow-primary/20" disabled={isLoading}>
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>

      <Card className="border-2 border-border/50 overflow-hidden">
        <CardHeader className="pb-0 border-b border-border/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/60" />
              <Input 
                placeholder="Search products, categories, barcodes..." 
                className="pl-10 h-11 rounded-xl border-border bg-muted/20" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
              />
            </div>
            <div className="relative w-full sm:w-auto shrink-0">
              <select
                value={`${sortKey}-${sortOrder}`}
                onChange={(e) => {
                  const [newKey, newOrder] = e.target.value.split('-');
                  setSortKey(newKey as 'name' | 'category' | 'price' | 'stock');
                  setSortOrder(newOrder as 'asc' | 'desc');
                }}
                className="px-4 pr-8 h-11 w-full sm:w-[200px] text-sm rounded-xl border-border border bg-muted/20 text-foreground font-bold focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer hover:bg-muted/30 shadow-sm"
              >
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="category-asc">Category (A-Z)</option>
                <option value="category-desc">Category (Z-A)</option>
                <option value="price-asc">Lowest Price</option>
                <option value="price-desc">Highest Price</option>
                <option value="stock-asc">Lowest Stock</option>
                <option value="stock-desc">Highest Stock</option>
              </select>
              <div className="absolute right-3.5 top-3.5 pointer-events-none text-muted-foreground/60">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-1">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-5 border-b border-border last:border-0 bg-muted/5">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-32" />
                  <div className="flex gap-2 ml-auto">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left align-middle font-medium">
                <thead className="bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground/70 border-b border-border/50">
                  <tr>
                    <th className="p-5">Product</th>
                    <th className="p-5">Category</th>
                    <th className="p-5">Price</th>
                    <th className="p-5">Stock Status</th>
                    <th className="p-5">Supplier</th>
                    <th className="p-5">Barcode</th>
                    <th className="p-5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {processedProducts.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">No products found.</td></tr>
                  ) : (
                    processedProducts.map((product: Product) => (
                      <tr key={product.id} className="hover:bg-primary/5 transition-all group">
                        <td className="p-3">
                          <div className="flex items-center gap-4">
                            <div className="relative h-10 w-10 rounded-xl bg-muted flex items-center justify-center overflow-hidden border border-border shrink-0 shadow-sm">
                              {product.image_url ? (
                                <Image src={product.image_url} alt={product.name} fill className="object-cover" />
                              ) : (
                                <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
                              )}
                            </div>
                            <div>
                               <p className="font-semibold text-foreground tracking-tight">{product.name}</p>
                               <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/50 px-1.5 py-0.5 rounded">#{product.id.slice(0,8)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="rounded-lg bg-indigo-500/5 text-indigo-500 border-indigo-500/20 font-bold px-2.5 py-1">
                            {product.category}
                          </Badge>
                        </td>
                        <td className="p-3 font-bold text-base text-primary">
                          {currencySymbol}{product.price.toFixed(2)}
                        </td>
                        <td className="p-3">
                            <div className="flex justify-center">
                              {product.quantity === 0 ? (
                              <Badge variant="destructive" className="px-2.5 py-1 text-[15px] font-bold">{product.quantity}</Badge>
                            ) : product.quantity <= 10 ? (
                              <Badge variant="destructive" className="px-2.5 py-1 text-[15px] font-bold bg-orange-500 hover:bg-orange-600">{product.quantity}</Badge>
                            ) : (
                              <Badge className="px-2.5 py-1 text-[15px] font-bold bg-success text-white hover:bg-success/90">{product.quantity}</Badge>
                            )}
                            </div>
                        </td>
                        <td className="p-3">
                           {product.supplierName ? (
                             <div className="flex items-center gap-2">
                               <Truck className="h-3.5 w-3.5 text-muted-foreground/60" />
                               <span className="text-sm font-semibold text-muted-foreground">{product.supplierName}</span>
                             </div>
                           ) : (
                             <span className="text-xs italic text-muted-foreground/50 font-medium">No supplier</span>
                           )}
                        </td>
                        <td className="p-3 font-mono text-[14px] text-muted-foreground font-semibold tracking-tighter">
                          {product.barcode}
                        </td>
                        <td className="p-5 pr-0">
                          <div className="flex justify-end gap-3">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenModal(product)} className="h-10 w-10 p-0 rounded-xl bg-muted/50 text-info hover:bg-info/20">
                              <Edit className="h-4.5 w-4.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id, product.name)} className="h-10 w-10 p-0 text-destructive rounded-xl bg-muted/50 hover:bg-destructive/10">
                              <Trash2 className="h-4.5 w-4.5" />
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

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingProduct ? 'Update Product Entry' : 'Register New Product'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="overflow-hidden bg-muted/20 border-2 border-dashed border-border rounded-2xl hover:bg-muted/30 transition-all cursor-pointer relative group flex items-center justify-center min-h-[160px]">
            {previewUrl ? (
              <div className="relative h-48 w-full">
                <Image src={previewUrl} alt="Preview" fill className="object-contain p-2" unoptimized />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <p className="text-white text-[10px] font-bold uppercase bg-black/50 px-3 py-1.5 rounded-full flex items-center gap-2 tracking-widest">
                    <Upload className="h-3 w-3" /> Change Representation
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-6">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-all duration-300">
                  <Upload className="h-7 w-7" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold uppercase tracking-wider">Product Visual</p>
                  <p className="text-[10px] text-muted-foreground font-bold">WEBP, PNG, JPG (MAX 5MB)</p>
                </div>
              </div>
            )}
            <input 
              type="file" 
              accept="image/*" 
              className="absolute inset-0 opacity-0 cursor-pointer" 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setSelectedFile(file);
                  setPreviewUrl(URL.createObjectURL(file));
                }
              }} 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="md:col-span-2">
                <Input 
                  label="Display Name" 
                  placeholder="e.g. Premium Wireless Headphones"
                  className="rounded-xl h-11"
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  required 
                />
             </div>

             <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center justify-between px-1">
                   <span className="flex items-center gap-2"><Tag className="h-3.5 w-3.5 text-primary" /> Category</span>
                   <button type="button" onClick={() => setIsCategoryModalOpen(true)} className="text-[10px] text-primary hover:underline font-black">+ NEW</button>
                </label>
                <div className="relative group">
                  <input 
                    list="category-suggestions"
                    placeholder="Classify product..."
                    className="h-11 w-full rounded-xl border-2 border-border bg-card px-4 text-sm font-bold focus:outline-none focus:border-primary transition-all placeholder:text-muted-foreground/50"
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    required
                  />
                  <datalist id="category-suggestions">
                    {categories.map(c => <option key={c.id} value={c.name} />)}
                  </datalist>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center justify-between px-1">
                   <span className="flex items-center gap-1.5"><Truck className="h-3.5 w-3.5" /> Supplier</span>
                   <button type="button" onClick={() => setIsSupplierModalOpen(true)} className="text-[10px] text-primary hover:underline font-black">+ NEW</button>
                </label>
                <div className="relative group">
                  <input 
                    list="supplier-suggestions"
                    placeholder="Origin / Manufacturer..."
                    className="h-11 w-full rounded-xl border-2 border-border bg-card px-4 text-sm font-bold focus:outline-none focus:border-primary transition-all placeholder:text-muted-foreground/50"
                    value={formData.supplierName}
                    onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                  />
                  <datalist id="supplier-suggestions">
                    {suppliers.map(s => <option key={s.id} value={s.name} />)}
                  </datalist>
                </div>
              </div>

              <Input 
                label={`Price (${currencySymbol})`} 
                type="number" 
                step="0.01" 
                min="0" 
                className="rounded-xl h-11"
                value={formData.price} 
                onChange={(e) => setFormData({ ...formData, price: e.target.value })} 
                required 
              />
              
              <Input 
                label="Current Stock" 
                type="number" 
                min="0" 
                className="rounded-xl h-11"
                value={formData.quantity} 
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} 
                required 
                disabled={!!editingProduct}
              />
              
              <div className="md:col-span-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 px-1">
                    <Barcode className="h-3.5 w-3.5" /> Identifier / Barcode
                  </label>
                  <Input 
                    placeholder="Enter EAN/UPC or unique SKU..."
                    className="rounded-xl h-11 font-mono tracking-widest"
                    value={formData.barcode} 
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} 
                    required 
                  />
                </div>
              </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-border mt-6">
            <Button type="button" variant="outline" onClick={handleCloseModal} disabled={isSaving} className="rounded-xl font-bold">Discard</Button>
            <Button 
              type="submit" 
              disabled={
                isSaving || 
                !formData.name.trim() || 
                !formData.price || 
                !formData.quantity || 
                !formData.barcode.trim() || 
                !categories.some(c => c.name === formData.categoryId) || 
                !suppliers.some(s => s.name === formData.supplierName)
              } 
              className="rounded-xl font-bold min-w-[160px] shadow-lg shadow-primary/20"
            >
              {isSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing...</> : (editingProduct ? 'Commit Changes' : 'Initialize Product')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Sub-Modal: Add Category */}
      <Modal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} title="Quick Category Setup" size="sm">
          <div className="space-y-4 pt-2">
            <Input 
              label="New Category Name" 
              placeholder="e.g. Fresh Produce" 
              value={newCatName} 
              onChange={e => setNewCatName(e.target.value)}
              className="h-11 rounded-xl"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsCategoryModalOpen(false)} className="rounded-lg h-9">Back</Button>
              <Button onClick={handleAddCategory} disabled={isAddingNew || !newCatName.trim()} className="rounded-lg h-9">
                 {isAddingNew ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm & Add'}
              </Button>
            </div>
          </div>
      </Modal>

      {/* Sub-Modal: Add Supplier */}
      <Modal isOpen={isSupplierModalOpen} onClose={() => setIsSupplierModalOpen(false)} title="Quick Supplier Registration" size="sm">
          <div className="space-y-4 pt-2">
            <Input 
              label="Company / Vendor Name" 
              placeholder="e.g. Unilever Distrib." 
              value={newSupName} 
              onChange={e => setNewSupName(e.target.value)}
              className="h-11 rounded-xl"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsSupplierModalOpen(false)} className="rounded-lg h-9">Back</Button>
              <Button onClick={handleAddSupplier} disabled={isAddingNew || !newSupName.trim()} className="rounded-lg h-9">
                 {isAddingNew ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm & Add'}
              </Button>
            </div>
          </div>
      </Modal>
    </div>
  );
}

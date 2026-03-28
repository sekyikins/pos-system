'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Product, Category, Supplier } from '@/lib/types';
import { getProducts, addProduct, updateProduct, deleteProduct, getCategories, getSuppliers } from '@/lib/db';
import { useToastStore, useSettingsStore } from '@/lib/store';
import { Plus, Search, Edit, Trash2, Package, Loader2, Upload, ImageIcon, Boxes, Barcode, Truck } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';

export default function ProductsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { addToast } = useToastStore();
  const { currencySymbol } = useSettingsStore();

  const [formData, setFormData] = useState({ name: '', categoryId: '', price: '', quantity: '', barcode: '', supplierName: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: products, isLoading, refetch } = useRealtimeTable<Product>({
    table: 'products',
    initialData: [],
    fetcher: getProducts,
    refetchOnChange: true
  });

  useEffect(() => {
    async function loadResources() {
      try { 
        const [c, s] = await Promise.all([getCategories(), getSuppliers()]);
        setCategories(c);
        setSuppliers(s);
      } catch (e) { console.error('Failed to load metadata', e); }
    }
    loadResources();
  }, []);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.barcode.includes(searchQuery) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.supplierName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({ 
        name: product.name, 
        categoryId: product.categoryId || '', 
        price: product.price.toString(), 
        quantity: product.quantity.toString(), 
        barcode: product.barcode,
        supplierName: product.supplierName || ''
      });
      setPreviewUrl(product.image_url || null);
    } else {
      setEditingProduct(null);
      setFormData({ name: '', categoryId: '', price: '', quantity: '', barcode: '', supplierName: '' });
      setPreviewUrl(null);
    }
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => { setIsModalOpen(false); setEditingProduct(null); setSelectedFile(null); setPreviewUrl(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const selectedCat = categories.find(c => c.id === formData.categoryId);
      const productData = { 
        name: formData.name, 
        categoryId: formData.categoryId,
        category: selectedCat?.name || 'Uncategorized',
        price: parseFloat(formData.price), 
        quantity: parseInt(formData.quantity), 
        barcode: formData.barcode,
        supplierName: formData.supplierName || undefined
      };
      if (editingProduct) {
        await updateProduct(editingProduct.id, productData, undefined, selectedFile || undefined);
        addToast('Product updated successfully', 'success');
      } else {
        await addProduct(productData, selectedFile || undefined);
        addToast('Product added successfully', 'success');
      }
      refetch();
      handleCloseModal();
    } catch (err) {
      console.error(err);
      addToast(err instanceof Error ? err.message : 'Failed to save product', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await deleteProduct(id);
        addToast('Product deleted', 'info');
        refetch();
      } catch {
        addToast('Failed to delete product', 'error');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 tracking-tight">
            <Boxes className="h-8 w-8 text-primary" />
            Products
          </h1>
          <p className="text-sm text-muted-foreground font-medium">Manage your store inventory and catalog</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </div>

      <Card className="border-2 border-border/50 overflow-hidden">
        <CardHeader className="pb-0 border-b border-border/50">
          <div className="flex items-center gap-2 pb-6">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/60" />
              <Input 
                placeholder="Search products, categories, barcodes..." 
                className="pl-10 h-11 rounded-xl border-border bg-muted/20" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
              />
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
                    <th className="p-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredProducts.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No products found.</td></tr>
                  ) : (
                    filteredProducts.map((product) => (
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
                          <Badge variant="outline" className="rounded-lg bg-info/5 text-info border-info/20 font-bold px-2.5 py-1">
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
                        <td className="p-3 text-right">
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
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 ml-1">
                   <Package className="h-3.5 w-3.5 text-primary" /> Category
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
                <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                   <Truck className="h-3.5 w-3.5" /> Supplier
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
              />
              
              <div className="md:col-span-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
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
            <Button type="submit" disabled={isSaving} className="rounded-xl font-bold min-w-[160px] shadow-lg shadow-primary/20">
              {isSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing...</> : (editingProduct ? 'Commit Changes' : 'Initialize Product')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

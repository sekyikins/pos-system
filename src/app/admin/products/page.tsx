'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Product } from '@/lib/types';
import { getProducts, addProduct, updateProduct, deleteProduct } from '@/lib/mock-db';
import { useToastStore } from '@/lib/store';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>(getProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { addToast } = useToastStore();

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    quantity: '',
    barcode: ''
  });

  const loadProducts = () => {
     setProducts(getProducts());
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.barcode.includes(searchQuery) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        category: product.category,
        price: product.price.toString(),
        quantity: product.quantity.toString(),
        barcode: product.barcode
      });
    } else {
      setEditingProduct(null);
      setFormData({ name: '', category: '', price: '', quantity: '', barcode: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const productData = {
      name: formData.name,
      category: formData.category,
      price: parseFloat(formData.price),
      quantity: parseInt(formData.quantity),
      barcode: formData.barcode
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, productData);
      addToast('Product updated successfully', 'success');
    } else {
      addProduct(productData);
      addToast('Product added successfully', 'success');
    }

    loadProducts();
    handleCloseModal();
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
       deleteProduct(id);
       addToast('Product deleted', 'info');
       loadProducts();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">Manage your store inventory and catalog</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
             <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/60" />
               <Input 
                 placeholder="Search products by name, category or barcode..." 
                 className="pl-9"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
               />
             </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-x-auto">
             <table className="w-full text-sm text-left">
                <thead className="bg-muted/90 text-xs uppercase font-semibold text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Price</th>
                    <th className="px-6 py-3">Stock</th>
                    <th className="px-6 py-3">Barcode</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                        No products found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-medium">{product.name}</td>
                        <td className="px-6 py-4">{product.category}</td>
                        <td className="px-6 py-4">${product.price.toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span>{product.quantity}</span>
                            {product.quantity <= 10 && (
                              <Badge variant="destructive" className="ml-2 px-1.5 py-0 text-[10px]">Low stock</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">{product.barcode}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                             <Button variant="ghost" size="sm" onClick={() => handleOpenModal(product)} className="h-8 w-8 p-0">
                               <Edit className="h-4 w-4 text-info" />
                               <span className="sr-only">Edit</span>
                             </Button>
                             <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id, product.name)} className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10">
                               <Trash2 className="h-4 w-4" />
                               <span className="sr-only">Delete</span>
                             </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
             </table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Product Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
           <div className="space-y-4">
              <Input 
                label="Product Name" 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                required 
              />
              <Input 
                label="Category" 
                value={formData.category} 
                onChange={(e) => setFormData({...formData, category: e.target.value})} 
                required 
              />
              <div className="grid grid-cols-2 gap-4">
                 <Input 
                  label="Price ($)" 
                  type="number" 
                  step="0.01" 
                  min="0"
                  value={formData.price} 
                  onChange={(e) => setFormData({...formData, price: e.target.value})} 
                  required 
                />
                 <Input 
                  label="Quantity in Stock" 
                  type="number" 
                  min="0"
                  value={formData.quantity} 
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})} 
                  required 
                />
              </div>
              <Input 
                label="Barcode Number" 
                value={formData.barcode} 
                onChange={(e) => setFormData({...formData, barcode: e.target.value})} 
                required 
              />
           </div>
           
           <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit">
                {editingProduct ? 'Save Changes' : 'Add Product'}
              </Button>
           </div>
        </form>
      </Modal>
    </div>
  );
}

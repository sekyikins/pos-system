'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Product, InventoryLog } from '@/lib/types';
import { getProducts, getInventoryLogs, updateProduct } from '@/lib/mock-db';
import { useToastStore } from '@/lib/store';
import { Search, History, ArrowUpCircle, ArrowDownCircle, AlertCircle } from 'lucide-react';

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>(getProducts);
  const [logs, setLogs] = useState<InventoryLog[]>(() => 
     getInventoryLogs().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  );
  const [searchQuery, setSearchQuery] = useState('');
  const { addToast } = useToastStore();

  const loadData = () => {
     setProducts(getProducts());
     setLogs(getInventoryLogs().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.barcode.includes(searchQuery)
  );

  const handleAdjustStock = (productId: string, currentQuantity: number, adjustment: number) => {
      const newQuantity = currentQuantity + adjustment;
      if (newQuantity < 0) {
         addToast('Stock cannot be negative', 'error');
         return;
      }
      updateProduct(productId, { quantity: newQuantity });
      addToast(`Stock adjusted by ${adjustment > 0 ? '+' : ''}${adjustment}`, 'success');
      loadData(); // To simplify the mock, we don't manually push to logs array from UI here, though we could
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Control</h1>
          <p className="text-sm text-muted-foreground">Monitor stock levels and view history</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Main Inventory List */}
         <Card className="lg:col-span-2">
           <CardHeader>
             <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
               <CardTitle>Current Stock</CardTitle>
               <div className="relative w-full sm:max-w-xs">
                 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/50" />
                 <Input 
                   placeholder="Search items..." 
                   className="pl-9 h-9"
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                 />
               </div>
             </div>
           </CardHeader>
           <CardContent>
             <div className="space-y-4">
                {filteredProducts.map(product => (
                   <div key={product.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg border-border bg-muted/20">
                       <div className="flex-1 flex flex-col gap-1 mb-3 sm:mb-0">
                          <div className="flex items-center gap-2">
                             <span className="font-semibold">{product.name}</span>
                             {product.quantity <= 10 && (
                                <Badge variant="destructive" className="flex items-center gap-1 px-1.5 text-[10px]">
                                  <AlertCircle className="w-3 h-3"/> Low Stock
                                </Badge>
                             )}
                          </div>
                           <span className="text-xs text-muted-foreground">Barcode: {product.barcode} | Category: {product.category}</span>
                       </div>
                       
                       <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-[240px]">
                          <div className="text-center">
                             <span className="block text-xl font-bold">{product.quantity}</span>
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">In Stock</span>
                          </div>
                          
                          <div className="flex items-center gap-1 bg-card p-1 rounded-md border border-border">
                             <Button 
                               variant="ghost" 
                               size="sm" 
                               className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                               onClick={() => handleAdjustStock(product.id, product.quantity, -1)}
                             >
                                <ArrowDownCircle className="h-5 w-5" />
                             </Button>
                              <div className="h-4 w-px bg-border mx-1" />
                             <Button 
                               variant="ghost" 
                               size="sm" 
                               className="h-8 w-8 p-0 text-success hover:text-success hover:bg-success/10"
                               onClick={() => handleAdjustStock(product.id, product.quantity, 1)}
                             >
                                <ArrowUpCircle className="h-5 w-5" />
                             </Button>
                          </div>
                       </div>
                   </div>
                ))}
            
                {filteredProducts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                     No products found in inventory.
                  </div>
                )}
             </div>
           </CardContent>
         </Card>

         {/* Recent Activity Log */}
         <Card>
            <CardHeader>
               <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" /> 
                  Recent Activity
               </CardTitle>
               <CardDescription>Latest stock changes via sales</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="space-y-4">
                  {logs.slice(0, 10).map(log => {
                     const isPositive = log.change > 0;
                     const product = products.find(p => p.id === log.productId);
                     return (
                       <div key={log.id} className="flex items-start gap-4 pb-4 border-b last:border-0 border-border">
                          <div className={`mt-0.5 rounded-full p-1.5 ${isPositive ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                             {isPositive ? <ArrowUpCircle className="h-4 w-4" /> : <ArrowDownCircle className="h-4 w-4" />}
                          </div>
                          <div className="flex-1 space-y-1">
                             <p className="text-sm font-medium leading-none">
                               {isPositive ? '+' : ''}{log.change} {product?.name || 'Unknown Product'}
                             </p>
                             <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{new Date(log.timestamp).toLocaleString(undefined, { hour: 'numeric', minute: 'numeric', month: 'short', day: 'numeric' })}</span>
                                <span>•</span>
                                <Badge variant="outline" className="text-[9px] py-0">{log.reason}</Badge>
                             </div>
                          </div>
                       </div>
                     );
                  })}
                  
                  {logs.length === 0 && (
                     <p className="text-sm text-center text-muted-foreground py-4">No recent activity recorded.</p>
                  )}
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}

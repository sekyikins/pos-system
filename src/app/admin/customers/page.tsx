'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Customer } from '@/lib/types';
import { getCustomers, addCustomer } from '@/lib/mock-db';
import { useToastStore } from '@/lib/store';
import { Search, UserPlus, Phone, Mail, MapPin } from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(getCustomers);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToast } = useToastStore();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  const loadData = () => {
     setCustomers(getCustomers());
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.phone && c.phone.includes(searchQuery)) ||
    (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    addCustomer(formData);
    addToast('Customer added successfully', 'success');
    loadData();
    setIsModalOpen(false);
    setFormData({ name: '', phone: '', email: '', address: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">Manage customer relationships and loyalty</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2 shrink-0">
          <UserPlus className="h-4 w-4" /> Add Customer
        </Button>
      </div>

      <Card>
         <CardHeader>
             <div className="relative w-full max-w-sm">
                 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/50" />
                 <Input 
                   placeholder="Search by name, phone, or email..." 
                   className="pl-9"
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                 />
             </div>
         </CardHeader>
         <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
               {filteredCustomers.length === 0 ? (
                 <div className="col-span-full text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
                    No customers found matching your search.
                 </div>
               ) : (
                 filteredCustomers.map(customer => (
                    <Card key={customer.id} className="overflow-hidden hover:border-primary transition-colors">
                       <CardHeader className="bg-muted/50 pb-4">
                          <div className="flex justify-between items-start">
                             <CardTitle className="text-lg flex items-center gap-2">
                                 <div className="h-8 w-8 rounded-full bg-info/10 text-info flex items-center justify-center font-bold text-sm">
                                  {customer.name.charAt(0)}
                                </div>
                                {customer.name}
                             </CardTitle>
                             <Badge variant="secondary" className="text-xs">
                                {customer.loyaltyPoints} pts
                             </Badge>
                          </div>
                       </CardHeader>
                       <CardContent className="pt-4 space-y-3">
                           <div className="flex items-center gap-3 text-sm text-muted-foreground">
                             <Phone className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                             <span className="truncate">{customer.phone || 'No phone'}</span>
                           </div>
                           <div className="flex items-center gap-3 text-sm text-muted-foreground">
                             <Mail className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                             <span className="truncate">{customer.email || 'No email'}</span>
                           </div>
                       <div className="flex items-start gap-3 text-sm text-muted-foreground">
                             <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground/60" />
                             <span className="line-clamp-2">{customer.address || 'No address provided'}</span>
                           </div>
                       </CardContent>
                    </Card>
                 ))
               )}
            </div>
         </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Customer">
         <form onSubmit={handleSubmit} className="space-y-4">
            <Input 
              label="Full Name *" 
              placeholder="e.g. Jane Smith"
              value={formData.name} 
              onChange={(e) => setFormData({...formData, name: e.target.value})} 
              required 
            />
            <div className="grid grid-cols-2 gap-4">
               <Input 
                label="Phone Number" 
                placeholder="e.g. +1 234 567 890"
                value={formData.phone} 
                onChange={(e) => setFormData({...formData, phone: e.target.value})} 
              />
               <Input 
                label="Email Address" 
                type="email"
                placeholder="e.g. max@example.com"
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})} 
              />
            </div>
            <Input 
              label="Physical Address" 
              placeholder="e.g. 123 Main St, City, Country"
              value={formData.address} 
              onChange={(e) => setFormData({...formData, address: e.target.value})} 
            />
            
            <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Save Customer
              </Button>
           </div>
         </form>
      </Modal>
    </div>
  );
}

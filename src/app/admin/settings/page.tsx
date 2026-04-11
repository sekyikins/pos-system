'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Settings, UserCog, Truck, MapPin, Ticket, LayoutGrid, Store, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { DataExporter } from '@/components/admin/DataExporter';

export default function SettingsHubPage() {
  const { user } = useAuth();

  const managementModules = [
    { 
      name: 'Store Configuration', 
      href: '/admin/settings/config', 
      icon: Store, 
      desc: 'Identity, currency, and tax rules', 
      roles: ['ADMIN']
    },
    { 
      name: 'Staff Management', 
      href: '/admin/staff', 
      icon: UserCog, 
      desc: 'Roles and permissions', 
      roles: ['ADMIN', 'MANAGER'] 
    },
    { 
      name: 'Supplier Directory', 
      href: '/admin/suppliers', 
      icon: Truck, 
      desc: 'Vendor list and contacts', 
      roles: ['ADMIN', 'MANAGER'] 
    },
    { 
      name: 'Delivery Areas', 
      href: '/admin/delivery-points', 
      icon: MapPin, 
      desc: 'Pickup locations setup', 
      roles: ['ADMIN', 'MANAGER'] 
    },
    { 
      name: 'Promotions & Offers', 
      href: '/admin/promotions', 
      icon: Ticket, 
      desc: 'Campaign codes and status', 
      roles: ['ADMIN', 'MANAGER'] 
    }
  ];

  const filteredModules = managementModules.filter(m => m.roles.includes(user?.role || ''));

  return (
    <div className="space-y-8 max-w-5xl mx-auto transition-all animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Settings className="h-10 w-10 text-primary" />
            Administrative Hub
          </h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">Configure your business rules and manage system entities</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Card className="border-2 border-primary/20 shadow-xl overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader className="bg-primary/10 border-b border-primary/10 pb-6 pt-8 px-8">
            <div className="flex items-center gap-3 text-xl font-bold uppercase tracking-widest text-foreground">
              <LayoutGrid className="h-6 w-6 text-primary" />
              Management Modules
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredModules.map((module) => (
                <Link key={module.name} href={module.href}>
                  <div className="flex items-center justify-between p-3 rounded-xl border-2 transition-all group cursor-pointer h-full shadow-sm hover:shadow-xl bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary/40">
                    <div className="flex items-center gap-2">
                      <div className="h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-md bg-primary text-primary-foreground">
                        <module.icon className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">{module.name}</p>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest opacity-80 group-hover:opacity-100">{module.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted/20 text-muted-foreground/40 group-hover:bg-primary/20 group-hover:text-primary transition-all">
                      <ChevronRight className="h-6 w-6" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Financial & Data Export Section */}
        {user?.role === 'ADMIN' && (
          <div className="transition-all animate-in slide-in-from-bottom-5 duration-700 delay-300">
            <DataExporter />
          </div>
        )}
        
        <Card className="bg-muted/20 border-dashed border-2 border-border/50 shadow-none">
          <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-background flex items-center justify-center text-muted-foreground">
              <Settings className="h-6 w-6" />
            </div>
            <h4 className="font-bold text-sm">Need Help?</h4>
            <p className="text-xs text-muted-foreground">Contact support for advanced system configurations</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

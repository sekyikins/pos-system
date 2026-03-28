'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { ShoppingBag, Package, Users, BarChart3, LogOut, X, Archive, ShoppingCart, PieChart, UserCog, AlertTriangle, Truck, Settings, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const pathname = usePathname();

    const allNavigation = [
      { name: 'Dashboard', href: '/admin', icon: BarChart3, roles: ['ADMIN', 'MANAGER'] },
      { name: 'Sales', href: '/admin/sales', icon: ShoppingCart, roles: ['ADMIN', 'MANAGER'] },
      { name: 'Online Orders', href: '/admin/online-orders', icon: ShoppingBag, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
      { name: 'Products', href: '/admin/products', icon: Package, roles: ['ADMIN', 'MANAGER'] },
      { name: 'Categories', href: '/admin/categories', icon: Archive, roles: ['ADMIN', 'MANAGER'] },
      { name: 'Promotions', href: '/admin/promotions', icon: Ticket, roles: ['ADMIN', 'MANAGER'] },
      { name: 'Inventory', href: '/admin/inventory', icon: Package, roles: ['ADMIN', 'MANAGER'] },
      { name: 'Customers', href: '/admin/customers', icon: Users, roles: ['ADMIN', 'MANAGER'] },
      { name: 'Reports', href: '/admin/reports', icon: PieChart, roles: ['ADMIN', 'MANAGER'] },
      { name: 'Staff', href: '/admin/staff', icon: UserCog, roles: ['ADMIN', 'MANAGER'] },
      { name: 'Suppliers', href: '/admin/suppliers', icon: Truck, roles: ['ADMIN', 'MANAGER'] },
      { name: 'Delivery Points', href: '/admin/delivery-points', icon: Package, roles: ['ADMIN', 'MANAGER'] },
      { name: 'Settings', href: '/admin/settings', icon: Settings, roles: ['ADMIN'] },
    ];

    const navigation = allNavigation.filter(item => item.roles.includes(user?.role || ''));

  return (
    <>
      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/20 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Content */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center bg-muted/30 justify-between px-6 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">Admin Panel</span>
          </div>
          <button 
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-140px)]">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-muted/50 text-secondary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/40 hover:text-primary'
                }`}
                onClick={onClose}
              >
                <item.icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-border bg-muted/30 shrink-0">
          <div className="flex items-center gap-3 mb-4 px-2">
             <div className="h-8 w-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold">
                {user?.name?.charAt(0) || 'A'}
             </div>
             <div className="flex flex-col">
               <span className="text-sm font-medium leading-none text-foreground">{user?.name}</span>
               <span className="text-xs text-muted-foreground mt-1">{user?.role}</span>
             </div>
          </div>
          <Button variant="outline" fullWidth className="justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setShowLogoutConfirm(true)}>
            <LogOut className="h-5 w-5" />
            Sign Out
          </Button>
        </div>

      </aside>

      {/* Logout Confirmation Modal */}
      <Modal 
        isOpen={showLogoutConfirm} 
        onClose={() => setShowLogoutConfirm(false)} 
        title="Confirm Logout"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-destructive/5 text-destructive border border-destructive/10">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium">Are you sure you want to sign out of the Admin Panel? Any unsaved changes may be lost.</p>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setShowLogoutConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={logout}>
              Sign Out
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

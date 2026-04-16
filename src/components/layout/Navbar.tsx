'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useCartStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import {
  ShoppingBag, LogOut, ShoppingCart, Menu, AlertTriangle
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useSettingsStore, useUIStore } from '@/lib/store';
import { LiveStatus } from '@/components/ui/LiveStatus';

export type NavbarVariant = 'pos' | 'admin' | 'auth';

interface NavbarProps {
  variant: NavbarVariant;
  onMobileMenuToggle?: () => void;
  onMobileCartToggle?: () => void;
}

export function Navbar({ variant, onMobileMenuToggle, onMobileCartToggle }: NavbarProps) {
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const cart = useCartStore();
  const { storeName } = useSettingsStore();
  const connectionStatus = useUIStore(state => state.connectionStatus);
  const pathname = usePathname();
  const isSettingsPage = pathname === '/admin/settings';

  const cartItemCount = cart.items.length;

  let headerContent;

  // -- AUTH VARIANT --
  if (variant === 'auth') {
    headerContent = (
      <header className="h-16 bg-muted/30 border-b border-border flex items-center justify-between px-4 lg:px-8 shrink-0">
        <div className="flex items-center gap-3 text-primary">
          <ShoppingBag className="h-7 w-7" />
          <span className="font-bold text-xl tracking-tight hidden sm:block">{storeName}</span>
        </div>
        <ThemeToggle />
      </header>
    );
  }
  // -- ADMIN VARIANT --
  else if (variant === 'admin') {
    headerContent = (
      <>
        {/* Mobile Header */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-muted/30 px-4 lg:hidden shrink-0">
          <button
            onClick={onMobileMenuToggle}
            className="text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-primary" />
            <span className="font-bold border-r border-border pr-2 ml-2">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={isSettingsPage ? "blur-[2px] opacity-20 pointer-events-none select-none" : ""}>
              <LiveStatus status={connectionStatus} />
            </div>
            <ThemeToggle />
          </div>
        </header>

        {/* Desktop Top Bar */}
        <header className="hidden lg:flex h-16 shrink-0 items-center justify-end border-b border-border bg-muted/30 px-6 gap-6">
            <div className={isSettingsPage ? "blur-[2px] opacity-20 pointer-events-none select-none" : ""}>
              <LiveStatus status={connectionStatus} />
            </div>
            <ThemeToggle />
        </header>
      </>
    );
  }
  // -- POS VARIANT (Default for Staff) --
  else {
    headerContent = (
      <header className="h-16 bg-muted/30 border-b border-border flex items-center justify-between px-4 lg:px-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-primary">
            <ShoppingBag className="h-6 w-6" />
            <span className="font-bold text-lg hidden sm:block text-foreground">{storeName}</span>
          </div>
          {(user?.role === 'MANAGER' || user?.role === 'ADMIN') && (
            <Link href="/admin" className="text-sm font-medium text-info hover:underline hidden sm:block">
              Admin Panel
            </Link>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className={isSettingsPage ? "blur-[2px] opacity-20 pointer-events-none select-none" : ""}>
            <LiveStatus status={connectionStatus} />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium hidden sm:block text-muted-foreground">
              {user?.name} <span className="text-muted-foreground/60 font-normal">({user?.role})</span>
            </span>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={() => setShowLogoutConfirm(true)} className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
            <Button
              className="lg:hidden relative"
              variant="secondary"
              size="sm"
              onClick={onMobileCartToggle}
            >
              <ShoppingCart className="h-5 w-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      {headerContent}
      
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
            <p className="text-sm font-medium">Are you sure you want to log out? You will need to log back in to access the system components.</p>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <Button title='Cancel' variant="outline" autoFocus onClick={() => setShowLogoutConfirm(false)}>
              Cancel
            </Button>
            <Button title='Confirm Log Out' variant="danger" onClick={logout}>
              Log Out
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

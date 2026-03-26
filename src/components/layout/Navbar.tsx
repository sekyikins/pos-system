'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useCartStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import {
  ShoppingBag, LogIn, LogOut, LayoutDashboard, Calculator,
  ShoppingCart, Menu
} from 'lucide-react';

export type NavbarVariant = 'storefront' | 'pos' | 'admin' | 'auth';

interface NavbarProps {
  variant: NavbarVariant;
  onMobileMenuToggle?: () => void;
  onMobileCartToggle?: () => void;
}

export function Navbar({ variant, onMobileMenuToggle, onMobileCartToggle }: NavbarProps) {
  const { user, logout } = useAuth();
  const cart = useCartStore();

  const cartItemCount = cart.items.length;

  // -- AUTH VARIANT --
  if (variant === 'auth') {
    return (
      <header className="h-16 bg-muted/30 border-b border-border flex items-center justify-between px-4 lg:px-8 shrink-0">
        <Link href="/" className="flex items-center gap-3 text-primary hover:opacity-80 transition-opacity">
          <ShoppingBag className="h-7 w-7" />
          <span className="font-bold text-xl tracking-tight hidden sm:block">StarMart</span>
        </Link>
        <ThemeToggle />
      </header>
    );
  }

  // -- ADMIN VARIANT --
  if (variant === 'admin') {
    return (
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
          <ThemeToggle />
        </header>

        {/* Desktop Top Bar */}
        <header className="hidden lg:flex h-16 shrink-0 items-center justify-end border-b border-border bg-muted/30 px-6 gap-4">
            <ThemeToggle />
        </header>
      </>
    );
  }

  // -- POS VARIANT --
  if (variant === 'pos') {
    return (
      <header className="h-16 bg-muted/30 border-b border-border flex items-center justify-between px-4 lg:px-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-primary">
            <ShoppingBag className="h-6 w-6" />
            <span className="font-bold text-lg hidden sm:block text-foreground">StarMart</span>
          </div>
          {(user?.role === 'MANAGER' || user?.role === 'ADMIN') && (
            <Link href="/admin" className="text-sm font-medium text-info hover:underline hidden sm:block">
              Admin Panel
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium hidden sm:block text-muted-foreground">
            {user?.name} <span className="text-muted-foreground/60 font-normal">({user?.role})</span>
          </span>
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={logout} className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1">
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
      </header>
    );
  }

  // -- STOREFRONT VARIANT (default) --
  return (
    <header className="h-16 bg-muted/30 border-b border-border flex items-center justify-between px-4 lg:px-8 shrink-0">
      <Link href="/" className="flex items-center gap-3 text-primary hover:opacity-80 transition-opacity">
         <ShoppingBag className="h-7 w-7" />
         <span className="font-bold text-xl tracking-tight hidden sm:block">StarMart</span>
      </Link>

      <div className="flex items-center gap-3 sm:gap-4">
        {!user ? (
           <Link href="/login">
             <Button variant="outline" size="sm" className="gap-2">
               <LogIn className="h-4 w-4" />
               <span className="hidden sm:inline">Sign In</span>
             </Button>
           </Link>
         ) : (
           <div className="flex items-center gap-2 sm:gap-3">
              {(user.role === 'MANAGER' || user.role === 'ADMIN') && (
                <Link href="/admin">
                  <Button variant="ghost" size="sm" className="gap-2 text-info">
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="hidden sm:inline">Admin</span>
                  </Button>
                </Link>
              )}
              {user.role === 'CASHIER' && (
                <Link href="/pos">
                  <Button variant="ghost" size="sm" className="gap-2 text-primary">
                    <Calculator className="h-4 w-4" />
                    <span className="hidden sm:inline">POS System</span>
                  </Button>
                </Link>
              )}
              <span className="text-sm font-medium text-muted-foreground hidden sm:block border-l pl-3 border-border">
                Hi, {user.name}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
           </div>
        )}

        <ThemeToggle />

        <Button 
           className="lg:hidden relative bg-primary hover:bg-primary/90 text-primary-foreground" 
           size="sm"
           onClick={onMobileCartToggle}
        >
          <ShoppingCart className="h-5 w-5" />
          {cartItemCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center shadow-sm">
              {cartItemCount}
            </span>
          )}
        </Button>
      </div>
    </header>
  );
}

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthUser, StaffRecord as UserRecord } from './types';
import { useRouter, usePathname } from 'next/navigation';
import { useCartStore } from './store';
import { setSessionCookie, clearSessionCookie } from '@/app/actions/auth';
import { supabase } from './supabase';

interface AuthContextType {
  user: AuthUser | null;
  login: (user: UserRecord) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  isLoading: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Wrap state updates in setTimeout to avoid 'synchronous setState in effect' lint error
    // while restoring data from localStorage on mount.
    const stored = localStorage.getItem('pos_user');
    
    setTimeout(() => {
      if (stored) {
        try {
          const parsedUser = JSON.parse(stored) as AuthUser;
          setUser(parsedUser);
        } catch {
          console.error('Failed to parse user from localStorage');
          localStorage.removeItem('pos_user');
        }
      }
      
      // Trigger store to load the correct user's cart
      useCartStore.persist.rehydrate();
      
      setIsLoading(false);
    }, 0);
  }, []);

  useEffect(() => {
    // Only handle redirects once auth state is fully loaded on the client
    if (isLoading) return;

    // Route Protection Logic
    const isPublicRoute = pathname === '/' || pathname === '/login';
    
    if (!user && !isPublicRoute) {
       router.replace('/login');
    } else if (user) {
        if (pathname === '/login') {
            // redirect logged in user away from login page
            router.replace(user.role === 'MANAGER' || user.role === 'ADMIN' ? '/admin' : '/pos');
        } else if (pathname.startsWith('/admin') && user.role !== 'MANAGER' && user.role !== 'ADMIN') {
            // restrict non-managers/admins from admin pages
            router.replace('/pos');
        }
    }
  }, [user, pathname, router, isLoading]);

  const login = useCallback(async (newUser: UserRecord) => {
    // Exclude passwordHash before storing — result is a proper AuthUser
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...authUser } = newUser;
    setUser(authUser);
    localStorage.setItem('pos_user', JSON.stringify(authUser));
    await setSessionCookie(authUser);

    // Rehydrate store with the new user's cart
    await useCartStore.persist.rehydrate();

    if (newUser.role === 'MANAGER' || newUser.role === 'ADMIN') {
      router.replace('/admin');
    } else if (newUser.role === 'CASHIER') {
      router.replace('/pos');
    } else {
      router.replace('/');
    }
  }, [router]);

  const logout = useCallback(async () => {
    setUser(null);
    localStorage.removeItem('pos_user');
    await clearSessionCookie();
    
    // Rehydrate store with guest cart (or empty)
    await useCartStore.persist.rehydrate();

    router.replace('/');
  }, [router]);

  useEffect(() => {
    if (!user || isLoading) return;

    const channel = supabase
      .channel(`staff-status-${user.id}`)
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'pos_staff',
        filter: `id=eq.${user.id}`
      }, () => {
        logout();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isLoading, logout]);

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

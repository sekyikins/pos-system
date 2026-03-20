'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser, UserRecord } from './types';
import { useRouter, usePathname } from 'next/navigation';

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
  const [user, setUser] = useState<AuthUser | null>(() => {
    // Lazy initializer: runs once on mount, reads localStorage synchronously.
    // This avoids calling setState inside an effect.
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('pos_user');
    if (!stored) return null;
    try {
      return JSON.parse(stored) as AuthUser;
    } catch {
      console.error('Failed to parse user from localStorage');
      return null;
    }
  });
  // isLoading is always false because we read localStorage synchronously in the lazy initializer
  const isLoading = false;
  const router = useRouter();
  const pathname = usePathname();


  useEffect(() => {
    // Route Protection Logic
    const isPublicRoute = pathname === '/' || pathname === '/login' || pathname === '/signup';
    
    if (!user && !isPublicRoute) {
       router.push('/login');
    } else if (user) {
        if (pathname === '/login') {
            // redirect logged in user away from login page
            router.push(user.role === 'MANAGER' ? '/admin' : '/pos');
        } else if (pathname.startsWith('/admin') && user.role !== 'MANAGER') {
            // restrict non-managers from admin pages
            router.push('/pos');
        } else if (pathname.startsWith('/pos') && user.role === 'CUSTOMER') {
            // restrict customers from pos pages
            router.push('/');
        }
    }
  }, [user, pathname, router]);

  const login = (newUser: UserRecord) => {
    // Exclude passwordHash before storing — result is a proper AuthUser
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...authUser } = newUser;
    setUser(authUser);
    localStorage.setItem('pos_user', JSON.stringify(authUser));

    if (newUser.role === 'MANAGER') {
      router.push('/admin');
    } else if (newUser.role === 'CASHIER') {
      router.push('/pos');
    } else {
      router.push('/');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('pos_user');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

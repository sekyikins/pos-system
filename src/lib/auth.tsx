'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser, StaffRecord as UserRecord } from './types';
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
          // UUID is 36 chars; mock IDs were like 'user-1'
          if (parsedUser.id.length !== 36) {
            console.warn('Old mock user detected, clearing session.');
            localStorage.removeItem('pos_user');
          } else {
            setUser(parsedUser);
          }
        } catch {
          console.error('Failed to parse user from localStorage');
          localStorage.removeItem('pos_user');
        }
      }
      setIsLoading(false);
    }, 0);
  }, []);

  useEffect(() => {
    // Only handle redirects once auth state is fully loaded on the client
    if (isLoading) return;

    // Route Protection Logic
    const isPublicRoute = pathname === '/' || pathname === '/login' || pathname === '/signup';
    
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

  const login = (newUser: UserRecord) => {
    // Exclude passwordHash before storing — result is a proper AuthUser
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...authUser } = newUser;
    setUser(authUser);
    localStorage.setItem('pos_user', JSON.stringify(authUser));

    if (newUser.role === 'MANAGER' || newUser.role === 'ADMIN') {
      router.replace('/admin');
    } else if (newUser.role === 'CASHIER') {
      router.replace('/pos');
    } else {
      router.replace('/');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('pos_user');
    router.replace('/');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getUserByUsername } from '@/lib/db';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ShoppingBag } from 'lucide-react';
import bcrypt from 'bcryptjs';
import { useSettingsStore } from '@/lib/store';


export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { storeName } = useSettingsStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const user = await getUserByUsername(username);
      if (!user) {
        setError('Invalid username or password');
        return;
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (isValid) {
        login(user);
      } else {
        setError('Invalid username or password');
      }
    } catch {
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center border-none">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-primary/10 p-3">
            <ShoppingBag className="h-6 w-6 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl">Sign In</CardTitle>
        <CardDescription>
          Enter your credentials to access { storeName }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Input 
              id="username" 
              label="Username" 
              placeholder="manager/cashier/customer" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Input 
              id="password" 
              type="password"
              label="Password" 
              placeholder="Enter password (hint: 'password')" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          
          {error && (
            <div className="text-sm font-medium text-destructive">
               {error}
            </div>
          )}
          
          <Button 
             type="submit" 
             fullWidth 
             disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
       </CardContent>
        <CardFooter className="flex flex-col space-y-4 text-sm text-muted-foreground">
          <div className="w-full pt-4 border-t border-border">
             <p className="text-center w-full mb-2 text-xs">Test Accounts (Password: &apos;password123&apos;)</p>
              <div className="grid grid-cols-3 gap-2 text-xs text-center">
                <div className="bg-muted/50 p-2 rounded">admin</div>
                <div className="bg-muted/50 p-2 rounded">manager</div>
                <div className="bg-muted/50 p-2 rounded">cashier1</div>
              </div>
          </div>
       </CardFooter>
     </Card>
  );
}

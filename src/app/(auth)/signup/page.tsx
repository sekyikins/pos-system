'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getUserByUsername, addUser } from '@/lib/db';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ShoppingBag } from 'lucide-react';
import bcrypt from 'bcryptjs';
import Link from 'next/link';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const existing = await getUserByUsername(username);
      if (existing) { setError('Username already taken'); return; }
      const passwordHash = await bcrypt.hash(password, 10);
      const newUser = await addUser({ name, username, passwordHash, role: 'CASHIER' });
      login(newUser);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-primary/10 p-3">
            <ShoppingBag className="h-6 w-6 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl">Create Account</CardTitle>
        <CardDescription>New cashier / staff account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignup} className="space-y-4">
          <Input label="Full Name" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required disabled={isLoading} />
          <Input label="Username" placeholder="johndoe" value={username} onChange={e => setUsername(e.target.value)} required disabled={isLoading} />
          <Input label="Password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required disabled={isLoading} />
          {error && <div className="text-sm font-medium text-destructive">{error}</div>}
          <Button type="submit" fullWidth disabled={isLoading}>{isLoading ? 'Creating...' : 'Create Account'}</Button>
        </form>
      </CardContent>
      <CardFooter className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:underline font-medium ml-1">Sign in</Link>
      </CardFooter>
    </Card>
  );
}

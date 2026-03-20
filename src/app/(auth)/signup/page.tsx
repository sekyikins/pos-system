'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { addUser, getUserByUsername } from '@/lib/mock-db';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { UserPlus } from 'lucide-react';
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
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if username already exists
      if (getUserByUsername(username)) {
        setError('Username is already taken');
        return;
      }

      // Hash password (salt rounds = 10 as in mock-db)
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Create new user (default to CUSTOMER role for public signups)
      const newUserRecord = addUser({
        name,
        username,
        passwordHash,
        role: 'CUSTOMER'
      });

      // Automatically log them in after successful signup
      login(newUserRecord);
    } catch {
      setError('An error occurred during signup');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-primary/10 p-3">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl">Create an Account</CardTitle>
        <CardDescription>
          Enter your details below to create your customer account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Input 
              id="name" 
              label="Full Name" 
              placeholder="John Doe" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Input 
              id="username" 
              label="Username" 
              placeholder="Choose a username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Input 
              id="password" 
              type="password"
              label="Password" 
              placeholder="Create a password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              minLength={6}
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
             className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isLoading ? 'Creating account...' : 'Sign Up'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4 text-center">
         <div className="text-sm text-muted-foreground">
           Already have an account?{' '}
           <Link href="/login" className="text-primary hover:underline font-medium">
             Sign in instead
           </Link>
         </div>
      </CardFooter>
    </Card>
  );
}

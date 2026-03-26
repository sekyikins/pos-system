'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, id, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label 
            htmlFor={id} 
            className="block text-sm font-medium text-foreground/80 cursor-pointer"
          >
            {label}
          </label>
        )}
        <input
          id={id}
          className={`flex h-10 w-full rounded-xl border border-border bg-input py-2 px-3 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all ${
            error ? 'border-destructive focus-visible:ring-destructive' : ''
          } ${className}`}
          ref={ref}
          {...props}
        />
        {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

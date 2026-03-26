'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'info' | 'success';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', fullWidth, children, ...props }, ref) => {
    
    const baseStyles = 'inline-flex items-center justify-center rounded-xl font-medium transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';
    
    const variants = {
      primary: 'bg-primary text-primary-foreground hover:bg-primary/80 cursor-pointer shadow-sm',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/50 cursor-pointer',
      danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer',
      outline: 'bg-transparent border border-border hover:bg-accent hover:text-accent-foreground cursor-pointer',
      ghost: 'bg-transparent hover:bg-accent hover:text-accent-foreground cursor-pointer',
      info: 'bg-info text-info-foreground hover:bg-info/80 cursor-pointer shadow-sm',
      success: 'bg-success text-success-foreground hover:bg-success/80 cursor-pointer shadow-sm',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 py-2 px-4 shadow-sm',
      lg: 'h-12 px-8 text-lg rounded-xl shadow-md',
    };

    const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`;

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

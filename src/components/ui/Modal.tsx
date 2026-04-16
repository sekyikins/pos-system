'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import FocusTrap from 'focus-trap-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
};

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className = '', 
  size = 'lg' 
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClass = sizeClasses[size as keyof typeof sizeClasses] || 'max-w-lg';

  return (
    <FocusTrap focusTrapOptions={{ initialFocus: false, fallbackFocus: "body" }}>
      <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-0">
        <div 
          className="fixed inset-0 bg-background/20 backdrop-blur-sm transition-opacity" 
          onClick={onClose} 
        />
        <div className={`relative w-full rounded-xl bg-card border border-border card-shadow z-10 max-h-[90vh] flex flex-col ${maxWidthClass} ${className}`}>
          <div className="flex items-center bg-muted/30 justify-between border-b px-6 py-4 border-border">
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <button
              title={`Close ${title} Modal`}
              onClick={onClose}
              className="rounded-full p-1 hover:bg-muted hover:cursor-pointer transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground hover:text-destructive" />
              <span className="sr-only">Close</span>
            </button>
          </div>
          <div className="p-6 overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </FocusTrap>
  );
};

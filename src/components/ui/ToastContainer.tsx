'use client';

import React from 'react';
import { useToastStore } from '@/lib/store';
import { X, CheckCircle, XCircle, Info } from 'lucide-react';

export const ToastContainer = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 w-80 max-w-[calc(100vw-2rem)] rounded-lg p-4 shadow-lg transition-all animate-in slide-in-from-right-5 fade-in ${
            toast.type === 'success'
              ? 'bg-success/10 text-success'
              : toast.type === 'error'
              ? 'bg-destructive/10 text-destructive'
              : 'bg-card text-card-foreground shadow-lg border border-border'
          }`}
        >
          {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-success shrink-0" />}
          {toast.type === 'error' && <XCircle className="h-5 w-5 text-destructive shrink-0" />}
          {toast.type === 'info' && <Info className="h-5 w-5 text-info shrink-0" />}
          
          <div className="flex-1 text-sm">{toast.message}</div>
          
          <button
            onClick={() => removeToast(toast.id)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

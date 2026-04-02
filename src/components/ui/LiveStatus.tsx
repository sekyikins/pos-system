'use client';

import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { ConnectionStatus } from '@/hooks/useRealtimeTable';

interface LiveStatusProps {
  status: ConnectionStatus | 'live'; // 'live' is for static cases where we just want to show it's active
  label?: string;
  className?: string;
}

export function LiveStatus({ status, label, className = '' }: LiveStatusProps) {
  if (status === 'connected' || status === 'live') {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <Wifi className="h-3.5 w-3.5 text-success" />
        <span className="text-[10px] font-bold text-success uppercase tracking-widest">
          {label || 'Live'}
        </span>
      </div>
    );
  }

  if (status === 'error' || status === 'disconnected') {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <WifiOff className="h-3.5 w-3.5 text-destructive" />
        <span className="text-[10px] font-bold text-destructive uppercase tracking-widest">
          {label || 'Offline'}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse" />
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
        {label || 'Syncing...'}
      </span>
    </div>
  );
}

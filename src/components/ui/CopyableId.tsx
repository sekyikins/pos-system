'use client';

import React from 'react';
import { useToastStore } from '@/lib/store';
import { Copy } from 'lucide-react';

interface CopyableIdProps {
  id: string;
  truncate?: boolean;
  truncateLength?: number;
  className?: string;
}

/**
 * A component to display IDs that are clickable and copyable to clipboard.
 * Features a "Click to Copy ID" tooltip and visual feedback on click.
 */
export function CopyableId({ 
  id, 
  truncate = true, 
  truncateLength = 8,
  className = "" 
}: CopyableIdProps) {
  const { addToast } = useToastStore();

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    addToast('ID copied to clipboard', 'success');
  };

  const displayText = truncate ? `#${id.slice(-truncateLength).toUpperCase()}` : id;

  return (
    <button
      onClick={handleCopy}
      title="Click to Copy ID"
      className={`font-mono text-[14px] font-bold bg-muted/50 px-2 py-0.5 rounded tracking-tighter hover:bg-primary/15 hover:text-primary transition-all cursor-pointer inline-flex items-center gap-1.5 group active:scale-85 ${className}`}
    >
      <span>{displayText}</span>
      <Copy className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

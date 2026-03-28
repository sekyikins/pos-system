/**
 * useRealtimeTable — Reusable Supabase Realtime subscription hook.
 *
 * Usage:
 *   const { data, isLoading, connectionStatus, refetch } = useRealtimeTable<OnlineOrder>({
 *     table: 'online_orders',
 *     initialData: [],
 *     fetcher: getOnlineOrders,
 *   });
 */

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseRealtimeTableOptions<T extends { id: string }> {
  table: string;
  initialData: T[];
  fetcher: () => Promise<T[]>;
  filter?: { column: string; value: string };
  schema?: string;
  disabled?: boolean;
  /**
   * When true, any realtime event triggers a full refetch() instead of
   * optimistic state patching. Use this for tables that need joins or
   * go through a row mapper (e.g. toOrder(), toSale()).
   */
  refetchOnChange?: boolean;
}

interface UseRealtimeTableResult<T extends { id: string }> {
  data: T[];
  isLoading: boolean;
  connectionStatus: ConnectionStatus;
  refetch: () => Promise<void>;
}

export function useRealtimeTable<T extends { id: string }>({
  table,
  initialData,
  fetcher,
  filter,
  schema = 'public',
  disabled = false,
  refetchOnChange = false,
}: UseRealtimeTableOptions<T>): UseRealtimeTableResult<T> {
  const [data, setData] = useState<T[]>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const channelRef = useRef<RealtimeChannel | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refetch = useCallback(async () => {
    try {
      const rows = await fetcherRef.current();
      setData(rows);
    } catch (err) {
      console.error(`[useRealtimeTable] refetch error for "${table}":`, err);
    } finally {
      setIsLoading(false);
    }
  }, [table]);

  useEffect(() => {
    setIsLoading(true);
    refetch();

    if (disabled) {
      setConnectionStatus('disconnected');
      return;
    }

    const filterCol = filter?.column;
    const filterVal = filter?.value;

    const channelName = filterCol && filterVal
      ? `rt:${table}:${filterCol}:${filterVal}`
      : `rt:${table}`;

    const channel = supabase.channel(channelName);
    const realtimeFilter = filterCol && filterVal
      ? `${filterCol}=eq.${filterVal}`
      : undefined;

    channel
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        {
          event: '*',
          schema,
          table,
          ...(realtimeFilter ? { filter: realtimeFilter } : {}),
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          // If caller needs joined/mapped data, skip optimistic patch and refetch
          if (refetchOnChange) {
            refetch();
            return;
          }

          const { eventType, new: newRow, old: oldRow } = payload as {
            eventType: 'INSERT' | 'UPDATE' | 'DELETE';
            new: Partial<T>;
            old: Partial<T>;
          };

          setData(prev => {
            if (eventType === 'INSERT') {
              const r = newRow as T;
              if (prev.some(x => x.id === r.id)) return prev;
              return [r, ...prev];
            }
            if (eventType === 'UPDATE') {
              const r = newRow as T;
              if (prev.some(x => x.id === r.id)) {
                return prev.map(x => (x.id === r.id ? r : x));
              }
              return [r, ...prev];
            }
            if (eventType === 'DELETE') {
              const deletedId = (oldRow as Partial<T>).id;
              if (!deletedId) return prev;
              return prev.filter(x => x.id !== deletedId);
            }
            return prev;
          });
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('error');
          console.error(`[useRealtimeTable] Channel error on "${table}":`, err || 'Check if Realtime is enabled in Supabase Dashboard.');
          // Simple retry by refetching; hook will re-run if this component unmounts/remounts
          setTimeout(refetch, 3000);
        } else if (status === 'TIMED_OUT') {
          setConnectionStatus('disconnected');
        } else {
          setConnectionStatus('connecting');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setConnectionStatus('disconnected');
    };
  }, [table, schema, filter?.column, filter?.value, disabled, refetchOnChange, refetch]);

  return { data, isLoading, connectionStatus, refetch };
}

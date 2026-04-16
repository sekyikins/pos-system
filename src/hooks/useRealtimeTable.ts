'use client';

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useUIStore, ConnectionStatus as GlobalConnectionStatus } from '@/lib/store';

export type ConnectionStatus = GlobalConnectionStatus;

interface UseRealtimeTableOptions<T extends { id: string }> {
  table: string;
  initialData: T[];
  fetcher: () => Promise<T[]>;
  filter?: { column: string; value: string };
  schema?: string;
  disabled?: boolean;
  refetchOnChange?: boolean;
  /**
   * Optional key to enable persistent caching in localStorage.
   * This allows the UI to restore instantly on refresh before the network fetch completes.
   */
  cacheKey?: string;
}

interface UseRealtimeTableResult<T extends { id: string }> {
  data: T[];
  isLoading: boolean;
  isRefetching: boolean;
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
  cacheKey,
}: UseRealtimeTableOptions<T>): UseRealtimeTableResult<T> {
  // Generate a user-specific cache key to prevent data leakage between cashiers
  const fullCacheKey = useMemo(() => {
    if (!cacheKey) return null;
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('pos_user');
    const userId = userStr ? JSON.parse(userStr).id : 'guest';
    return `rt-cache:${cacheKey}:${userId}`;
  }, [cacheKey]);

  // Initialize from cache if available for instant UI restoration
  const [data, setData] = useState<T[]>(() => {
    if (fullCacheKey) {
      try {
        const cached = localStorage.getItem(fullCacheKey);
        if (cached) return JSON.parse(cached);
      } catch (e) {
        console.warn(`[useRealtimeTable] Failed to load cache for ${table}`, e);
      }
    }
    return initialData;
  });

  const instanceId = useMemo(() => Math.random().toString(36).substring(2, 9), []);

  const [isLoading, setIsLoading] = useState(() => {
    // If we have cached data, we're not 'loading' the skeleton anymore, just 'refetching'
    if (fullCacheKey) {
      return !localStorage.getItem(fullCacheKey);
    }
    return true;
  });

  const [isRefetching, setIsRefetching] = useState(false);
  const [connectionStatus, setConnectionStatusLocal] = useState<ConnectionStatus>('connecting');
  const updateGlobalStatus = useUIStore(state => state.updateInstanceStatus);
  const removeGlobalStatus = useUIStore(state => state.removeInstance);

  const setConnectionStatus = useCallback((status: ConnectionStatus) => {
    setConnectionStatusLocal(status);
    updateGlobalStatus(instanceId, status);
  }, [instanceId, updateGlobalStatus]);

  const [retrySession, setRetrySession] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refetch = useCallback(async (isInitial = false) => {
    if (isInitial) setIsLoading(data.length === 0);
    setIsRefetching(true);
    try {
      const rows = await fetcherRef.current();
      setData(rows);
      // Update cache
      if (fullCacheKey) {
        localStorage.setItem(fullCacheKey, JSON.stringify(rows));
      }
    } catch (err) {
      if (typeof window !== 'undefined' && navigator.onLine) {
        console.error(`[useRealtimeTable] refetch error for "${table}":`, err);
      }
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
    }
  }, [table, fullCacheKey, data.length]);

  // Sync cache when data changes via Realtime events
  useEffect(() => {
    if (fullCacheKey && !isLoading && !isRefetching) {
      localStorage.setItem(fullCacheKey, JSON.stringify(data));
    }
  }, [data, fullCacheKey, isLoading, isRefetching]);

  useEffect(() => {
    refetch(true);

    if (disabled) {
      setConnectionStatus('disconnected');
      return;
    }

    const filterCol = filter?.column;
    const filterVal = filter?.value;

    const channelName = filterCol && filterVal
      ? `rt:${table}:${filterCol}:${filterVal}:${instanceId}`
      : `rt:${table}:${instanceId}`;

    const channel = supabase.channel(channelName);
    const realtimeFilter = filterCol && filterVal
      ? `${filterCol}=eq.${filterVal}`
      : undefined;

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema,
          table,
          ...(realtimeFilter ? { filter: realtimeFilter } : {}),
        },
        (payload: RealtimePostgresChangesPayload<T>) => {
          if (refetchOnChange) {
            refetch();
            return;
          }

          const { eventType, new: newRow, old: oldRow } = payload;

          setData(prev => {
            let next;
            if (eventType === 'INSERT') {
              const r = newRow as T;
              if (prev.some(x => x.id === r.id)) next = prev;
              else next = [r, ...prev];
            } else if (eventType === 'UPDATE') {
              const r = newRow as T;
              if (prev.some(x => x.id === r.id)) {
                next = prev.map(x => (x.id === r.id ? r : x));
              } else {
                next = [r, ...prev];
              }
            } else if (eventType === 'DELETE') {
              const deletedId = (oldRow as Partial<T>).id;
              if (!deletedId) next = prev;
              else next = prev.filter(x => x.id !== deletedId);
            } else {
              next = prev;
            }
            return next;
          });
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('error');
          if (typeof window !== 'undefined' && navigator.onLine) {
            console.error(`[useRealtimeTable] Channel error on "${table}":`, err);
          }
          setTimeout(() => setRetrySession(s => s + 1), 5000);
        } else if (status === 'TIMED_OUT') {
          setConnectionStatus('disconnected');
          console.warn(`[useRealtimeTable] Timed out on "${table}".`);
          setTimeout(() => setRetrySession(s => s + 1), 5000);
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
      removeGlobalStatus(instanceId);
    };
  }, [table, schema, filter?.column, filter?.value, disabled, refetchOnChange, refetch, retrySession, instanceId, setConnectionStatus, removeGlobalStatus]);

  return { data, isLoading, isRefetching, connectionStatus, refetch };
}

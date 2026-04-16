'use server';

import { LRUCache } from 'lru-cache';

const rateLimitCache = new LRUCache({
  max: 500,
  ttl: 1000 * 60, // 1 minute
});

export async function checkRateLimit(key: string, limit: number = 5): Promise<{ success: boolean; limit: number; remaining: number }> {
    const current = (rateLimitCache.get(key) as number) || 0;
    
    if (current >= limit) {
        return { success: false, limit, remaining: 0 };
    }
    
    rateLimitCache.set(key, current + 1);
    return { success: true, limit, remaining: limit - (current + 1) };
}

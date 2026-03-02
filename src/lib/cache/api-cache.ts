/**
 * Simple in-memory cache with TTL support
 * For production, consider using Redis or similar
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class ApiCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes default TTL

  /**
   * Generate cache key from URL and params
   */
  private generateKey(url: string, params?: Record<string, any>): string {
    const paramsStr = params ? JSON.stringify(params) : '';
    return `${url}:${paramsStr}`;
  }

  /**
   * Get data from cache
   */
  get<T>(url: string, params?: Record<string, any>): T | null {
    const key = this.generateKey(url, params);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set data in cache
   */
  set<T>(url: string, data: T, params?: Record<string, any>, ttl?: number): void {
    const key = this.generateKey(url, params);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    };
    this.cache.set(key, entry);
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  invalidate(pattern: string): void {
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      const entry = this.cache.get(key);
      if (entry && now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Export singleton instance
export const apiCache = new ApiCache();

/**
 * Caching wrapper for fetch requests
 */
export async function cachedFetch<T>(
  url: string,
  options?: RequestInit & {
    cacheParams?: Record<string, any>;
    ttl?: number;
    bypassCache?: boolean;
  }
): Promise<T> {
  const { cacheParams, ttl, bypassCache = false, ...fetchOptions } = options || {};

  // Check cache first (unless bypass is enabled)
  if (!bypassCache) {
    const cached = apiCache.get<T>(url, cacheParams);
    if (cached !== null) {
      return cached;
    }
  }

  // Fetch from API
  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorData.error || 'Request failed');
  }

  const data = await response.json();

  // Cache the response
  apiCache.set(url, data, cacheParams, ttl);

  return data;
}

// Auto-cleanup expired entries every 10 minutes
if (typeof window === 'undefined') {
  // Server-side: cleanup every 10 minutes
  setInterval(() => {
    apiCache.cleanup();
  }, 10 * 60 * 1000);
}

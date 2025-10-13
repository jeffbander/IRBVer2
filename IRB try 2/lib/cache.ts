// Simple in-memory cache utility
// For production, consider using Redis or another distributed cache

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class Cache {
  private store: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number = 300000; // 5 minutes in milliseconds

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Set a value in cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);

    this.store.set(key, {
      value,
      expiresAt
    });
  }

  /**
   * Delete a value from cache
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Delete all keys matching a pattern
   */
  deletePattern(pattern: string): void {
    const regex = new RegExp(pattern);

    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get or set pattern - fetch from cache or compute and store
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    this.set(key, value, ttl);

    return value;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    let expired = 0;
    let valid = 0;
    const now = Date.now();

    for (const entry of this.store.values()) {
      if (now > entry.expiresAt) {
        expired++;
      } else {
        valid++;
      }
    }

    return {
      total: this.store.size,
      valid,
      expired
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        removed++;
      }
    }

    return removed;
  }
}

// Create singleton instance
export const cache = new Cache();

// Run cleanup every 5 minutes
setInterval(() => {
  const removed = cache.cleanup();
  if (removed > 0) {
    console.log(`[Cache] Cleaned up ${removed} expired entries`);
  }
}, 300000);

// Cache key generators for common patterns
export const cacheKeys = {
  study: (id: string) => `study:${id}`,
  studies: (filters: string = 'all') => `studies:${filters}`,
  user: (id: string) => `user:${id}`,
  users: () => 'users:all',
  participant: (id: string) => `participant:${id}`,
  participants: (studyId: string) => `participants:study:${studyId}`,
  documents: (studyId: string) => `documents:study:${studyId}`,
  dashboardStats: () => 'dashboard:stats',
  auditLog: (entityId: string) => `audit:${entityId}`,
};

// Cache invalidation helpers
export const invalidateCache = {
  study: (id: string) => {
    cache.delete(cacheKeys.study(id));
    cache.deletePattern('^studies:'); // Invalidate all study lists
  },

  user: (id: string) => {
    cache.delete(cacheKeys.user(id));
    cache.delete(cacheKeys.users());
  },

  participant: (id: string, studyId?: string) => {
    cache.delete(cacheKeys.participant(id));
    if (studyId) {
      cache.delete(cacheKeys.participants(studyId));
      cache.delete(cacheKeys.study(studyId)); // Study counts may have changed
    }
  },

  documents: (studyId: string) => {
    cache.delete(cacheKeys.documents(studyId));
    cache.delete(cacheKeys.study(studyId));
  },

  dashboard: () => {
    cache.delete(cacheKeys.dashboardStats());
  },

  all: () => {
    cache.clear();
  }
};

// Decorator for caching async functions
export function cached(key: string | ((args: any) => string), ttl?: number) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = typeof key === 'function' ? key(args) : key;

      return cache.getOrSet(cacheKey, async () => {
        return await originalMethod.apply(this, args);
      }, ttl);
    };

    return descriptor;
  };
}

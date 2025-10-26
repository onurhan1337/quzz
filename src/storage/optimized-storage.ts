/**
 * Optimized storage with caching and memoization for better performance
 */

import { BaseAsyncStorage } from "./base";
import type { StorageOptions } from "./types";

export interface CachedStorageOptions extends StorageOptions {
  cacheSize?: number;
  cacheTimeout?: number;
}

export abstract class OptimizedStorage<T> extends BaseAsyncStorage<T> {
  private cache: Map<string, { value: T; timestamp: number }> = new Map();
  private readonly cacheSize: number;
  private readonly cacheTimeout: number;
  private lastStore?: T;
  private lastStoreTime: number = 0;

  constructor(options: CachedStorageOptions) {
    super(options);
    this.cacheSize = options.cacheSize ?? 10;
    this.cacheTimeout = options.cacheTimeout ?? 1000;
  }

  /**
   * Get store with caching for performance
   */
  override getStore(): T | undefined {
    const now = Date.now();

    if (this.lastStore && now - this.lastStoreTime < 10) {
      this.metrics.hits++;
      return this.lastStore;
    }

    const store = super.getStore();
    if (store) {
      this.lastStore = store;
      this.lastStoreTime = now;
    }

    return store;
  }

  /**
   * Run with caching context
   */
  runCached<R>(key: string, store: T, callback: () => R): R {
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached && now - cached.timestamp < this.cacheTimeout) {
      return this.run(cached.value, callback);
    }

    const result = this.run(store, () => {
      this.cache.set(key, { value: store, timestamp: now });
      this.cleanupCache();
      return callback();
    });

    return result;
  }

  /**
   * Clear specific cache entry
   */
  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
      this.lastStore = undefined;
      this.lastStoreTime = 0;
    }
  }

  private cleanupCache(): void {
    if (this.cache.size <= this.cacheSize) return;

    const entriesToDelete = this.cache.size - this.cacheSize;
    const entries = Array.from(this.cache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp
    );

    for (let i = 0; i < entriesToDelete; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    cacheSize: number;
    cacheEntries: number;
    cacheHitRate: number;
  } {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    return {
      cacheSize: this.cacheSize,
      cacheEntries: this.cache.size,
      cacheHitRate: totalRequests > 0 ? this.metrics.hits / totalRequests : 0,
    };
  }
}

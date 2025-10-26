/**
 * Factory for creating type-safe storage instances with optimized defaults
 */

import { BaseAsyncStorage } from "./base";
import { TraceStorage, type TraceStorageOptions } from "./trace-storage";
import {
  MemoryMetricsStorage,
  type MemoryMetricsOptions,
} from "./memory-metrics-storage";

export class StorageFactory {
  /**
   * Create a new trace storage with optimized defaults
   */
  static createTraceStorage(
    options?: Partial<TraceStorageOptions>
  ): TraceStorage {
    return new TraceStorage({
      name: "trace-storage",
      enableFallback: true,
      debugMode: false,
      maxStackDepth: 100,
      maxMapSize: 1000,
      cleanupThreshold: 100,
      ...options,
    });
  }

  /**
   * Create a new memory metrics storage with optimized defaults
   */
  static createMemoryStorage(
    options?: Partial<MemoryMetricsOptions>
  ): MemoryMetricsStorage {
    return new MemoryMetricsStorage({
      name: "memory-metrics",
      enableFallback: true,
      debugMode: false,
      maxSnapshots: 100,
      snapshotInterval: 5000,
      leakThreshold: 50 * 1024 * 1024, // 50MB
      autoSnapshot: false,
      ...options,
    });
  }

  /**
   * Create a custom storage with type inference
   */
  static createCustomStorage<T>(
    implementation: {
      createDefaultStore: () => T;
      validateStore: (store: unknown) => store is T;
    },
    options: {
      name: string;
      enableFallback?: boolean;
      debugMode?: boolean;
    }
  ): BaseAsyncStorage<T> {
    return new (class extends BaseAsyncStorage<T> {
      protected createDefaultStore(): T {
        return implementation.createDefaultStore();
      }
      protected validateStore(store: unknown): store is T {
        return implementation.validateStore(store);
      }
    })(options);
  }
}

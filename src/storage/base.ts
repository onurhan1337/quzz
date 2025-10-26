import { isNodeVersionAtLeast } from "../utils/node-version";
import type {
  AsyncLocalStorageInstance,
  AsyncLocalStorageConstructor,
  AsyncHooksModule,
  StorageOptions,
  StorageMetrics,
  MutableStorageMetrics,
} from "./types";

export type { StorageOptions, StorageMetrics } from "./types";

export abstract class BaseAsyncStorage<T> {
  protected readonly name: string;
  protected readonly enableFallback: boolean;
  protected readonly debugMode: boolean;
  protected asyncLocalStorage: AsyncLocalStorageInstance<T> | null = null;
  protected fallbackStore: T | undefined;
  protected metrics: MutableStorageMetrics;

  constructor(options: StorageOptions) {
    this.name = options.name;
    this.enableFallback = options.enableFallback ?? true;
    this.debugMode = options.debugMode ?? false;
    this.metrics = {
      hits: 0,
      misses: 0,
      errors: 0,
      lastAccess: Date.now(),
    };

    this.initializeStorage();
  }

  private initializeStorage(): void {
    if (typeof process === "undefined" || !process.versions?.node) {
      this.logDebug("Not in Node.js environment, using fallback");
      return;
    }

    if (!isNodeVersionAtLeast(12, 17)) {
      this.logDebug("Node.js version too old for AsyncLocalStorage");
      return;
    }

    try {
      const AsyncLocalStorageClass = this.loadAsyncLocalStorage();
      if (AsyncLocalStorageClass) {
        this.asyncLocalStorage = new AsyncLocalStorageClass<T>();
        this.verifyAsyncLocalStorage();
      }
    } catch (error) {
      this.logError("Failed to initialize AsyncLocalStorage", error);
      this.metrics.errors++;
    }
  }

  private loadAsyncLocalStorage(): AsyncLocalStorageConstructor | null {
    const tryRequire = (modulePath: string): AsyncHooksModule | null => {
      try {
        return require(modulePath) as AsyncHooksModule;
      } catch {
        return null;
      }
    };

    const nodeModule = tryRequire("node:async_hooks");
    if (nodeModule?.AsyncLocalStorage) {
      return nodeModule.AsyncLocalStorage;
    }

    const legacyModule = tryRequire("async_hooks");
    if (legacyModule?.AsyncLocalStorage) {
      return legacyModule.AsyncLocalStorage;
    }

    return null;
  }

  private verifyAsyncLocalStorage(): void {
    if (!this.asyncLocalStorage || !isNodeVersionAtLeast(14, 0)) return;

    try {
      const testValue = this.createDefaultStore();
      this.asyncLocalStorage.run(testValue, () => {
        const retrieved = this.asyncLocalStorage!.getStore();
        if (!retrieved || !this.validateStore(retrieved)) {
          throw new Error("AsyncLocalStorage verification failed");
        }
      });
    } catch (error) {
      this.logError("AsyncLocalStorage verification failed", error);
      this.asyncLocalStorage = null;
      this.metrics.errors++;
    }
  }

  protected abstract createDefaultStore(): T;
  protected abstract validateStore(store: unknown): store is T;

  getStore(): T | undefined {
    this.metrics.lastAccess = Date.now();

    if (this.asyncLocalStorage) {
      try {
        const store = this.asyncLocalStorage.getStore();
        if (store !== undefined) {
          this.metrics.hits++;
          return store;
        }
      } catch (error) {
        this.logError("Failed to get store", error);
        this.metrics.errors++;
      }
    }

    this.metrics.misses++;
    return this.enableFallback ? this.fallbackStore : undefined;
  }

  enterWith(store: T): void {
    if (this.asyncLocalStorage) {
      try {
        this.asyncLocalStorage.enterWith(store);
        return;
      } catch (error) {
        this.logError("Failed to enter with store", error);
        this.metrics.errors++;
      }
    }

    if (this.enableFallback) {
      this.fallbackStore = store;
    }
  }

  run<R>(store: T, callback: () => R): R {
    if (this.asyncLocalStorage) {
      try {
        return this.asyncLocalStorage.run(store, callback);
      } catch (error) {
        this.logError("Failed to run with store", error);
        this.metrics.errors++;
      }
    }

    if (this.enableFallback) {
      const previousStore = this.fallbackStore;
      this.fallbackStore = store;
      try {
        return callback();
      } finally {
        this.fallbackStore = previousStore;
      }
    }

    return callback();
  }

  exit<R>(callback: () => R): R {
    if (this.asyncLocalStorage) {
      try {
        return this.asyncLocalStorage.exit(callback);
      } catch (error) {
        this.logError("Failed to exit context", error);
        this.metrics.errors++;
      }
    }

    if (this.enableFallback) {
      const previousStore = this.fallbackStore;
      this.fallbackStore = undefined;
      try {
        return callback();
      } finally {
        this.fallbackStore = previousStore;
      }
    }

    return callback();
  }

  disable(): void {
    if (this.asyncLocalStorage) {
      try {
        this.asyncLocalStorage.disable();
      } catch (error) {
        this.logError("Failed to disable storage", error);
      }
    }
    this.fallbackStore = undefined;
  }

  getMetrics(): StorageMetrics {
    return Object.freeze({ ...this.metrics });
  }

  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      errors: 0,
      lastAccess: Date.now(),
    };
  }

  isUsingFallback(): boolean {
    return !this.asyncLocalStorage && this.enableFallback;
  }

  isAvailable(): boolean {
    return this.asyncLocalStorage !== null || this.enableFallback;
  }

  protected logDebug(message: string, ...args: unknown[]): void {
    if (this.debugMode) {
      console.debug(`[quzz:${this.name}] ${message}`, ...args);
    }
  }

  protected logError(message: string, error?: unknown): void {
    if (this.debugMode) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[quzz:${this.name}] ${message}:`, errorMessage);
    }
  }
}
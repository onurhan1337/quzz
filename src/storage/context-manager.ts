import type { TraceMetadata, QuzzConfig } from "../types";
import { TraceStorage, type TraceStorageOptions } from "./trace-storage";
import {
  MemoryMetricsStorage,
  type MemoryMetricsOptions,
} from "./memory-metrics-storage";
import { BaseAsyncStorage } from "./base";
import type { StorageMetrics, ContextSnapshot, SnapshotOptions } from "./types";

export interface StorageInstance<T = unknown> {
  name: string;
  storage: BaseAsyncStorage<T>;
  enabled: boolean;
}

export interface StorageStats {
  enabled: boolean;
  metrics?: StorageMetrics;
  isUsingFallback?: boolean;
  isAvailable?: boolean;
  traceStats?: ReturnType<TraceStorage["getStats"]>;
  memoryStats?: ReturnType<MemoryMetricsStorage["getMemoryStats"]>;
  memoryTrend?: ReturnType<MemoryMetricsStorage["getMemoryTrend"]>;
}

export interface ContextManagerOptions {
  debugMode?: boolean;
  enableTracing?: boolean;
  enableMemoryMetrics?: boolean;
  enableSnapshots?: boolean;
  traceOptions?: Partial<TraceStorageOptions>;
  memoryOptions?: Partial<MemoryMetricsOptions>;
}

type StorageMap = Map<string, StorageInstance>;

export class ContextManager {
  private static instance: ContextManager | undefined;
  private readonly storages: StorageMap = new Map();
  private debugMode: boolean;
  private readonly enableSnapshots: boolean;

  private traceStorage: TraceStorage | null = null;
  private memoryStorage: MemoryMetricsStorage | null = null;

  private constructor(options: ContextManagerOptions = {}) {
    this.debugMode = options.debugMode ?? false;
    this.enableSnapshots = options.enableSnapshots ?? false;

    if (options.enableTracing !== false) {
      this.initializeTraceStorage(options.traceOptions);
    }

    if (options.enableMemoryMetrics) {
      this.initializeMemoryStorage(options.memoryOptions);
    }
  }

  static getInstance(options?: ContextManagerOptions): ContextManager {
    if (ContextManager.instance === undefined) {
      ContextManager.instance = new ContextManager(options);
    }
    return ContextManager.instance;
  }

  static reset(): void {
    if (ContextManager.instance) {
      ContextManager.instance.dispose();
      ContextManager.instance = undefined;
    }
  }

  private initializeTraceStorage(options?: Partial<TraceStorageOptions>): void {
    this.traceStorage = new TraceStorage({
      name: "trace-storage",
      debugMode: this.debugMode,
      ...options,
    });

    this.registerStorage("trace", this.traceStorage, true);
  }

  private initializeMemoryStorage(
    options?: Partial<MemoryMetricsOptions>
  ): void {
    this.memoryStorage = new MemoryMetricsStorage({
      name: "memory-metrics",
      debugMode: this.debugMode,
      ...options,
    });

    this.registerStorage("memory", this.memoryStorage, true);
  }

  registerStorage<T>(
    name: string,
    storage: BaseAsyncStorage<T>,
    enabled: boolean = true
  ): void {
    if (this.storages.has(name)) {
      this.logWarning(`Storage '${name}' already registered, replacing`);
    }

    this.storages.set(name, {
      name,
      storage,
      enabled,
    });

    this.logDebug(`Registered storage: ${name} (enabled: ${enabled})`);
  }

  unregisterStorage(name: string): boolean {
    const instance = this.storages.get(name);
    if (instance) {
      instance.storage.disable();
      this.storages.delete(name);
      this.logDebug(`Unregistered storage: ${name}`);
      return true;
    }
    return false;
  }

  getStorage<T = unknown>(name: string): BaseAsyncStorage<T> | undefined {
    const instance = this.storages.get(name);
    if (!instance?.enabled) {
      return undefined;
    }
    return instance.storage as BaseAsyncStorage<T>;
  }

  enableStorage(name: string): boolean {
    const instance = this.storages.get(name);
    if (instance) {
      instance.enabled = true;
      this.logDebug(`Enabled storage: ${name}`);
      return true;
    }
    return false;
  }

  disableStorage(name: string): boolean {
    const instance = this.storages.get(name);
    if (instance) {
      instance.enabled = false;
      instance.storage.disable();
      this.logDebug(`Disabled storage: ${name}`);
      return true;
    }
    return false;
  }

  startTrace(metadata: TraceMetadata): void {
    if (this.traceStorage) {
      this.traceStorage.startTrace(metadata);
    }
  }

  endTrace(traceId: string): void {
    if (this.traceStorage) {
      this.traceStorage.endTrace(traceId);
    }
  }

  updateTrace(traceId: string, updates: Partial<TraceMetadata>): void {
    if (this.traceStorage) {
      this.traceStorage.updateTrace(traceId, updates);
    }
  }

  getTrace(traceId: string): TraceMetadata | undefined {
    return this.traceStorage?.getTrace(traceId);
  }

  getCurrentParentId(): string | undefined {
    return this.traceStorage?.getCurrentParentId();
  }

  getTraceStack(): string[] {
    return this.traceStorage?.getTraceStack() ?? [];
  }

  getTraceHierarchy(): string[] {
    return this.traceStorage?.getTraceHierarchy() ?? [];
  }

  getContextInfo(): ReturnType<TraceStorage["getContextInfo"]> {
    if (!this.traceStorage) {
      return null;
    }
    this.traceStorage.ensureContext();
    return this.traceStorage.getContextInfo();
  }

  recordMemorySnapshot(): void {
    if (this.memoryStorage) {
      this.memoryStorage.recordSnapshot();
    }
  }

  getMemoryStats(): ReturnType<MemoryMetricsStorage["getMemoryStats"]> {
    return this.memoryStorage?.getMemoryStats() ?? null;
  }

  getMemoryTrend(
    windowSize?: number
  ): ReturnType<MemoryMetricsStorage["getMemoryTrend"]> {
    return this.memoryStorage?.getMemoryTrend(windowSize) ?? null;
  }

  runInContext<R>(callback: () => R, options?: { trackMemory?: boolean }): R {
    if (!this.traceStorage) {
      return callback();
    }

    return this.traceStorage.runInNewContext(() => {
      if (options?.trackMemory && this.memoryStorage) {
        return this.memoryStorage.runWithMemoryTracking(callback);
      }
      return callback();
    });
  }

  runWithStorage<T, R>(storageName: string, context: T, callback: () => R): R {
    const storage = this.getStorage<T>(storageName);
    if (!storage) {
      this.logWarning(`Storage '${storageName}' not found or disabled`);
      return callback();
    }

    return storage.run(context, callback);
  }

  captureSnapshot(options?: SnapshotOptions): ContextSnapshot | null {
    if (!this.traceStorage) {
      this.logDebug("No trace storage available for snapshot");
      return null;
    }

    return this.traceStorage.captureSnapshot(options);
  }

  captureAllSnapshots(): Record<string, ContextSnapshot | null> {
    const snapshots: Record<string, ContextSnapshot | null> = {};

    for (const [name, instance] of this.storages) {
      if (instance.enabled) {
        snapshots[name] = instance.storage.captureSnapshot({
          label: `${name}-snapshot`,
        });
      }
    }

    return snapshots;
  }

  runWithSnapshot<R>(
    callback: () => R,
    options?: SnapshotOptions & { storageNames?: string[] }
  ): R {
    if (!this.enableSnapshots) {
      return callback();
    }

    const storageNames = options?.storageNames || ["trace"];
    const storages = storageNames
      .map((name) => this.getStorage(name))
      .filter(
        (storage): storage is BaseAsyncStorage<unknown> => storage !== undefined
      );

    if (storages.length === 0) {
      this.logDebug("No storages available for snapshot execution");
      return callback();
    }

    const primaryStorage = storages[0];
    return primaryStorage.runWithSnapshot(callback, options);
  }

  getSnapshots(storageName?: string): ReadonlyArray<ContextSnapshot> {
    if (storageName) {
      const storage = this.getStorage(storageName);
      return storage?.getSnapshots() ?? [];
    }

    if (this.traceStorage) {
      return this.traceStorage.getSnapshots();
    }

    return [];
  }

  getLatestSnapshot(storageName?: string): ContextSnapshot | null {
    if (storageName) {
      const storage = this.getStorage(storageName);
      return storage?.getLatestSnapshot() ?? null;
    }

    if (this.traceStorage) {
      return this.traceStorage.getLatestSnapshot();
    }

    return null;
  }

  clearSnapshots(storageName?: string): void {
    if (storageName) {
      const storage = this.getStorage(storageName);
      storage?.clearSnapshots();
    } else {
      for (const instance of this.storages.values()) {
        if (instance.enabled) {
          instance.storage.clearSnapshots();
        }
      }
    }

    this.logDebug(
      `Cleared snapshots${
        storageName ? ` for ${storageName}` : " for all storages"
      }`
    );
  }

  isSnapshotSupported(storageName?: string): boolean {
    if (storageName) {
      const storage = this.getStorage(storageName);
      return storage?.isSnapshotSupported() ?? false;
    }

    return this.traceStorage?.isSnapshotSupported() ?? false;
  }

  getAllStats(): Record<string, StorageStats> {
    const stats: Record<string, StorageStats> = {};

    for (const [name, instance] of this.storages) {
      if (instance.enabled) {
        stats[name] = {
          enabled: true,
          metrics: instance.storage.getMetrics(),
          isUsingFallback: instance.storage.isUsingFallback(),
          isAvailable: instance.storage.isAvailable(),
        };

        if (name === "trace" && this.traceStorage) {
          stats[name].traceStats = this.traceStorage.getStats();
        }

        if (name === "memory" && this.memoryStorage) {
          stats[name].memoryStats = this.memoryStorage.getMemoryStats();
          stats[name].memoryTrend = this.memoryStorage.getMemoryTrend();
        }
      } else {
        stats[name] = { enabled: false };
      }
    }

    return stats;
  }

  clearAll(): void {
    for (const instance of this.storages.values()) {
      if (instance.enabled) {
        instance.storage.disable();
      }
    }

    if (this.traceStorage) {
      this.traceStorage.clearContext();
    }

    if (this.memoryStorage) {
      this.memoryStorage.clearLeaks();
    }
  }

  dispose(): void {
    this.logDebug("Disposing context manager");

    if (this.memoryStorage) {
      this.memoryStorage.dispose();
    }

    for (const instance of this.storages.values()) {
      instance.storage.disable();
    }

    this.storages.clear();
    this.traceStorage = null;
    this.memoryStorage = null;
  }

  updateFromConfig(config: Partial<QuzzConfig>): void {
    if (config.debugContext !== undefined) {
      this.debugMode = config.debugContext;

      for (const instance of this.storages.values()) {
        if ("debugMode" in instance.storage) {
          (
            instance.storage as BaseAsyncStorage<unknown> & {
              debugMode: boolean;
            }
          ).debugMode = config.debugContext;
        }
      }
    }

    if (config.performance?.trackMemory !== undefined) {
      if (config.performance.trackMemory && !this.memoryStorage) {
        this.initializeMemoryStorage();
      } else if (!config.performance.trackMemory && this.memoryStorage) {
        this.disableStorage("memory");
      }
    }

    if (config.contextTracking !== undefined) {
      if (config.contextTracking) {
        this.enableStorage("trace");
      } else {
        this.disableStorage("trace");
      }
    }
  }

  private logDebug(message: string, ...args: unknown[]): void {
    if (this.debugMode) {
      console.debug(`[quzz:context-manager] ${message}`, ...args);
    }
  }

  private logWarning(message: string, ...args: unknown[]): void {
    if (this.debugMode) {
      console.warn(`[quzz:context-manager] ${message}`, ...args);
    }
  }
}

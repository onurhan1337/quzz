/**
 * Developer-friendly API for storage operations
 */

import { ContextManager } from "./context-manager";
import { ConfigManager } from "../config";
import { serializeError as serializeErrorWithStack } from "../utils";
import type { TraceMetadata, SerializedError } from "../types";

/**
 * Performance checkpoint data
 */
interface CheckpointData {
  [key: string]: number;
}

/**
 * Fluent API for storage operations with better DX
 */
export class StorageAPI {
  private manager: ContextManager;

  constructor(manager?: ContextManager) {
    this.manager = manager ?? ContextManager.getInstance();
  }

  /**
   * Create a new trace context with automatic cleanup
   */
  withTrace<R>(
    metadata: Omit<TraceMetadata, "traceId" | "renderStart">,
    callback: (traceId: string) => R
  ): R {
    const traceId = this.generateTraceId();
    const fullMetadata: TraceMetadata = {
      ...metadata,
      traceId,
      renderStart: Date.now(),
    };

    this.manager.startTrace(fullMetadata);

    try {
      const result = callback(traceId);

      // Handle async callbacks
      if (result instanceof Promise) {
        return result.finally(() => {
          this.manager.updateTrace(traceId, {
            renderEnd: Date.now(),
            duration: Date.now() - fullMetadata.renderStart,
          });
          this.manager.endTrace(traceId);
        }) as R;
      }

      this.manager.updateTrace(traceId, {
        renderEnd: Date.now(),
        duration: Date.now() - fullMetadata.renderStart,
      });
      return result;
    } catch (error) {
      this.manager.updateTrace(traceId, {
        error: this.serializeError(error),
        renderEnd: Date.now(),
        duration: Date.now() - fullMetadata.renderStart,
      });
      throw error;
    } finally {
      if (!this.isAsyncFunction(callback)) {
        this.manager.endTrace(traceId);
      }
    }
  }

  /**
   * Create a new isolated context
   */
  withContext<R>(callback: () => R, options?: { trackMemory?: boolean }): R {
    return this.manager.runInContext(callback, options);
  }

  /**
   * Track memory for a specific operation
   */
  withMemoryTracking<R>(label: string, callback: () => R): R {
    const memoryBefore = this.manager.getMemoryStats();

    try {
      const result = callback();

      const memoryAfter = this.manager.getMemoryStats();
      if (memoryBefore?.current && memoryAfter?.current) {
        const growth =
          memoryAfter.current.heapUsed - memoryBefore.current.heapUsed;
        console.debug(
          `[quzz:memory] ${label}: ${(growth / 1024 / 1024).toFixed(2)}MB`
        );
      }

      return result;
    } catch (error) {
      console.error(`[quzz:memory] ${label} failed:`, error);
      throw error;
    }
  }

  /**
   * Create a checkpoint for performance monitoring
   */
  checkpoint(name: string): () => void {
    const start = performance.now();
    const parentId = this.manager.getCurrentParentId();

    return () => {
      const duration = performance.now() - start;
      console.debug(
        `[quzz:perf] Checkpoint '${name}': ${duration.toFixed(2)}ms`
      );

      if (parentId) {
        const checkpointData: CheckpointData = {
          [`checkpoint_${name}`]: duration,
        };

        // Create a proper update object that extends Partial<TraceMetadata>
        const updateData: Partial<TraceMetadata> & CheckpointData = {
          ...checkpointData,
        };

        this.manager.updateTrace(parentId, updateData);
      }
    };
  }

  /**
   * Batch multiple trace operations
   */
  async batch(operations: Array<() => void | Promise<void>>): Promise<void[]> {
    return Promise.all(
      operations.map(async (op) => {
        const result = this.withContext(() => op(), { trackMemory: false });
        // Ensure we always return void
        if (result instanceof Promise) {
          await result;
        }
        return;
      })
    );
  }

  /**
   * Enable specific storages
   */
  enable(...storageNames: string[]): void {
    storageNames.forEach((name) => this.manager.enableStorage(name));
  }

  /**
   * Disable specific storages
   */
  disable(...storageNames: string[]): void {
    storageNames.forEach((name) => this.manager.disableStorage(name));
  }

  /**
   * Get current statistics
   */
  getStats(): ReturnType<ContextManager["getAllStats"]> {
    return this.manager.getAllStats();
  }

  /**
   * Create a scoped API for a specific feature
   */
  scope(name: string): ScopedStorageAPI {
    return new ScopedStorageAPI(this.manager, name);
  }

  /**
   * Check if a function is async
   */
  private isAsyncFunction(func: Function): boolean {
    return (
      func.constructor.name === "AsyncFunction" ||
      func.constructor.name === "AsyncGeneratorFunction"
    );
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private serializeError(error: unknown): SerializedError {
    const mapStackTraces =
      ConfigManager.getInstance().getConfig().mapStackTraces ?? false;

    if (error instanceof Error) {
      return serializeErrorWithStack(error, 3, 0, { mapStackTraces });
    }

    if (error && typeof error === "object") {
      const obj = error as Record<string, unknown>;
      const fallback = new Error(obj.message ? String(obj.message) : "Error");
      if (obj.stack) {
        fallback.stack = String(obj.stack);
      }
      if (obj.name) {
        fallback.name = String(obj.name);
      }
      if (obj.code !== undefined) {
        (fallback as Error & { code?: string | number }).code = obj.code as
          | string
          | number;
      }
      return serializeErrorWithStack(fallback, 3, 0, { mapStackTraces });
    }

    return serializeErrorWithStack(new Error(String(error)), 3, 0, {
      mapStackTraces,
    });
  }
}

/**
 * Scoped API for feature-specific operations
 */
export class ScopedStorageAPI {
  constructor(
    private readonly manager: ContextManager,
    private readonly scope: string
  ) {}

  trace<R>(name: string, callback: (traceId: string) => R): R {
    const api = new StorageAPI(this.manager);
    return api.withTrace(
      {
        componentName: `${this.scope}.${name}`,
        tags: [this.scope],
      },
      callback
    );
  }

  measure<R>(name: string, callback: () => R): R {
    const start = performance.now();
    try {
      const result = callback();
      const duration = performance.now() - start;
      console.debug(`[${this.scope}:perf] ${name}: ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      console.error(`[${this.scope}:error] ${name}:`, error);
      throw error;
    }
  }

  /**
   * Async version of measure for async operations
   */
  async measureAsync<R>(name: string, callback: () => Promise<R>): Promise<R> {
    const start = performance.now();
    try {
      const result = await callback();
      const duration = performance.now() - start;
      console.debug(`[${this.scope}:perf] ${name}: ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      console.error(`[${this.scope}:error] ${name}:`, error);
      throw error;
    }
  }
}

/**
 * Global storage API instance
 */
export const storage = new StorageAPI();

import type { TraceMetadata } from "./types";
import { TraceCollector } from "./visualizer/trace-collector";
import { ConfigManager } from "./config";
import { MemoryLeakDetector, ContextValidator } from "./validators";

interface RequestContext {
  traceStack: string[];
  traceMap: Map<string, TraceMetadata>;
  contextId: string;
  createdAt: number;
}

type AsyncLocalStorageType<T> = {
  new (): AsyncLocalStorageInstance<T>;
};

type AsyncLocalStorageInstance<T> = {
  getStore(): T | undefined;
  enterWith(store: T): void;
  run<R>(store: T, callback: () => R): R;
};

const parseNodeVersion = (versionString: string): { major: number; minor: number; patch: number } => {
  const match = versionString.match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    return { major: 0, minor: 0, patch: 0 };
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
};

const isNodeVersionAtLeast = (major: number, minor: number = 0): boolean => {
  if (typeof process === "undefined" || !process.version) {
    return false;
  }
  const current = parseNodeVersion(process.version);
  if (current.major > major) return true;
  if (current.major < major) return false;
  return current.minor >= minor;
};

const loadAsyncLocalStorageModule = (): any => {
  try {
    const module = require("node:async_hooks");
    if (module.AsyncLocalStorage) return module.AsyncLocalStorage;
  } catch {}

  try {
    const module = require("async_hooks");
    if (module.AsyncLocalStorage) return module.AsyncLocalStorage;
  } catch {}

  return null;
};

const createSafeAsyncLocalStorageWrapper = (OriginalClass: any): AsyncLocalStorageType<RequestContext> => {
  return class SafeAsyncLocalStorage {
    private instance: any;

    constructor() {
      try {
        this.instance = new OriginalClass();
      } catch (e) {
        console.error("[quzz] AsyncLocalStorage initialization failed:", e);
        this.instance = null;
      }
    }

    getStore(): RequestContext | undefined {
      if (!this.instance) return undefined;
      try {
        return this.instance.getStore();
      } catch {
        return undefined;
      }
    }

    enterWith(store: RequestContext): void {
      if (!this.instance) return;
      try {
        this.instance.enterWith(store);
      } catch {}
    }

    run<R>(store: RequestContext, callback: () => R): R {
      if (!this.instance) return callback();
      try {
        return this.instance.run(store, callback);
      } catch {
        return callback();
      }
    }
  } as any;
};

let versionWarningShown = false;

const showVersionWarning = (nodeVersion: string, isSupported: boolean, isStable: boolean): void => {
  if (versionWarningShown) return;

  if (!isSupported) {
    console.warn(
      `[quzz] Warning: Node.js ${nodeVersion} detected. AsyncLocalStorage requires Node.js 12.17.0 or higher. ` +
      `Using global fallback mechanism. Consider upgrading to Node.js 14.0.0 or higher for stable async context tracking.`
    );
    versionWarningShown = true;
  } else if (!isStable) {
    console.warn(
      `[quzz] Warning: Node.js ${nodeVersion} detected. AsyncLocalStorage is experimental and may be unstable ` +
      `in Node.js versions below 14.0.0. Consider upgrading to Node.js 14.0.0 or higher for better stability.`
    );
    versionWarningShown = true;
  }
};

const initializeAsyncLocalStorage = (): AsyncLocalStorageType<RequestContext> | null => {
  if (typeof process === "undefined" || !process.versions?.node) {
    return null;
  }

  const isNode14OrHigher = isNodeVersionAtLeast(14, 0);
  const isNode12_17OrHigher = isNodeVersionAtLeast(12, 17);

  showVersionWarning(process.version, isNode12_17OrHigher, isNode14OrHigher);

  if (!isNode12_17OrHigher) {
    return null;
  }

  const AsyncLocalStorageModule = loadAsyncLocalStorageModule();

  if (!AsyncLocalStorageModule) {
    console.warn(
      `[quzz] Failed to load AsyncLocalStorage module. Using global fallback mechanism.`
    );
    return null;
  }

  return isNode14OrHigher
    ? AsyncLocalStorageModule
    : createSafeAsyncLocalStorageWrapper(AsyncLocalStorageModule);
};

let AsyncLocalStorageClass = initializeAsyncLocalStorage();

/**
 * Trace context for tracking nested component hierarchies with request isolation
 */
class TraceContext {
  private static instance: TraceContext;
  private asyncLocalStorage: AsyncLocalStorageInstance<RequestContext> | null;
  private contextOverhead: Map<string, number> = new Map();

  // Fallback for environments without AsyncLocalStorage
  private globalTraceStack: string[] = [];
  private globalTraceMap = new Map<string, TraceMetadata>();
  private globalContextId?: string;
  private globalCreatedAt?: number;

  private constructor() {
    if (AsyncLocalStorageClass) {
      try {
        this.asyncLocalStorage = new AsyncLocalStorageClass();

        if (this.asyncLocalStorage && isNodeVersionAtLeast(14, 0)) {
          const testStore: RequestContext = {
            traceStack: [],
            traceMap: new Map(),
            contextId: 'test',
            createdAt: Date.now()
          };
          this.asyncLocalStorage.run(testStore, () => {
            const retrieved = this.asyncLocalStorage?.getStore();
            if (!retrieved || retrieved.contextId !== 'test') {
              throw new Error('AsyncLocalStorage verification failed');
            }
          });
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        const nodeVersion = typeof process !== "undefined" ? process.version : 'unknown';

        console.warn(
          `[quzz] AsyncLocalStorage initialization failed (Node ${nodeVersion}): ${errorMessage}. ` +
          `Using global fallback mechanism for trace context management.`
        );
        this.asyncLocalStorage = null;
      }
    } else {
      this.asyncLocalStorage = null;

      if (typeof process !== "undefined" && process.versions?.node && !versionWarningShown) {
        console.info(
          `[quzz] Using global context fallback. AsyncLocalStorage is not available.`
        );
      }
    }
  }

  static getInstance(): TraceContext {
    if (!TraceContext.instance) {
      TraceContext.instance = new TraceContext();
    }
    return TraceContext.instance;
  }

  /**
   * Get current request context or fallback to global
   */
  private getContext(): RequestContext {
    if (this.asyncLocalStorage) {
      const store = this.asyncLocalStorage.getStore();
      if (store) return store;

      const newContext: RequestContext = {
        traceStack: [],
        traceMap: new Map(),
        contextId: this.generateContextId(),
        createdAt: Date.now(),
      };
      return newContext;
    }

    return {
      traceStack: this.globalTraceStack,
      traceMap: this.globalTraceMap,
      contextId:
        this.globalContextId ||
        (this.globalContextId = this.generateContextId()),
      createdAt: this.globalCreatedAt || (this.globalCreatedAt = Date.now()),
    };
  }

  /**
   * Generate unique context ID
   */
  private generateContextId(): string {
    return `ctx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate unique trace ID
   */
  generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Start a new trace
   */
  startTrace(metadata: TraceMetadata): void {
    const context = this.getContext();
    context.traceMap.set(metadata.traceId, metadata);
    context.traceStack.push(metadata.traceId);

    // Add to trace collector if visualization is enabled
    const config = ConfigManager.getInstance().getConfig();
    if (config.visualizer?.enabled) {
      const collector = TraceCollector.getInstance();
      if (!collector.getSession()) {
        collector.initialize(config.visualizer?.output, true);
      }
      collector.addTrace(metadata);
    }
  }

  /**
   * End a trace
   */
  endTrace(traceId: string): void {
    const context = this.getContext();
    const index = context.traceStack.indexOf(traceId);
    if (index !== -1) {
      context.traceStack.splice(index, 1);
    }

    // Clean up old traces to prevent memory leaks
    if (context.traceStack.length === 0 && context.traceMap.size > 100) {
      // Keep only last 100 traces for debugging
      const tracesToKeep = Array.from(context.traceMap.keys()).slice(-100);
      const newMap = new Map<string, TraceMetadata>();
      tracesToKeep.forEach((id) => {
        const trace = context.traceMap.get(id);
        if (trace) newMap.set(id, trace);
      });
      context.traceMap = newMap;
    }
  }

  /**
   * Get current parent trace ID
   */
  getCurrentParentId(): string | undefined {
    const context = this.getContext();
    return context.traceStack[context.traceStack.length - 1];
  }

  /**
   * Get trace metadata by ID
   */
  getTrace(traceId: string): TraceMetadata | undefined {
    const context = this.getContext();
    return context.traceMap.get(traceId);
  }

  /**
   * Update trace metadata
   */
  updateTrace(traceId: string, updates: Partial<TraceMetadata>): void {
    const context = this.getContext();
    const existing = context.traceMap.get(traceId);
    if (existing) {
      context.traceMap.set(traceId, { ...existing, ...updates });

      // Update in trace collector if visualization is enabled
      const config = ConfigManager.getInstance().getConfig();
      if (config.visualizer?.enabled) {
        TraceCollector.getInstance().updateTrace(traceId, updates);
      }
    }
  }

  /**
   * Get full trace hierarchy for current request
   */
  getTraceHierarchy(): string[] {
    const context = this.getContext();
    return [...context.traceStack];
  }

  /**
   * Clear all traces (for testing)
   */
  clear(): void {
    if (this.asyncLocalStorage) {
      const context = this.asyncLocalStorage.getStore();
      if (context) {
        context.traceStack = [];
        context.traceMap.clear();
      }
    }

    this.globalTraceStack = [];
    this.globalTraceMap.clear();
  }

  /**
   * Run a function in a new isolated request context
   */
  runInNewContext<T>(fn: () => T): T {
    const contextId = this.generateContextId();
    const startTime = typeof process !== "undefined" && process.hrtime ? process.hrtime.bigint() : Date.now();

    MemoryLeakDetector.trackContextCreation(contextId);

    try {
      if (this.asyncLocalStorage) {
        const newContext: RequestContext = {
          traceStack: [],
          traceMap: new Map(),
          contextId,
          createdAt: Date.now(),
        };

        const isNode14OrHigher = isNodeVersionAtLeast(14, 0);
        let result: T;

        try {
          result = this.asyncLocalStorage.run(newContext, () => {
            if (ConfigManager.getInstance().getConfig().debugContext && Math.random() < 0.01) {
              const validation = ContextValidator.validateContextState(
                newContext.traceStack,
                newContext.traceMap
              );
              if (!validation.valid) {
                console.error(
                  "[quzz:context] Context validation failed:",
                  validation.errors
                );
              }
            }
            return fn();
          });
        } catch (asyncStorageError) {
          if (!isNode14OrHigher) {
            console.warn(
              "[quzz:context] AsyncLocalStorage.run() failed in Node.js < 14. Falling back to global context.",
              asyncStorageError instanceof Error ? asyncStorageError.message : asyncStorageError
            );

            const previousStack = [...this.globalTraceStack];
            const previousMap = new Map(this.globalTraceMap);
            const previousContextId = this.globalContextId;
            const previousCreatedAt = this.globalCreatedAt;

            try {
              this.globalTraceStack = [];
              this.globalTraceMap = new Map();
              this.globalContextId = contextId;
              this.globalCreatedAt = Date.now();

              result = fn();
            } finally {
              this.globalTraceStack = previousStack;
              this.globalTraceMap = previousMap;
              this.globalContextId = previousContextId;
              this.globalCreatedAt = previousCreatedAt;
            }
          } else {
            throw asyncStorageError;
          }
        }

        if (ConfigManager.getInstance().getConfig().debugContext) {
          const endTime = typeof process !== "undefined" && process.hrtime
            ? Number(process.hrtime.bigint() - BigInt(startTime)) / 1000000
            : Date.now() - Number(startTime);

          this.contextOverhead.set(contextId, endTime);

          if (this.contextOverhead.size > 100) {
            const oldestKeys = Array.from(this.contextOverhead.keys()).slice(
              0,
              20
            );
            oldestKeys.forEach((key) => {
              this.contextOverhead.delete(key);
              MemoryLeakDetector.clearContext(key);
            });
          }
        }

        MemoryLeakDetector.clearContext(contextId);

        return result;
      }

      const previousStack = [...this.globalTraceStack];
      const previousMap = new Map(this.globalTraceMap);
      const previousContextId = this.globalContextId;
      const previousCreatedAt = this.globalCreatedAt;

      try {
        this.globalTraceStack = [];
        this.globalTraceMap = new Map();
        this.globalContextId = contextId;
        this.globalCreatedAt = Date.now();

        return fn();
      } finally {
        this.globalTraceStack = previousStack;
        this.globalTraceMap = previousMap;
        this.globalContextId = previousContextId;
        this.globalCreatedAt = previousCreatedAt;
        MemoryLeakDetector.clearContext(contextId);
      }
    } catch (error) {
      MemoryLeakDetector.clearContext(contextId);

      const errorContext = {
        contextId,
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        nodeVersion: typeof process !== "undefined" ? process.version : "unknown",
        usingFallback: !this.asyncLocalStorage
      };

      if (ConfigManager.getInstance().getConfig().debugContext) {
        console.error(
          "[quzz:context] Error in context execution:",
          errorContext
        );
      }

      throw error;
    }
  }

  /**
   * Export trace tree for visualization
   */
  exportTraceTree(): ReturnType<TraceCollector['getSession']> | null {
    const config = ConfigManager.getInstance().getConfig();
    if (!config.visualizer?.enabled) {
      return null;
    }

    const collector = TraceCollector.getInstance();
    return collector.getSession();
  }

  /**
   * Save collected traces to file
   */
  async saveTraces(filePath?: string): Promise<void> {
    const config = ConfigManager.getInstance().getConfig();
    if (!config.visualizer?.enabled) {
      throw new Error(
        "Visualization is not enabled. Set visualizer.enabled to true in configuration."
      );
    }

    const collector = TraceCollector.getInstance();
    await collector.save(filePath);
  }

  /**
   * Get context overhead metrics (for debugging/benchmarking)
   * @internal
   */
  getContextOverhead(): {
    avg: number;
    min: number;
    max: number;
    count: number;
  } | null {
    if (this.contextOverhead.size === 0) return null;

    const values = Array.from(this.contextOverhead.values());
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      avg: sum / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    };
  }

  /**
   * Get current context metadata (for debugging only)
   * @internal
   */
  getCurrentContext(): {
    contextId: string;
    createdAt: number;
    traceStackDepth: number;
    traceMapSize: number;
  } | null {
    try {
      const context = this.getContext();
      return {
        contextId: context.contextId,
        createdAt: context.createdAt,
        traceStackDepth: context.traceStack.length,
        traceMapSize: context.traceMap.size,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get runtime environment information
   * @internal
   */
  getRuntimeInfo(): {
    nodeVersion: string | undefined;
    asyncLocalStorageAvailable: boolean;
    usingFallback: boolean;
    isStableVersion: boolean;
    minimumRequiredVersion: string;
    recommendedVersion: string;
  } {
    const nodeVersion = typeof process !== "undefined" ? process.version : undefined;
    const hasAsyncLocalStorage = !!this.asyncLocalStorage;
    const isNode14OrHigher = isNodeVersionAtLeast(14, 0);

    return {
      nodeVersion,
      asyncLocalStorageAvailable: !!AsyncLocalStorageClass,
      usingFallback: !hasAsyncLocalStorage,
      isStableVersion: isNode14OrHigher,
      minimumRequiredVersion: "12.17.0",
      recommendedVersion: "14.0.0"
    };
  }
}

export { TraceContext };

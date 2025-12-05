import type { TraceMetadata } from "./types";
import { TraceCollector } from "./visualizer/trace-collector";
import { ConfigManager } from "./config";
import { MemoryLeakDetector, ContextValidator } from "./validators";
import { ContextManager, type StorageStats } from "./storage/context-manager";
import { getNodeVersionInfo } from "./utils/node-version";

/**
 * Trace context for tracking nested component hierarchies with request isolation
 */
class TraceContext {
  private static instance: TraceContext;
  private readonly contextManager: ContextManager;
  private contextOverhead: Map<string, number> = new Map();

  private constructor() {
    const config = ConfigManager.getInstance().getConfig();
    const versionInfo = getNodeVersionInfo();

    if (!versionInfo.isSupported && config.debugContext) {
      console.warn(
        `[quzz] Node.js ${versionInfo.version} detected. AsyncLocalStorage requires Node.js 12.17.0 or higher. ` +
          `Using fallback mechanism.`
      );
    } else if (!versionInfo.isStable && config.debugContext) {
      console.info(
        `[quzz] Node.js ${versionInfo.version} detected. Consider upgrading to Node.js 14.0.0 or higher for better stability.`
      );
    }

    this.contextManager = ContextManager.getInstance({
      debugMode: config.debugContext,
      enableTracing: config.contextTracking !== false,
      enableMemoryMetrics: config.performance?.trackMemory,
      traceOptions: {
        maxStackDepth: 100,
        maxMapSize: 1000,
        cleanupThreshold: 100,
      },
      memoryOptions: {
        maxSnapshots: 100,
        snapshotInterval: 5000,
        leakThreshold: 50 * 1024 * 1024,
        autoSnapshot:
          config.performance?.trackMemory && config.performance?.aggregate,
      },
    });
  }

  static getInstance(): TraceContext {
    if (!TraceContext.instance) {
      TraceContext.instance = new TraceContext();
    }
    return TraceContext.instance;
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
    const config = ConfigManager.getInstance().getConfig();

    if (config.debugContext) {
      console.debug(
        `[quzz:startTrace] Starting trace for ${metadata.componentName}`,
        {
          traceId: metadata.traceId,
          parentTrace: metadata.parentTrace,
          hasParent: !!metadata.parentTrace,
        }
      );
    }

    this.contextManager.startTrace(metadata);

    if (config.visualizer?.enabled) {
      const collector = TraceCollector.getInstance();
      if (!collector.getSession()) {
        collector.initialize(config.visualizer?.output, true);
      }

      if (config.debugContext) {
        console.debug(`[quzz:addTrace] Adding to collector`, {
          componentName: metadata.componentName,
          traceId: metadata.traceId,
          parentTrace: metadata.parentTrace,
        });
      }

      collector.addTrace(metadata);
    }
  }

  /**
   * End a trace
   */
  endTrace(traceId: string): void {
    this.contextManager.endTrace(traceId);
  }

  /**
   * Get current parent trace ID
   */
  getCurrentParentId(): string | undefined {
    return this.contextManager.getCurrentParentId();
  }

  /**
   * Get trace metadata by ID
   */
  getTrace(traceId: string): TraceMetadata | undefined {
    return this.contextManager.getTrace(traceId);
  }

  /**
   * Update trace metadata
   */
  updateTrace(traceId: string, updates: Partial<TraceMetadata>): void {
    this.contextManager.updateTrace(traceId, updates);

    const config = ConfigManager.getInstance().getConfig();
    if (config.visualizer?.enabled) {
      TraceCollector.getInstance().updateTrace(traceId, updates);
    }
  }

  /**
   * Get full trace hierarchy for current request
   */
  getTraceHierarchy(): string[] {
    return this.contextManager.getTraceHierarchy();
  }

  /**
   * Clear all traces (for testing)
   */
  clear(): void {
    this.contextManager.clearAll();
  }

  /**
   * Run a function in a new isolated request context
   */
  runInNewContext<T>(fn: () => T): T {
    const contextId = `ctx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const startTime =
      typeof process !== "undefined" && process.hrtime
        ? process.hrtime.bigint()
        : Date.now();

    MemoryLeakDetector.trackContextCreation(contextId);

    try {
      const config = ConfigManager.getInstance().getConfig();
      const trackMemory = config.performance?.trackMemory ?? false;

      const result = this.contextManager.runInContext(
        () => {
          if (config.debugContext && Math.random() < 0.01) {
            const traceStorage =
              this.contextManager.getStorage<
                import("./storage/trace-storage").TraceContext
              >("trace");

            if (traceStorage) {
              const traceContext = traceStorage.getStore();
              if (traceContext) {
                const validation = ContextValidator.validateContextState(
                  traceContext.traceStack,
                  traceContext.traceMap
                );
                if (!validation.valid) {
                  console.error(
                    "[quzz:context] Context validation failed:",
                    validation.errors
                  );
                }
              }
            }
          }
          return fn();
        },
        { trackMemory }
      );

      if (config.debugContext) {
        const endTime =
          typeof process !== "undefined" && process.hrtime
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
    } catch (error) {
      MemoryLeakDetector.clearContext(contextId);

      const errorContext = {
        contextId,
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        nodeVersion:
          typeof process !== "undefined" ? process.version : "unknown",
        stats: this.contextManager.getAllStats(),
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
  exportTraceTree(): ReturnType<TraceCollector["getSession"]> | null {
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
      const traceStorage =
        this.contextManager.getStorage<
          import("./storage/trace-storage").TraceContext
        >("trace");
      if (!traceStorage) return null;

      const context = traceStorage.getStore();
      if (!context) return null;

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
    storageStats: Record<string, StorageStats>;
  } {
    const versionInfo = getNodeVersionInfo();
    const stats = this.contextManager.getAllStats();

    return {
      nodeVersion: versionInfo.version,
      asyncLocalStorageAvailable: versionInfo.isSupported,
      usingFallback: stats.trace?.isUsingFallback ?? true,
      isStableVersion: versionInfo.isStable,
      minimumRequiredVersion: "12.17.0",
      recommendedVersion: "14.0.0",
      storageStats: stats,
    };
  }

  /**
   * Get memory statistics
   * @internal
   */
  getMemoryStats(): ReturnType<ContextManager["getMemoryStats"]> {
    return this.contextManager.getMemoryStats();
  }

  /**
   * Get memory trend
   * @internal
   */
  getMemoryTrend(
    windowSize?: number
  ): ReturnType<ContextManager["getMemoryTrend"]> {
    return this.contextManager.getMemoryTrend(windowSize);
  }

  /**
   * Update configuration
   * @internal
   */
  updateConfig(
    config: Parameters<ContextManager["updateFromConfig"]>[0]
  ): void {
    this.contextManager.updateFromConfig(config);
  }
}

export { TraceContext };

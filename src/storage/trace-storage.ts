import type { TraceMetadata } from "../types";
import { BaseAsyncStorage, type StorageOptions } from "./base";

export interface TraceContext {
  traceStack: string[];
  traceMap: Map<string, TraceMetadata>;
  contextId: string;
  createdAt: number;
}

export interface TraceStorageOptions extends StorageOptions {
  maxStackDepth?: number;
  maxMapSize?: number;
  cleanupThreshold?: number;
}

export class TraceStorage extends BaseAsyncStorage<TraceContext> {
  private readonly maxStackDepth: number;
  private readonly maxMapSize: number;
  private readonly cleanupThreshold: number;

  constructor(options: TraceStorageOptions = { name: "trace-storage" }) {
    super(options);
    this.maxStackDepth = options.maxStackDepth ?? 100;
    this.maxMapSize = options.maxMapSize ?? 1000;
    this.cleanupThreshold = options.cleanupThreshold ?? 100;
  }

  protected createDefaultStore(): TraceContext {
    return {
      traceStack: [],
      traceMap: new Map(),
      contextId: this.generateContextId(),
      createdAt: Date.now(),
    };
  }

  protected validateStore(store: unknown): store is TraceContext {
    if (!store || typeof store !== "object") return false;

    const s = store as Record<string, unknown>;
    return (
      Array.isArray(s.traceStack) &&
      s.traceMap instanceof Map &&
      typeof s.contextId === "string" &&
      typeof s.createdAt === "number"
    );
  }

  startTrace(metadata: TraceMetadata): void {
    const context = this.getOrCreateContext();
    if (!context) return;

    if (context.traceStack.length >= this.maxStackDepth) {
      this.logError(`Trace stack depth exceeded (${this.maxStackDepth})`);
      return;
    }

    const ConfigManager = require("../config").ConfigManager;
    const config = ConfigManager.getInstance().getConfig();
    const autoLinkParent = config.autoLinkParent ?? true;

    if (autoLinkParent) {
      const parentId = context.traceStack[context.traceStack.length - 1];
      if (parentId && !metadata.parentTrace) {
        metadata.parentTrace = parentId;
        this.logDebug(
          `Linked ${metadata.componentName} (${metadata.traceId}) to parent ${parentId}`
        );
      }
    }

    context.traceMap.set(metadata.traceId, metadata);
    context.traceStack.push(metadata.traceId);

    this.logDebug(
      `Stack push: ${metadata.componentName} (${metadata.traceId}), depth: ${context.traceStack.length}`
    );

    if (context.traceMap.size > this.maxMapSize) {
      this.performCleanup(context);
    }
  }

  endTrace(traceId: string): void {
    const context = this.getStore();
    if (!context) return;

    const lastId = context.traceStack[context.traceStack.length - 1];
    if (lastId === traceId) {
      context.traceStack.pop();
      this.logDebug(
        `Stack pop: ${traceId}, depth: ${context.traceStack.length}`
      );
    } else {
      const index = context.traceStack.indexOf(traceId);
      if (index !== -1) {
        const trace = context.traceMap.get(traceId);
        const componentName = trace?.componentName || traceId;

        if (this.debugMode) {
          console.warn(
            `[quzz:trace-storage] Stack order mismatch: Expected ${lastId} but got ${traceId} (${componentName}). ` +
              `This may indicate a race condition or out-of-order completion in parallel rendering.`
          );
        }

        context.traceStack.splice(index, 1);
        this.logDebug(
          `Stack splice: ${traceId} at index ${index}, depth: ${context.traceStack.length}`
        );
      } else {
        this.logDebug(`Stack miss: ${traceId} not found in stack`);
      }
    }

    if (
      context.traceStack.length === 0 &&
      context.traceMap.size > this.cleanupThreshold
    ) {
      this.performCleanup(context);
    }
  }

  updateTrace(traceId: string, updates: Partial<TraceMetadata>): void {
    const context = this.getStore();
    if (!context) return;

    const existing = context.traceMap.get(traceId);
    if (existing) {
      context.traceMap.set(traceId, { ...existing, ...updates });
    }
  }

  getTrace(traceId: string): TraceMetadata | undefined {
    const context = this.getStore();
    return context?.traceMap.get(traceId);
  }

  getCurrentParentId(): string | undefined {
    const context = this.getStore();
    if (!context) return undefined;
    return context.traceStack[context.traceStack.length - 1];
  }

  getTraceHierarchy(): string[] {
    const context = this.getStore();
    return context ? [...context.traceStack] : [];
  }

  getTraceStack(): string[] {
    const context = this.getStore();
    return context?.traceStack ?? [];
  }

  getContextInfo(): {
    contextId: string;
    createdAt: number;
    stackDepth: number;
    mapSize: number;
  } | null {
    const context = this.getStore();
    if (!context) return null;

    return {
      contextId: context.contextId,
      createdAt: context.createdAt,
      stackDepth: context.traceStack.length,
      mapSize: context.traceMap.size,
    };
  }

  ensureContext(): TraceContext | null {
    const existing = this.getStore();
    if (existing) {
      return existing;
    }
    const created = this.createDefaultStore();
    this.enterWith(created);
    return created;
  }

  clearContext(): void {
    const context = this.getStore();
    if (!context) return;

    context.traceStack = [];
    context.traceMap.clear();
  }

  runInNewContext<R>(callback: () => R): R {
    const newContext = this.createDefaultStore();
    return this.run(newContext, callback);
  }

  runInChildContext<R>(callback: () => R): R {
    const parentContext = this.getStore();
    if (!parentContext) {
      return this.runInNewContext(callback);
    }

    const childContext: TraceContext = {
      ...parentContext,
      traceStack: [...parentContext.traceStack],
      traceMap: parentContext.traceMap,
    };

    return this.run(childContext, callback);
  }

  private getOrCreateContext(): TraceContext | undefined {
    let context = this.getStore();
    if (!context) {
      context = this.createDefaultStore();
      this.enterWith(context);
    }
    return context;
  }

  private performCleanup(context: TraceContext): void {
    const activeTraces = new Set(context.traceStack);
    const tracesToKeep = Array.from(context.traceMap.keys())
      .filter((id) => activeTraces.has(id))
      .slice(-this.cleanupThreshold);

    const newMap = new Map<string, TraceMetadata>();
    tracesToKeep.forEach((id) => {
      const trace = context.traceMap.get(id);
      if (trace) newMap.set(id, trace);
    });

    context.traceMap = newMap;
    this.logDebug(`Cleaned up trace map, kept ${newMap.size} traces`);
  }

  private generateContextId(): string {
    return `ctx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  getStats(): {
    contexts: number;
    totalTraces: number;
    activeTraces: number;
    metrics: ReturnType<BaseAsyncStorage<TraceContext>["getMetrics"]>;
  } {
    const context = this.getStore();
    return {
      contexts: context ? 1 : 0,
      totalTraces: context?.traceMap.size ?? 0,
      activeTraces: context?.traceStack.length ?? 0,
      metrics: this.getMetrics(),
    };
  }
}

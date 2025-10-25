import type { TraceMetadata } from './types'
import { TraceCollector } from './visualizer/trace-collector'
import { ConfigManager } from './config'

interface RequestContext {
  traceStack: string[]
  traceMap: Map<string, TraceMetadata>
}

type AsyncLocalStorageType<T> = {
  new(): AsyncLocalStorageInstance<T>
}

type AsyncLocalStorageInstance<T> = {
  getStore(): T | undefined
  enterWith(store: T): void
  run<R>(store: T, callback: () => R): R
}

let AsyncLocalStorageClass: AsyncLocalStorageType<RequestContext> | null = null

if (typeof process !== 'undefined' && process.versions?.node) {
  try {
    const module = require('node:async_hooks')
    AsyncLocalStorageClass = module.AsyncLocalStorage
  } catch {
    AsyncLocalStorageClass = null
  }
}

/**
 * Trace context for tracking nested component hierarchies with request isolation
 */
class TraceContext {
  private static instance: TraceContext
  private asyncLocalStorage: AsyncLocalStorageInstance<RequestContext> | null

  // Fallback for environments without AsyncLocalStorage
  private globalTraceStack: string[] = []
  private globalTraceMap = new Map<string, TraceMetadata>()

  private constructor() {
    // Initialize AsyncLocalStorage if available
    if (AsyncLocalStorageClass) {
      try {
        this.asyncLocalStorage = new AsyncLocalStorageClass()
      } catch (e) {
        console.warn('[quzz] AsyncLocalStorage initialization failed, using global trace context')
        this.asyncLocalStorage = null
      }
    } else {
      this.asyncLocalStorage = null
    }
  }

  static getInstance(): TraceContext {
    if (!TraceContext.instance) {
      TraceContext.instance = new TraceContext()
    }
    return TraceContext.instance
  }

  /**
   * Get current request context or fallback to global
   */
  private getContext(): RequestContext {
    if (this.asyncLocalStorage) {
      const store = this.asyncLocalStorage.getStore()
      if (store) return store

      const newContext: RequestContext = {
        traceStack: [],
        traceMap: new Map()
      }
      return newContext
    }

    return {
      traceStack: this.globalTraceStack,
      traceMap: this.globalTraceMap
    }
  }

  /**
   * Generate unique trace ID
   */
  generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * Start a new trace
   */
  startTrace(metadata: TraceMetadata): void {
    const context = this.getContext()
    context.traceMap.set(metadata.traceId, metadata)
    context.traceStack.push(metadata.traceId)

    // Add to trace collector if visualization is enabled
    const config = ConfigManager.getInstance().getConfig()
    if (config.visualizer?.enabled) {
      const collector = TraceCollector.getInstance()
      if (!collector.getSession()) {
        collector.initialize(config.visualizer?.output, true)
      }
      collector.addTrace(metadata)
    }
  }

  /**
   * End a trace
   */
  endTrace(traceId: string): void {
    const context = this.getContext()
    const index = context.traceStack.indexOf(traceId)
    if (index !== -1) {
      context.traceStack.splice(index, 1)
    }

    // Clean up old traces to prevent memory leaks
    if (context.traceStack.length === 0 && context.traceMap.size > 100) {
      // Keep only last 100 traces for debugging
      const tracesToKeep = Array.from(context.traceMap.keys()).slice(-100)
      const newMap = new Map<string, TraceMetadata>()
      tracesToKeep.forEach(id => {
        const trace = context.traceMap.get(id)
        if (trace) newMap.set(id, trace)
      })
      context.traceMap = newMap
    }
  }

  /**
   * Get current parent trace ID
   */
  getCurrentParentId(): string | undefined {
    const context = this.getContext()
    return context.traceStack[context.traceStack.length - 1]
  }

  /**
   * Get trace metadata by ID
   */
  getTrace(traceId: string): TraceMetadata | undefined {
    const context = this.getContext()
    return context.traceMap.get(traceId)
  }

  /**
   * Update trace metadata
   */
  updateTrace(traceId: string, updates: Partial<TraceMetadata>): void {
    const context = this.getContext()
    const existing = context.traceMap.get(traceId)
    if (existing) {
      context.traceMap.set(traceId, { ...existing, ...updates })

      // Update in trace collector if visualization is enabled
      const config = ConfigManager.getInstance().getConfig()
      if (config.visualizer?.enabled) {
        TraceCollector.getInstance().updateTrace(traceId, updates)
      }
    }
  }

  /**
   * Get full trace hierarchy for current request
   */
  getTraceHierarchy(): string[] {
    const context = this.getContext()
    return [...context.traceStack]
  }

  /**
   * Clear all traces (for testing)
   */
  clear(): void {
    if (this.asyncLocalStorage) {
      const context = this.asyncLocalStorage.getStore()
      if (context) {
        context.traceStack = []
        context.traceMap.clear()
      }
    }

    // Also clear global state
    this.globalTraceStack = []
    this.globalTraceMap.clear()
  }

  /**
   * Run a function in a new isolated request context
   */
  runInNewContext<T>(fn: () => T): T {
    if (this.asyncLocalStorage) {
      return this.asyncLocalStorage.run({
        traceStack: [],
        traceMap: new Map()
      }, fn)
    }
    return fn()
  }

  /**
   * Export trace tree for visualization
   */
  exportTraceTree(): any {
    const config = ConfigManager.getInstance().getConfig()
    if (!config.visualizer?.enabled) {
      return null
    }

    const collector = TraceCollector.getInstance()
    return collector.getSession()
  }

  /**
   * Save collected traces to file
   */
  async saveTraces(filePath?: string): Promise<void> {
    const config = ConfigManager.getInstance().getConfig()
    if (!config.visualizer?.enabled) {
      throw new Error('Visualization is not enabled. Set visualizer.enabled to true in configuration.')
    }

    const collector = TraceCollector.getInstance()
    await collector.save(filePath)
  }
}

export { TraceContext }
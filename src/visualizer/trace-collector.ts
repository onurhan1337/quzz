import type { TraceMetadata } from "../types";
import fs from "fs/promises";
import path from "path";

/**
 * Collected trace data for visualization
 */
export interface CollectedTrace {
  componentName: string;
  traceId: string;
  parentTrace?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  wallClockTime?: number;
  waitTime?: number;
  tags?: string[];
  error?: boolean;
  errorMessage?: string;
  depth: number;
  children: CollectedTrace[];
}

/**
 * Trace collection session data
 */
export interface TraceSession {
  startTime: number;
  endTime?: number;
  traces: CollectedTrace[];
  totalTraces: number;
  totalErrors: number;
  slowestComponent?: {
    name: string;
    duration: number;
  };
}

// Use globalThis to persist singleton across requests in dev mode
declare global {
  var __quzz_trace_collector__: TraceCollector | undefined;
}

/**
 * TraceCollector for gathering trace data for visualization
 */
export class TraceCollector {
  private static instance: TraceCollector;
  private traces: Map<string, CollectedTrace> = new Map();
  private rootTraces: CollectedTrace[] = [];
  private session: TraceSession | null = null;
  private outputPath: string | null = null;
  private autoSave: boolean = false;
  private devMode: boolean = false;
  private maxDevTraces: number = 500;

  private constructor() {}

  static getInstance(): TraceCollector {
    // In development, use global singleton to persist across requests
    if (
      typeof globalThis !== "undefined" &&
      process.env.NODE_ENV === "development"
    ) {
      if (!globalThis.__quzz_trace_collector__) {
        globalThis.__quzz_trace_collector__ = new TraceCollector();
      }
      return globalThis.__quzz_trace_collector__;
    }

    // Fallback to class static
    if (!TraceCollector.instance) {
      TraceCollector.instance = new TraceCollector();
    }
    return TraceCollector.instance;
  }

  /**
   * Initialize collector with configuration
   */
  initialize(
    outputPath?: string,
    autoSave: boolean = false,
    devMode: boolean = false
  ): void {
    this.outputPath = outputPath || "./traces.json";
    this.autoSave = autoSave;
    this.devMode = devMode;
    this.startSession();
  }

  /**
   * Start a new collection session
   */
  startSession(): void {
    this.traces.clear();
    this.rootTraces = [];
    this.session = {
      startTime: Date.now(),
      traces: [],
      totalTraces: 0,
      totalErrors: 0,
    };
  }

  /**
   * Add a trace to the collection
   */
  addTrace(metadata: TraceMetadata): void {
    if (!this.session) {
      this.startSession();
    }

    const trace: CollectedTrace = {
      componentName: metadata.componentName,
      traceId: metadata.traceId,
      parentTrace: metadata.parentTrace,
      startTime: metadata.renderStart,
      endTime: metadata.renderEnd,
      duration: metadata.duration,
      wallClockTime: metadata.wallClockTime,
      waitTime: metadata.waitTime,
      tags: metadata.tags,
      error: !!metadata.error,
      errorMessage: metadata.error?.message,
      depth: 0,
      children: [],
    };

    this.traces.set(trace.traceId, trace);
    this.session!.totalTraces++;

    if (trace.error) {
      this.session!.totalErrors++;
    }

    if (
      trace.duration &&
      (!this.session!.slowestComponent ||
        trace.duration > this.session!.slowestComponent.duration)
    ) {
      this.session!.slowestComponent = {
        name: trace.componentName,
        duration: trace.duration,
      };
    }

    if (!trace.parentTrace) {
      this.rootTraces.push(trace);
    } else {
      const parent = this.traces.get(trace.parentTrace);
      if (parent) {
        if (!parent.children.includes(trace)) {
          parent.children.push(trace);
        }
        trace.depth = parent.depth + 1;
      } else {
        this.rootTraces.push(trace);
      }
    }

    if (this.devMode && this.rootTraces.length > this.maxDevTraces) {
      this.pruneOldTraces();
    }

    if (this.autoSave) {
      this.scheduleSave();
    }
  }

  /**
   * Prune old traces to maintain circular buffer in dev mode
   */
  private pruneOldTraces(): void {
    const removeCount = Math.floor(this.maxDevTraces * 0.2);
    const removedRootTraces = this.rootTraces.splice(0, removeCount);

    const removeTraceRecursive = (trace: CollectedTrace) => {
      this.traces.delete(trace.traceId);
      trace.children.forEach(removeTraceRecursive);
    };

    removedRootTraces.forEach(removeTraceRecursive);

    if (this.session) {
      this.session.totalTraces = this.traces.size;
    }
  }

  /**
   * Update an existing trace
   */
  updateTrace(traceId: string, updates: Partial<TraceMetadata>): void {
    const trace = this.traces.get(traceId);
    if (trace) {
      if (updates.renderEnd !== undefined) trace.endTime = updates.renderEnd;
      if (updates.duration !== undefined) trace.duration = updates.duration;
      if (updates.wallClockTime !== undefined)
        trace.wallClockTime = updates.wallClockTime;
      if (updates.waitTime !== undefined) trace.waitTime = updates.waitTime;
      if (updates.error) {
        trace.error = true;
        trace.errorMessage = updates.error.message;
        this.session!.totalErrors++;
      }

      if (trace.duration && this.session) {
        if (
          !this.session.slowestComponent ||
          trace.duration > this.session.slowestComponent.duration
        ) {
          this.session.slowestComponent = {
            name: trace.componentName,
            duration: trace.duration,
          };
        }
      }
    }
  }

  private saveTimeout: NodeJS.Timeout | null = null;

  /**
   * Schedule auto-save (debounced)
   */
  private scheduleSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.save().catch(console.error);
    }, 1000);
  }

  /**
   * End the collection session
   */
  endSession(): TraceSession | null {
    if (!this.session) return null;

    this.session.endTime = Date.now();
    this.session.traces = this.rootTraces;

    return this.session;
  }

  /**
   * Get current session data
   */
  getSession(): TraceSession | null {
    if (!this.session) return null;

    return {
      ...this.session,
      traces: this.rootTraces,
    };
  }

  /**
   * Export traces as JSON
   */
  exportJSON(): string {
    const session = this.getSession();
    return JSON.stringify(session, null, 2);
  }

  /**
   * Save traces to file
   */
  async save(filePath?: string): Promise<void> {
    const outputPath = filePath || this.outputPath;
    if (!outputPath) {
      throw new Error("No output path specified");
    }

    const session = this.getSession();
    const json = JSON.stringify(session, null, 2);

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, json, "utf-8");
  }

  /**
   * Load traces from file
   */
  async load(filePath: string): Promise<TraceSession> {
    const json = await fs.readFile(filePath, "utf-8");
    const session = JSON.parse(json) as TraceSession;

    this.session = session;
    this.rootTraces = session.traces;

    this.traces.clear();
    const buildTraceMap = (traces: CollectedTrace[]) => {
      for (const trace of traces) {
        this.traces.set(trace.traceId, trace);
        if (trace.children.length > 0) {
          buildTraceMap(trace.children);
        }
      }
    };
    buildTraceMap(this.rootTraces);

    return session;
  }

  /**
   * Clear all collected traces
   */
  clear(): void {
    this.traces.clear();
    this.rootTraces = [];
    this.session = null;
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
  }

  /**
   * Get trace hierarchy as tree structure
   */
  getTraceTree(): CollectedTrace[] {
    return this.rootTraces;
  }

  /**
   * Get flat list of all traces
   */
  getFlatTraces(): CollectedTrace[] {
    return Array.from(this.traces.values());
  }

  /**
   * Get traces filtered by component name
   */
  getTracesByComponent(componentName: string): CollectedTrace[] {
    return Array.from(this.traces.values()).filter(
      (trace) => trace.componentName === componentName
    );
  }

  /**
   * Get traces with errors
   */
  getErrorTraces(): CollectedTrace[] {
    return Array.from(this.traces.values()).filter((trace) => trace.error);
  }

  /**
   * Get recent traces (for dev mode)
   */
  getRecentTraces(limit?: number): CollectedTrace[] {
    const count = limit || 100;
    return this.rootTraces.slice(-count);
  }

  /**
   * Get traces by time range (for dev mode)
   */
  getTracesByTimeRange(startTime: number, endTime: number): CollectedTrace[] {
    return this.rootTraces.filter(
      (trace) =>
        trace.startTime >= startTime &&
        (trace.endTime || trace.startTime) <= endTime
    );
  }

  /**
   * Clear dev traces
   */
  clearDevTraces(): void {
    if (this.devMode) {
      this.clear();
      this.startSession();
    }
  }

  /**
   * Get performance statistics
   */
  getStatistics(): {
    totalTraces: number;
    totalErrors: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    totalDuration: number;
    componentStats: Map<
      string,
      {
        count: number;
        avgDuration: number;
        errors: number;
      }
    >;
  } {
    const traces = this.getFlatTraces();
    const durations = traces
      .filter((t) => t.duration !== undefined)
      .map((t) => t.duration!);

    const componentStats = new Map<
      string,
      {
        count: number;
        totalDuration: number;
        avgDuration: number;
        errors: number;
      }
    >();

    for (const trace of traces) {
      const stats = componentStats.get(trace.componentName) || {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        errors: 0,
      };

      stats.count++;
      if (trace.duration) {
        stats.totalDuration += trace.duration;
      }
      if (trace.error) {
        stats.errors++;
      }

      componentStats.set(trace.componentName, stats);
    }

    for (const [, stats] of componentStats) {
      stats.avgDuration =
        stats.count > 0 ? stats.totalDuration / stats.count : 0;
    }

    return {
      totalTraces: traces.length,
      totalErrors: traces.filter((t) => t.error).length,
      avgDuration:
        durations.length > 0
          ? durations.reduce((a, b) => a + b, 0) / durations.length
          : 0,
      minDuration: durations.length > 0 ? Math.min(...durations) : 0,
      maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
      totalDuration: durations.reduce((a, b) => a + b, 0),
      componentStats,
    };
  }
}

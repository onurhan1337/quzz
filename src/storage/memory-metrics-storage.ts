import { BaseAsyncStorage, type StorageOptions } from "./base";

export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

export interface MemoryContext {
  contextId: string;
  snapshots: MemorySnapshot[];
  baselineMemory: MemorySnapshot | null;
  peakMemory: MemorySnapshot | null;
  leaks: MemoryLeak[];
}

export interface MemoryLeak {
  contextId: string;
  startTime: number;
  endTime?: number;
  memoryGrowth: number;
  description: string;
}

export interface MemoryMetricsOptions extends StorageOptions {
  maxSnapshots?: number;
  snapshotInterval?: number;
  leakThreshold?: number;
  autoSnapshot?: boolean;
}

export class MemoryMetricsStorage extends BaseAsyncStorage<MemoryContext> {
  private readonly maxSnapshots: number;
  private readonly snapshotInterval: number;
  private readonly leakThreshold: number;
  private readonly autoSnapshot: boolean;
  private snapshotTimer?: NodeJS.Timeout;
  private readonly globalLeaks: Map<string, MemoryLeak> = new Map();

  constructor(options: MemoryMetricsOptions = { name: "memory-metrics" }) {
    super(options);
    this.maxSnapshots = options.maxSnapshots ?? 100;
    this.snapshotInterval = options.snapshotInterval ?? 5000;
    this.leakThreshold = options.leakThreshold ?? 50 * 1024 * 1024;
    this.autoSnapshot = options.autoSnapshot ?? false;

    if (this.autoSnapshot) {
      this.startAutoSnapshot();
    }
  }

  protected createDefaultStore(): MemoryContext {
    return {
      contextId: this.generateContextId(),
      snapshots: [],
      baselineMemory: null,
      peakMemory: null,
      leaks: [],
    };
  }

  protected validateStore(store: unknown): store is MemoryContext {
    if (!store || typeof store !== "object") return false;

    const s = store as Record<string, unknown>;
    return (
      typeof s.contextId === "string" &&
      Array.isArray(s.snapshots) &&
      (s.baselineMemory === null || typeof s.baselineMemory === "object") &&
      (s.peakMemory === null || typeof s.peakMemory === "object") &&
      Array.isArray(s.leaks)
    );
  }

  captureMemorySnapshot(): MemorySnapshot | null {
    if (typeof process === "undefined" || !process.memoryUsage) {
      return null;
    }

    try {
      const usage = process.memoryUsage();
      return {
        timestamp: Date.now(),
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        external: usage.external,
        rss: usage.rss,
      };
    } catch (error) {
      this.logError("Failed to capture memory snapshot", error);
      return null;
    }
  }

  recordSnapshot(snapshot?: MemorySnapshot): void {
    const context = this.getOrCreateContext();
    if (!context) return;

    const currentSnapshot = snapshot || this.captureMemorySnapshot();
    if (!currentSnapshot) return;

    if (!context.baselineMemory) {
      context.baselineMemory = currentSnapshot;
    }

    context.snapshots.push(currentSnapshot);

    if (
      !context.peakMemory ||
      currentSnapshot.heapUsed > context.peakMemory.heapUsed
    ) {
      context.peakMemory = currentSnapshot;
    }

    if (context.snapshots.length > this.maxSnapshots) {
      context.snapshots = context.snapshots.slice(-this.maxSnapshots);
    }

    this.detectMemoryLeaks(context, currentSnapshot);
  }

  private detectMemoryLeaks(
    context: MemoryContext,
    snapshot: MemorySnapshot
  ): void {
    if (!context.baselineMemory) return;

    const memoryGrowth = snapshot.heapUsed - context.baselineMemory.heapUsed;

    if (memoryGrowth > this.leakThreshold) {
      const leak: MemoryLeak = {
        contextId: context.contextId,
        startTime: context.baselineMemory.timestamp,
        endTime: snapshot.timestamp,
        memoryGrowth,
        description: `Memory grew by ${this.formatBytes(memoryGrowth)} over ${
          snapshot.timestamp - context.baselineMemory.timestamp
        }ms`,
      };

      context.leaks.push(leak);
      this.globalLeaks.set(context.contextId, leak);

      this.logError(`Potential memory leak detected: ${leak.description}`);
    }
  }

  getMemoryStats(): {
    current: MemorySnapshot | null;
    baseline: MemorySnapshot | null;
    peak: MemorySnapshot | null;
    growth: number;
    leakDetected: boolean;
  } | null {
    const context = this.getStore();
    if (!context || context.snapshots.length === 0) {
      return null;
    }

    const current = context.snapshots[context.snapshots.length - 1];
    const growth = context.baselineMemory
      ? current.heapUsed - context.baselineMemory.heapUsed
      : 0;

    return {
      current,
      baseline: context.baselineMemory,
      peak: context.peakMemory,
      growth,
      leakDetected: context.leaks.length > 0,
    };
  }

  getMemoryTrend(windowSize: number = 10): {
    trend: "stable" | "growing" | "shrinking";
    averageGrowth: number;
    samples: number;
  } | null {
    const context = this.getStore();
    if (!context || context.snapshots.length < 2) {
      return null;
    }

    const window = context.snapshots.slice(-windowSize);
    if (window.length < 2) {
      return null;
    }

    let totalGrowth = 0;
    for (let i = 1; i < window.length; i++) {
      totalGrowth += window[i].heapUsed - window[i - 1].heapUsed;
    }

    const averageGrowth = totalGrowth / (window.length - 1);
    const threshold = 1024 * 1024;

    let trend: "stable" | "growing" | "shrinking" = "stable";
    if (averageGrowth > threshold) {
      trend = "growing";
    } else if (averageGrowth < -threshold) {
      trend = "shrinking";
    }

    return {
      trend,
      averageGrowth,
      samples: window.length,
    };
  }

  getLeaks(): MemoryLeak[] {
    return Array.from(this.globalLeaks.values());
  }

  clearLeaks(): void {
    const context = this.getStore();
    if (context) {
      context.leaks = [];
    }
    this.globalLeaks.clear();
  }

  runWithMemoryTracking<R>(callback: () => R): R {
    const context = this.createDefaultStore();
    return this.run(context, () => {
      this.recordSnapshot();
      try {
        const result = callback();
        this.recordSnapshot();
        return result;
      } finally {
        const stats = this.getMemoryStats();
        if (stats && this.debugMode) {
          this.logDebug(
            `Memory usage: ${this.formatBytes(stats.growth)} growth, ` +
              `peak: ${this.formatBytes(stats.peak?.heapUsed ?? 0)}`
          );
        }
      }
    });
  }

  private startAutoSnapshot(): void {
    if (this.snapshotTimer) return;

    this.snapshotTimer = setInterval(() => {
      const context = this.getStore();
      if (context) {
        this.recordSnapshot();
      }
    }, this.snapshotInterval);

    if (typeof this.snapshotTimer.unref === "function") {
      this.snapshotTimer.unref();
    }
  }

  stopAutoSnapshot(): void {
    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
      this.snapshotTimer = undefined;
    }
  }

  private getOrCreateContext(): MemoryContext | undefined {
    let context = this.getStore();
    if (!context) {
      context = this.createDefaultStore();
      this.enterWith(context);
    }
    return context;
  }

  private generateContextId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private formatBytes(bytes: number): string {
    const units = ["B", "KB", "MB", "GB"];
    let value = Math.abs(bytes);
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    const sign = bytes < 0 ? "-" : "";
    return `${sign}${value.toFixed(2)} ${units[unitIndex]}`;
  }

  dispose(): void {
    this.stopAutoSnapshot();
    this.clearLeaks();
    this.disable();
  }
}

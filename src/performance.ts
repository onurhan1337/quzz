import type { PerformanceMetrics, PerformanceConfig } from "./types";

/**
 * Performance monitor with metrics aggregation and automatic memory management
 */
class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics = new Map<string, PerformanceMetrics>();
  private componentRenders = new Map<string, number[]>();
  private lastCleanup = Date.now();
  private maxComponents = 500; // Maximum number of components to track
  private maxRenderHistory = 100; // Maximum renders per component
  private cleanupInterval = 60000; // Cleanup every minute

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Perform automatic cleanup of old metrics
   */
  private performCleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup < this.cleanupInterval) {
      return;
    }

    this.lastCleanup = now;

    // Remove least recently used components if we exceed max
    if (this.metrics.size > this.maxComponents) {
      const sortedComponents = Array.from(this.metrics.entries()).sort(
        (a, b) => a[1].lastRender - b[1].lastRender
      );

      const toRemove = sortedComponents.slice(
        0,
        this.metrics.size - this.maxComponents
      );
      toRemove.forEach(([componentName]) => {
        this.metrics.delete(componentName);
        this.componentRenders.delete(componentName);
      });
    }

    // Clean up stale metrics (not rendered in last hour)
    const oneHourAgo = now - 3600000;
    for (const [componentName, metric] of this.metrics.entries()) {
      if (metric.lastRender < oneHourAgo) {
        this.metrics.delete(componentName);
        this.componentRenders.delete(componentName);
      }
    }
  }

  /**
   * Record a render performance metric
   */
  recordRender(
    componentName: string,
    duration: number,
    hasError: boolean = false
  ): void {
    // Perform cleanup check
    this.performCleanup();

    const existing = this.metrics.get(componentName);

    if (!existing) {
      this.metrics.set(componentName, {
        componentName,
        avgDuration: duration,
        minDuration: duration,
        maxDuration: duration,
        totalRenders: 1,
        errorCount: hasError ? 1 : 0,
        lastRender: Date.now(),
      });
      this.componentRenders.set(componentName, [duration]);
    } else {
      const renders = this.componentRenders.get(componentName) || [];
      renders.push(duration);

      // Keep only last N renders for memory efficiency
      if (renders.length > this.maxRenderHistory) {
        renders.shift();
      }

      const avgDuration =
        renders.reduce((sum, d) => sum + d, 0) / renders.length;

      this.metrics.set(componentName, {
        componentName,
        avgDuration,
        minDuration: Math.min(existing.minDuration, duration),
        maxDuration: Math.max(existing.maxDuration, duration),
        totalRenders: existing.totalRenders + 1,
        errorCount: existing.errorCount + (hasError ? 1 : 0),
        lastRender: Date.now(),
      });

      this.componentRenders.set(componentName, renders);
    }
  }

  /**
   * Get metrics for a specific component
   */
  getMetrics(componentName: string): PerformanceMetrics | undefined {
    return this.metrics.get(componentName);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, PerformanceMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    totalComponents: number;
    totalRenders: number;
    totalErrors: number;
    slowestComponent: string | null;
    fastestComponent: string | null;
  } {
    let totalRenders = 0;
    let totalErrors = 0;
    let slowest: PerformanceMetrics | null = null;
    let fastest: PerformanceMetrics | null = null;

    for (const metric of this.metrics.values()) {
      totalRenders += metric.totalRenders;
      totalErrors += metric.errorCount;

      if (!slowest || metric.avgDuration > slowest.avgDuration) {
        slowest = metric;
      }

      if (!fastest || metric.avgDuration < fastest.avgDuration) {
        fastest = metric;
      }
    }

    return {
      totalComponents: this.metrics.size,
      totalRenders,
      totalErrors,
      slowestComponent: slowest?.componentName || null,
      fastestComponent: fastest?.componentName || null,
    };
  }

  /**
   * Check if duration exceeds threshold and should warn
   */
  shouldWarn(duration: number, config: PerformanceConfig): boolean {
    const threshold = config.warnThreshold ?? 1000;
    return duration > threshold;
  }

  /**
   * Get memory usage (Node.js only)
   */
  getMemoryUsage(): { heapUsed: number; heapTotal: number } | null {
    if (typeof process !== "undefined" && process.memoryUsage) {
      const mem = process.memoryUsage();
      return {
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
      };
    }
    return null;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    this.componentRenders.clear();
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    const metricsArray = Array.from(this.metrics.values());
    return JSON.stringify(
      {
        summary: this.getSummary(),
        components: metricsArray,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  }
}

export { PerformanceMonitor };

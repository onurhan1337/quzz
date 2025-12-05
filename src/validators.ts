import type { QuzzConfig, TraceMetadata } from "./types";

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class ConfigValidator {
  private static readonly MAX_PROP_DEPTH_LIMIT = 20;
  private static readonly MAX_STRING_LENGTH_LIMIT = 10000;
  private static readonly MAX_THROTTLE_MS = 60000;
  private static readonly WARN_THRESHOLD_LIMIT = 30000;

  static validate(config: Partial<QuzzConfig>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (config.maxPropDepth !== undefined) {
      if (
        config.maxPropDepth < 0 ||
        config.maxPropDepth > this.MAX_PROP_DEPTH_LIMIT
      ) {
        errors.push(
          `maxPropDepth must be between 0 and ${this.MAX_PROP_DEPTH_LIMIT}`
        );
      }
    }

    if (config.maxStringLength !== undefined) {
      if (
        config.maxStringLength < 0 ||
        config.maxStringLength > this.MAX_STRING_LENGTH_LIMIT
      ) {
        errors.push(
          `maxStringLength must be between 0 and ${this.MAX_STRING_LENGTH_LIMIT}`
        );
      }
    }

    if (config.throttleMs !== undefined) {
      if (config.throttleMs < 0 || config.throttleMs > this.MAX_THROTTLE_MS) {
        errors.push(`throttleMs must be between 0 and ${this.MAX_THROTTLE_MS}`);
      }
    }

    if (config.performance?.warnThreshold !== undefined) {
      const threshold = config.performance.warnThreshold;
      if (threshold < 0 || threshold > this.WARN_THRESHOLD_LIMIT) {
        errors.push(
          `performance.warnThreshold must be between 0 and ${this.WARN_THRESHOLD_LIMIT}`
        );
      }
      if (threshold > 10000) {
        warnings.push(
          "performance.warnThreshold > 10s may not trigger warnings effectively"
        );
      }
    }

    if (config.forceEnable) {
      warnings.push("forceEnable is enabled - tracing will run in production");
    }

    if (config.logLevel === "trace" || config.logLevel === "debug") {
      warnings.push("Verbose logging levels may impact performance");
    }

    if (config.performance?.trackMemory) {
      warnings.push("Memory tracking adds overhead to each render");
    }

    if (config.visualizer?.enabled) {
      warnings.push("Visualization collects all trace data in memory");
    }

    if (config.performance?.enableHeapSnapshots) {
      warnings.push(
        "Heap snapshots create large files on disk and add overhead"
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export class ContextValidator {
  private static readonly MAX_CONTEXT_DEPTH = 100;
  private static readonly MAX_TRACE_STACK_SIZE = 1000;
  private static readonly MAX_TRACE_MAP_SIZE = 5000;

  static validateContextState(
    traceStack: string[],
    traceMap: Map<string, TraceMetadata>
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (traceStack.length > this.MAX_TRACE_STACK_SIZE) {
      errors.push(
        `Trace stack exceeds maximum size (${this.MAX_TRACE_STACK_SIZE})`
      );
    }

    if (traceMap.size > this.MAX_TRACE_MAP_SIZE) {
      warnings.push(
        `Trace map is large (${traceMap.size} entries), consider cleanup`
      );
    }

    const depth = traceStack.length;
    if (depth > this.MAX_CONTEXT_DEPTH) {
      errors.push(
        `Context nesting depth exceeds limit (${this.MAX_CONTEXT_DEPTH})`
      );
    }

    const uniqueIds = new Set(traceStack);
    if (uniqueIds.size !== traceStack.length) {
      warnings.push("Duplicate trace IDs detected in stack");
    }

    for (const [id, metadata] of traceMap) {
      if (!metadata.traceId || metadata.traceId !== id) {
        errors.push(`Trace ID mismatch for ${id}`);
      }

      if (metadata.duration && metadata.duration < 0) {
        errors.push(`Invalid negative duration for trace ${id}`);
      }

      if (metadata.wallClockTime && metadata.duration) {
        if (metadata.wallClockTime < metadata.duration) {
          warnings.push(`Wall clock time less than duration for trace ${id}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export class NodeVersionValidator {
  static checkCompatibility(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof process === "undefined" || !process.versions?.node) {
      warnings.push(
        "Not running in Node.js environment, AsyncLocalStorage unavailable"
      );
      return { valid: true, errors, warnings };
    }

    const nodeVersion = process.versions.node;
    const [major, minor] = nodeVersion.split(".").map(Number);

    if (major < 14) {
      errors.push(
        `Node.js version ${nodeVersion} is not supported. Minimum required: 14.0.0`
      );
    } else if (major === 14 && minor < 18) {
      warnings.push(
        `Node.js ${nodeVersion} has limited AsyncLocalStorage support. Consider upgrading to 14.18+ or 16+`
      );
    }

    if (major < 16) {
      warnings.push(
        "Node.js 16+ recommended for optimal AsyncLocalStorage performance"
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export class ThirdPartyLibValidator {
  private static readonly PROBLEMATIC_LIBS = [
    { name: "bluebird", issue: "May not propagate async context correctly" },
    { name: "q", issue: "Older promise library may lose context" },
    { name: "async", issue: "Some patterns may break context propagation" },
  ];

  static checkKnownIssues(): ValidationResult {
    const warnings: string[] = [];

    if (typeof require === "function") {
      for (const lib of this.PROBLEMATIC_LIBS) {
        try {
          require.resolve(lib.name);
          warnings.push(`${lib.name} detected: ${lib.issue}`);
        } catch {
          // Library not installed, no warning needed
        }
      }
    }

    return {
      valid: true,
      errors: [],
      warnings,
    };
  }
}

export class MemoryLeakDetector {
  private static contextCreationTimes = new Map<string, number>();
  private static readonly CONTEXT_LIFETIME_WARNING = 60000;
  private static readonly MAX_TRACKED_CONTEXTS = 1000;

  static trackContextCreation(contextId: string): void {
    this.contextCreationTimes.set(contextId, Date.now());

    if (this.contextCreationTimes.size > this.MAX_TRACKED_CONTEXTS) {
      const oldest = Array.from(this.contextCreationTimes.entries())
        .sort((a, b) => a[1] - b[1])
        .slice(0, 100);

      for (const [id] of oldest) {
        this.contextCreationTimes.delete(id);
      }
    }
  }

  static checkForLeaks(): ValidationResult {
    const warnings: string[] = [];
    const now = Date.now();

    for (const [contextId, createdAt] of this.contextCreationTimes) {
      const age = now - createdAt;
      if (age > this.CONTEXT_LIFETIME_WARNING) {
        warnings.push(
          `Context ${contextId} has been alive for ${Math.round(age / 1000)}s`
        );
      }
    }

    if (this.contextCreationTimes.size > 500) {
      warnings.push(
        `High number of tracked contexts (${this.contextCreationTimes.size})`
      );
    }

    return {
      valid: true,
      errors: [],
      warnings,
    };
  }

  static clearContext(contextId: string): void {
    this.contextCreationTimes.delete(contextId);
  }

  static reset(): void {
    this.contextCreationTimes.clear();
  }
}

export class StorageHealthValidator {
  static validateStorageHealth(
    stats: Record<string, import("./storage/context-manager").StorageStats>
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const [name, storage] of Object.entries(stats)) {
      if (!storage || typeof storage !== "object") continue;

      if (storage.enabled === false) {
        continue;
      }

      const metrics = storage.metrics;
      if (metrics) {
        const errorRate =
          metrics.errors /
          (metrics.hits + metrics.misses + metrics.errors || 1);
        if (errorRate > 0.1) {
          warnings.push(
            `Storage '${name}' has high error rate: ${(errorRate * 100).toFixed(
              1
            )}%`
          );
        }

        if (metrics.misses > metrics.hits * 10) {
          warnings.push(`Storage '${name}' has high miss rate`);
        }
      }

      if (storage.isUsingFallback) {
        warnings.push(`Storage '${name}' is using fallback mechanism`);
      }

      if (!storage.isAvailable) {
        errors.push(`Storage '${name}' is not available`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export function validateEnvironment(): ValidationResult {
  const results = [
    NodeVersionValidator.checkCompatibility(),
    ThirdPartyLibValidator.checkKnownIssues(),
    MemoryLeakDetector.checkForLeaks(),
  ];

  const allErrors = results.flatMap((r) => r.errors);
  const allWarnings = results.flatMap((r) => r.warnings);

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

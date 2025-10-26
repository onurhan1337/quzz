# quzz Feature Guide

## Version 0.3.0 Features

This guide covers all the powerful features available in quzz v0.3.0, including the new modular storage architecture and context snapshots.

## Table of Contents

1. [Core Features](#core-features)
2. [Modular Storage Architecture](#modular-storage-architecture)
3. [Context Snapshots](#context-snapshots)
4. [Memory Leak Detection](#memory-leak-detection)
5. [Performance Monitoring](#performance-monitoring)
6. [Advanced Configuration](#advanced-configuration)

## Core Features

### Component Tracing

The foundation of quzz is component tracing, which provides visibility into React Server Component rendering:

```tsx
import { withRSCTrace } from 'quzz';

const MyComponent = withRSCTrace(
  async function MyComponent({ data }) {
    // Your component logic
    return <div>{data}</div>;
  },
  {
    componentName: 'MyComponent',
    tags: ['critical', 'data-fetch'],
  }
);
```

### RSC Boundary

For fine-grained control without modifying components:

```tsx
import { RSCBoundary } from 'quzz';

<RSCBoundary label="critical-section" tags={['important']}>
  <YourComponents />
</RSCBoundary>
```

## Modular Storage Architecture

### Overview

The modular storage system provides isolated context tracking across async boundaries using Node.js AsyncLocalStorage.

### Built-in Storage Modules

#### TraceStorage
Manages component hierarchy and trace metadata:

```typescript
const contextManager = ContextManager.getInstance();
const traceId = contextManager.getCurrentParentId();
const hierarchy = contextManager.getTraceHierarchy();
```

#### MemoryMetricsStorage
Monitors memory usage and detects leaks:

```typescript
contextManager.recordMemorySnapshot();
const stats = contextManager.getMemoryStats();
const trend = contextManager.getMemoryTrend(10);
```

### Custom Storage Implementation

Create your own storage modules for application-specific needs:

```typescript
import { BaseAsyncStorage } from 'quzz/storage';

interface AppState {
  feature: string;
  data: any;
}

class AppStateStorage extends BaseAsyncStorage<AppState> {
  protected createDefaultStore(): AppState {
    return { feature: '', data: null };
  }

  protected validateStore(store: unknown): store is AppState {
    return typeof store === 'object' && 'feature' in store;
  }

  // Custom methods
  setFeature(feature: string): void {
    const store = this.getStore();
    if (store) {
      this.enterWith({ ...store, feature });
    }
  }
}

// Register and use
const appStorage = new AppStateStorage({ name: 'app-state' });
contextManager.registerStorage('app', appStorage);

contextManager.runWithStorage('app', { feature: 'dashboard', data: {} }, async () => {
  // Your async operations have access to app state
});
```

### Storage Statistics

Monitor all storage instances:

```typescript
const stats = contextManager.getAllStats();
// Returns: { [storageName]: { enabled, metrics, isUsingFallback, isAvailable } }
```

## Context Snapshots

### Requirements

Context snapshots require Node.js 16.12.0 or higher for full functionality. The feature gracefully degrades on older versions.

### Configuration

Enable snapshots in your configuration:

```typescript
configure({
  debugContext: true,
  enableSnapshots: true,
  verboseMode: true, // Auto-capture at key points
});
```

### Automatic Capture

In verbose mode, snapshots are automatically captured at:
- Component entry (`component-enter:ComponentName`)
- Component exit (`component-exit:ComponentName`)
- Component error (`component-error:ComponentName`)
- Boundary entry (`boundary-enter:label`)
- Boundary exit (`boundary-exit:label`)
- Boundary error (`boundary-error:label`)

### Manual Capture

Capture snapshots programmatically:

```typescript
import { getContextSnapshots, getLatestSnapshot } from 'quzz';

// During component execution
const snapshot = contextManager.captureSnapshot({
  label: 'critical-point',
  maxSnapshots: 100, // Limit storage
});

// Later analysis
const allSnapshots = getContextSnapshots();
const latest = getLatestSnapshot();

// Clear when done
clearSnapshots();
```

### Snapshot Structure

```typescript
interface ContextSnapshot<T> {
  timestamp: number;        // When captured
  store: T | undefined;     // Context state
  stackDepth: number;       // Nesting level
  label?: string;           // Custom identifier
}
```

### Debugging with Snapshots

```typescript
// Check support
if (isSnapshotSupported()) {
  // Your debugging logic
  const snapshots = getContextSnapshots();

  // Analyze context flow
  snapshots.forEach(snap => {
    console.log(`${snap.label} at depth ${snap.stackDepth}:`, {
      time: new Date(snap.timestamp).toISOString(),
      context: snap.store,
    });
  });
}
```

## Memory Leak Detection

### Configuration

Enable memory tracking in your performance configuration:

```typescript
configure({
  performance: {
    enabled: true,
    trackMemory: true,
  },
});

// Or with custom thresholds
const contextManager = ContextManager.getInstance({
  enableMemoryMetrics: true,
  memoryOptions: {
    leakThreshold: 50 * 1024 * 1024, // 50MB
    maxSnapshots: 100,
  },
});
```

### Monitoring Memory

```typescript
// Get current memory stats
const memoryStats = contextManager.getMemoryStats();
if (memoryStats?.leakDetected) {
  console.error('Memory leak detected!', {
    growth: memoryStats.growth,
    baseline: memoryStats.baseline,
    current: memoryStats.current,
  });
}

// Track memory trend
const trend = contextManager.getMemoryTrend(10); // Last 10 snapshots
if (trend) {
  const avgGrowth = trend.samples.reduce((a, b) => a + b.heapUsed, 0) / trend.samples.length;
  console.log('Average memory usage:', avgGrowth);
}
```

### Memory Leak Reports

```typescript
// Run with memory tracking
contextManager.runInContext(
  async () => {
    // Your potentially leaky code
  },
  { trackMemory: true }
);

// Check for leaks
const stats = contextManager.getAllStats();
if (stats.memory?.memoryStats?.leakDetected) {
  // Handle leak detection
}
```

## Performance Monitoring

### Enhanced Metrics

With the new architecture, performance metrics include:

```typescript
interface PerformanceMetrics {
  renders: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  errors: number;
  lastRender: number;
  // NEW: Memory metrics
  avgMemory?: number;
  peakMemory?: number;
}
```

### Performance Budgets

Set and monitor performance budgets:

```typescript
configure({
  performance: {
    enabled: true,
    warnThreshold: 500, // Warn if > 500ms
  },
  plugins: [{
    name: 'performance-budget',
    onTraceEnd: async (metadata) => {
      if (metadata.duration > 1000) {
        // Alert or log to monitoring service
        await notifySlack(`Component ${metadata.componentName} exceeded budget`);
      }
    },
  }],
});
```

## Advanced Configuration

### Verbose Mode

Enable comprehensive debugging output:

```typescript
configure({
  verboseMode: true, // Enables all debugging features
  debugContext: true,
  enableSnapshots: true,
});
```

### Conditional Storage

Enable storage based on environment:

```typescript
const contextManager = ContextManager.getInstance({
  enableTracing: process.env.ENABLE_TRACING === 'true',
  enableMemoryMetrics: process.env.NODE_ENV === 'development',
  enableSnapshots: process.env.DEBUG === 'true',
});
```

### Storage Lifecycle

Manage storage lifecycle:

```typescript
// Enable/disable at runtime
contextManager.enableStorage('trace');
contextManager.disableStorage('memory');

// Unregister completely
contextManager.unregisterStorage('custom');

// Clear all data
contextManager.clearAll();

// Dispose (cleanup)
contextManager.dispose();
```

## Best Practices

### 1. Development vs Production

```typescript
// Development configuration
if (process.env.NODE_ENV === 'development') {
  configure({
    logLevel: 'debug',
    verboseMode: true,
    enableSnapshots: true,
    performance: { trackMemory: true },
  });
}

// Production (if needed)
if (process.env.ENABLE_PRODUCTION_TRACING === 'true') {
  configure({
    forceEnable: true,
    logLevel: 'error',
    performance: { enabled: true },
    // Don't enable snapshots or memory tracking in production
  });
}
```

### 2. Custom Storage Patterns

```typescript
// Singleton pattern for app-wide storage
class AppStorageManager {
  private static instance: AppStorageManager;
  private storage: AppStateStorage;

  static getInstance() {
    if (!this.instance) {
      this.instance = new AppStorageManager();
    }
    return this.instance;
  }

  // Your storage methods
}
```

### 3. Memory Management

```typescript
// Periodic cleanup
setInterval(() => {
  // Clear old snapshots
  contextManager.clearSnapshots();

  // Check memory health
  const stats = contextManager.getMemoryStats();
  if (stats?.growth > 100_000_000) { // 100MB growth
    console.warn('High memory growth detected');
    // Take action
  }
}, 60000); // Every minute
```

### 4. Error Handling

```typescript
// Wrap storage operations
try {
  contextManager.runWithStorage('critical', context, async () => {
    // Your code
  });
} catch (error) {
  // Capture snapshot for debugging
  const errorSnapshot = contextManager.captureSnapshot({
    label: `error-${error.message}`,
  });
  console.error('Error with context:', errorSnapshot);
}
```

## Migration Guide

### From v0.2.x to v0.3.0

The v0.3.0 release is backward compatible. Existing code continues to work, and new features are opt-in:

```typescript
// Old code still works
import { withRSCTrace, configure } from 'quzz';

// New features are additive
import { ContextManager } from 'quzz/storage';
import { getContextSnapshots } from 'quzz';
```

### Adopting New Features

1. **Enable snapshots**: Add `enableSnapshots: true` to configuration
2. **Enable memory tracking**: Add `performance.trackMemory: true`
3. **Use verbose mode**: Add `verboseMode: true` for full debugging
4. **Create custom storage**: Extend `BaseAsyncStorage` for your needs

## Troubleshooting

### Snapshots Not Working

1. Check Node.js version: `node --version` (need 16.12.0+)
2. Verify configuration: `enableSnapshots: true`
3. Check support: `isSnapshotSupported()`

### Memory Leaks Not Detected

1. Enable memory tracking: `performance.trackMemory: true`
2. Check threshold: Default is 10MB, adjust if needed
3. Ensure memory metrics storage is enabled

### Context Not Isolated

1. Verify AsyncLocalStorage support
2. Check for sync/async boundary issues
3. Use `runWithStorage` for proper isolation

## Performance Impact

### Storage Overhead

- Base storage: ~50μs per operation
- Snapshot capture: ~100μs
- Memory snapshot: ~200μs
- Context switch: ~30μs

### Memory Usage

- Per storage instance: ~5KB
- Per snapshot: ~1KB + context size
- Memory tracking: ~10KB for 100 snapshots

### Best Performance

1. Disable in production unless debugging
2. Use component filtering
3. Limit snapshot count
4. Clear snapshots periodically
5. Disable memory tracking when not needed

---

For more information, see the [main documentation](../README.md) and [architecture guide](../ARCHITECTURE.md).
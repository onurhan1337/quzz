# quzz Feature Guide

## Version 0.4.0 Features

This guide covers all the powerful features available in quzz, including the latest v0.4.0 features: file-based configuration, compact output format, terminal hyperlinks, heap snapshots, and environment variable support.

## Table of Contents

1. [New in v0.4.0](#new-in-v040)
   - [File-Based Configuration](#file-based-configuration)
   - [Compact Output Format](#compact-output-format)
   - [Terminal Hyperlinks](#terminal-hyperlinks)
   - [Heap Snapshots](#heap-snapshots)
   - [Environment Variables](#environment-variables)
2. [Core Features](#core-features)
3. [Modular Storage Architecture](#modular-storage-architecture)
4. [Context Snapshots](#context-snapshots)
5. [Memory Leak Detection](#memory-leak-detection)
6. [Performance Monitoring](#performance-monitoring)
7. [Advanced Configuration](#advanced-configuration)

## New in v0.4.0

### File-Based Configuration

quzz automatically loads configuration from your project root (async).

#### Supported Files (in priority order)

1. `quzz.config.ts` (ESM, preferred)
2. `quzz.config.js` (ESM/Node-resolved JS)

#### Example Configuration

**quzz.config.ts:**

```typescript
/** @type {import('quzz').QuzzConfig} */
export default {
  logLevel: "info",
  outputFormat: "compact",

  performance: {
    enabled: true,
    warnThreshold: 500,
    trackMemory: true,
    memoryThreshold: 50 * 1024 * 1024, // 50MB
    enableHeapSnapshots: false,
    heapSnapshotDir: "./heap-snapshots",
  },

  props: {
    showPromiseTypes: true,
    awaitProps: false,
    maxArrayItems: 10,
    maxObjectProps: 20,
  },

  // Component filtering with regex
  componentFilter: /^(Blog|Product|Work)/,

  // Security: redact sensitive keys
  sensitiveKeys: ["apiKey", "secretToken", "privateData"],

  // Terminal hyperlinks
  enableHyperlinks: true,
};
```

#### Configuration Priority

Settings are merged in this order (highest priority last):

1. **Defaults** (built-in)
2. **`quzz.config.ts`/`.js`** (file-based, loaded async)
3. **Environment variables** (`QUZZ_*`)
4. **configure()** (programmatic)

#### Benefits

- ✅ No code changes needed - just drop the config file in your root
- ✅ Type-safe with JSDoc `@type` comments
- ✅ Automatic loading on initialization
- ✅ Follows Next.js ESM-first convention (`quzz.config.ts` / `.js`)
- ✅ Can still use `configure()` for runtime overrides
- ✅ Supports ESM TypeScript or JavaScript

#### API Functions

```typescript
import {
  hasConfigFile,
  getConfigFilePath,
  loadConfigFromFileAsync,
} from "quzz";

// Check if config file exists
if (hasConfigFile()) {
  console.log("Config found at:", getConfigFilePath());
}

// Manually load config (advanced use case)
const config = await loadConfigFromFileAsync();

// Note: the sync loader is deprecated and returns null; use the async API.
```

### Compact Output Format

Clean, single-line logs perfect for high-frequency renders.

#### Example Output

```bash
BlogDetailPage: 4.79ms (620MB) ✓
ProductPage: 124.32ms (45MB) ⚠
ErrorComponent: 532.11ms ✗ Database connection failed
```

#### Features

- **Color-coded performance**: Green (<500ms), Yellow (<1000ms), Red (>1000ms)
- **Memory display**: Shows heap usage in MB
- **Status indicators**: ✓ (success), ⚠ (warning), ✗ (error)
- **Single-line format**: No clutter, easy to scan

#### Configuration

```typescript
// quzz.config.ts
export default {
  outputFormat: "compact", // "pretty" | "compact" | "json"
};

// Or via environment variable
// QUZZ_OUTPUT_FORMAT=compact
```

### Production defaults

Quzz is off by default in production (`NODE_ENV=production`). Keep it disabled with `QUZZ_ENABLED=false` or `QUZZ_DISABLE=true`. Only force it on if you really need it (not recommended): `QUZZ_FORCE_ENABLE=true`.

### Terminal Hyperlinks

Clickable trace IDs using OSC 8 escape sequences.

#### Supported Terminals

- iTerm2 (macOS)
- VS Code integrated terminal
- GNOME Terminal
- Hyper
- Most xterm-compatible terminals

#### Example Output

```
Trace: trace_abc123 (clickable - cmd+click to navigate)
↳ Parent: trace_xyz789 (clickable)
```

#### How It Works

Quzz uses OSC 8 escape sequences to create hyperlinks:

- URL scheme: `quzz://trace/{traceId}`
- Automatic detection of terminal support
- Graceful fallback to plain text for unsupported terminals

#### Configuration

```typescript
// quzz.config.ts
export default {
  enableHyperlinks: true, // Default: true
};

// Or disable via environment
// QUZZ_DISABLE_HYPERLINKS=true
```

### Heap Snapshots

Automatic heap snapshot generation for memory debugging.

#### Overview

When memory usage exceeds a threshold, quzz automatically captures a heap snapshot for analysis in Chrome DevTools.

#### Configuration

```typescript
// quzz.config.ts
export default {
  performance: {
    enabled: true,
    trackMemory: true,
    memoryThreshold: 50 * 1024 * 1024, // 50MB
    enableHeapSnapshots: true,
    heapSnapshotDir: "./heap-snapshots",
  },
};
```

#### How It Works

1. Component renders with high memory delta (>50MB)
2. Warning logged: `High memory usage detected: +52.34MB`
3. Heap snapshot saved: `heap-ComponentName-2025-10-27T12-34-56.heapsnapshot`
4. Log message: `Heap snapshot saved to: ./heap-snapshots/heap-ComponentName-...`

#### Analyzing Snapshots

1. Open Chrome DevTools
2. Go to **Memory** tab
3. Click **Load** button
4. Select the `.heapsnapshot` file
5. Analyze:
   - **Summary**: Object types and memory usage
   - **Comparison**: Compare with other snapshots
   - **Containment**: Object retention paths
   - **Statistics**: Memory distribution

#### Safety Features

- ✅ **Dev-only**: Automatically disabled in production
- ✅ **Explicit opt-in**: Requires `enableHeapSnapshots: true`
- ✅ **Warnings**: Warns about disk usage and overhead
- ✅ **Auto-directory**: Creates directory if missing
- ✅ **Timestamped**: Filenames include timestamp for tracking

#### Use Cases

- Memory leak detection
- Understanding object retention
- Optimizing memory usage
- Debugging high memory consumption

### Environment Variables

Full environment variable support for CI/CD and production debugging.

#### Supported Variables

**Enable/Disable:**

- `QUZZ_ENABLED=true|false|1|0` - Enable/disable tracing
- `QUZZ_DISABLE=true` - Complete disable (highest priority)
- `QUZZ_FORCE_ENABLE=true|false|1|0` - Force enable in production

**Configuration:**

- `QUZZ_LOG_LEVEL=silent|error|warn|info|debug|trace` - Set log level
- `QUZZ_OUTPUT_FORMAT=pretty|json|compact` - Set output format

**Features:**

- `QUZZ_DISABLE_HYPERLINKS=true` - Disable terminal hyperlinks

#### Examples

**Development:**

```bash
QUZZ_LOG_LEVEL=debug QUZZ_OUTPUT_FORMAT=compact npm run dev
```

**CI/CD:**

```bash
QUZZ_ENABLED=true QUZZ_OUTPUT_FORMAT=json npm test
```

**Production Debugging (use with caution):**

```bash
QUZZ_FORCE_ENABLE=true QUZZ_LOG_LEVEL=error npm start
```

#### Priority Order

1. `QUZZ_DISABLE` (highest - overrides everything)
2. `QUZZ_ENABLED` (explicit enable)
3. `configure()` / config file settings
4. Environment detection (`NODE_ENV`)

#### Benefits

- ✅ Flexible configuration without code changes
- ✅ Perfect for CI/CD pipelines
- ✅ Environment-specific settings
- ✅ Can override file-based config
- ✅ Quick debugging in production (emergency only)

## Core Features

### Component Tracing

The foundation of quzz is component tracing, which provides visibility into React Server Component rendering:

```tsx
import { withRSCTrace } from "quzz";

const MyComponent = withRSCTrace(
  async function MyComponent({ data }) {
    // Your component logic
    return <div>{data}</div>;
  },
  {
    componentName: "MyComponent",
    tags: ["critical", "data-fetch"],
  }
);
```

### RSC Boundary

For fine-grained control without modifying components:

```tsx
import { RSCBoundary } from "quzz";

<RSCBoundary label="critical-section" tags={["important"]}>
  <YourComponents />
</RSCBoundary>;
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
import { BaseAsyncStorage } from "quzz/storage";

interface AppState {
  feature: string;
  data: any;
}

class AppStateStorage extends BaseAsyncStorage<AppState> {
  protected createDefaultStore(): AppState {
    return { feature: "", data: null };
  }

  protected validateStore(store: unknown): store is AppState {
    return typeof store === "object" && "feature" in store;
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
const appStorage = new AppStateStorage({ name: "app-state" });
contextManager.registerStorage("app", appStorage);

contextManager.runWithStorage(
  "app",
  { feature: "dashboard", data: {} },
  async () => {
    // Your async operations have access to app state
  }
);
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
import { getContextSnapshots, getLatestSnapshot } from "quzz";

// During component execution
const snapshot = contextManager.captureSnapshot({
  label: "critical-point",
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
  timestamp: number; // When captured
  store: T | undefined; // Context state
  stackDepth: number; // Nesting level
  label?: string; // Custom identifier
}
```

### Debugging with Snapshots

```typescript
// Check support
if (isSnapshotSupported()) {
  // Your debugging logic
  const snapshots = getContextSnapshots();

  // Analyze context flow
  snapshots.forEach((snap) => {
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
  console.error("Memory leak detected!", {
    growth: memoryStats.growth,
    baseline: memoryStats.baseline,
    current: memoryStats.current,
  });
}

// Track memory trend
const trend = contextManager.getMemoryTrend(10); // Last 10 snapshots
if (trend) {
  const avgGrowth =
    trend.samples.reduce((a, b) => a + b.heapUsed, 0) / trend.samples.length;
  console.log("Average memory usage:", avgGrowth);
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
  plugins: [
    {
      name: "performance-budget",
      onTraceEnd: async (metadata) => {
        if (metadata.duration > 1000) {
          // Alert or log to monitoring service
          await notifySlack(
            `Component ${metadata.componentName} exceeded budget`
          );
        }
      },
    },
  ],
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
  enableTracing: process.env.ENABLE_TRACING === "true",
  enableMemoryMetrics: process.env.NODE_ENV === "development",
  enableSnapshots: process.env.DEBUG === "true",
});
```

### Storage Lifecycle

Manage storage lifecycle:

```typescript
// Enable/disable at runtime
contextManager.enableStorage("trace");
contextManager.disableStorage("memory");

// Unregister completely
contextManager.unregisterStorage("custom");

// Clear all data
contextManager.clearAll();

// Dispose (cleanup)
contextManager.dispose();
```

## Best Practices

### 1. Development vs Production

```typescript
// Development configuration
if (process.env.NODE_ENV === "development") {
  configure({
    logLevel: "debug",
    verboseMode: true,
    enableSnapshots: true,
    performance: { trackMemory: true },
  });
}

// Production (if needed)
if (process.env.ENABLE_PRODUCTION_TRACING === "true") {
  configure({
    forceEnable: true,
    logLevel: "error",
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
  if (stats?.growth > 100_000_000) {
    // 100MB growth
    console.warn("High memory growth detected");
    // Take action
  }
}, 60000); // Every minute
```

### 4. Error Handling

```typescript
// Wrap storage operations
try {
  contextManager.runWithStorage("critical", context, async () => {
    // Your code
  });
} catch (error) {
  // Capture snapshot for debugging
  const errorSnapshot = contextManager.captureSnapshot({
    label: `error-${error.message}`,
  });
  console.error("Error with context:", errorSnapshot);
}
```

## Migration Guide

### From v0.3.x to v0.4.0

The v0.4.0 release is fully backward compatible. All existing code continues to work, and new features are opt-in.

#### Quick Migration

**Option 1: File-Based Config (Recommended)**

Create `quzz.config.ts` in your project root and move your configuration there:

```typescript
// Before: app/layout.tsx
import { configure } from "quzz";

configure({
  logLevel: "info",
  outputFormat: "pretty",
  // ... rest of config
});

// After: quzz.config.ts (in project root)
export default {
  logLevel: "info",
  outputFormat: "compact", // Try the new compact format!
  // ... rest of config
};

// app/layout.tsx - No code needed!
// Config is automatically loaded
```

**Option 2: Keep Programmatic Config**

Your existing `configure()` calls still work perfectly:

```typescript
// This still works exactly as before
import { configure } from "quzz";

configure({
  logLevel: "info",
  outputFormat: "pretty",
});
```

#### New Feature Adoption

1. **Try compact output**: Set `outputFormat: "compact"` in your config
2. **Enable heap snapshots**: Add `performance.enableHeapSnapshots: true`
3. **Use environment variables**: `QUZZ_LOG_LEVEL=debug npm run dev`
4. **Component filtering**: Add `componentFilter: /^(YourComponents)/`

#### Breaking Changes

**None!** v0.4.0 is fully backward compatible.

### From v0.2.x to v0.3.0

The v0.3.0 release is backward compatible. Existing code continues to work, and new features are opt-in:

```typescript
// Old code still works
import { withRSCTrace, configure } from "quzz";

// New features are additive
import { ContextManager } from "quzz/storage";
import { getContextSnapshots } from "quzz";
```

### Adopting v0.3.0 Features

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

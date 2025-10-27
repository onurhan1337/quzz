<div align="center">
  <img src="logo.svg" alt="quzz logo" width="64" height="64">
  <h1>quzz</h1>
</div>

Debugging tool for React Server Components in Next.js. Wrap your components to get visibility into render times, props, errors, and execution flow.

[![npm version](https://badge.fury.io/js/quzz.svg)](https://www.npmjs.com/package/quzz)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why quzz?

React Server Components don't work with traditional debugging tools like React DevTools. Console logs get scattered in server output, and errors lose context when crossing the server-client boundary.

quzz provides a simple HOC wrapper that gives you detailed logging during development and automatically disables itself in production.

## Features

### Core Features

- **File-based configuration** - `quzz.config.mjs` (like `next.config.mjs`)
- **Compact output format** - Clean, single-line logs with colors
- **Environment variable support** - `QUZZ_*` env vars for flexibility
- **Terminal hyperlinks** - Clickable trace IDs (OSC 8)
- **Heap snapshots** - Automatic memory debugging on high usage
- Zero configuration required (but highly configurable)
- Simple HOC (`withRSCTrace`) wrapper for components

### Monitoring & Debugging

- Automatic performance tracking with configurable thresholds
- Error tracking with full context
- Props logging with automatic sensitive data redaction
- Component hierarchy visualization
- Memory leak detection and tracking
- **Next.js 15+ async props support** with Promise type hints
- Context snapshots for advanced debugging

### Developer Experience

- Optional: `<RSCBoundary>` component for fine-grained tracing
- Built-in trace collection for performance analysis
- Full TypeScript support with type-safe config
- Plugin system for custom integrations
- Regex-based component filtering
- Multiple output formats (pretty, compact, json)

### Production Safety

- Zero production overhead (automatically disabled in production)
- Production-safe by default
- Configurable via environment variables for CI/CD

## Installation

```bash
npm install quzz
```

## Quick Start

Wrap any React Server Component with `withRSCTrace`:

```tsx
import { withRSCTrace } from "quzz";

async function UserProfile({ userId }: { userId: string }) {
  const user = await fetchUser(userId);
  return <div>{user.name}</div>;
}

export default withRSCTrace(UserProfile);
```

**Output in your terminal:**

```
ℹ️ [quzz] UserProfile rendered in 142ms
Props: { userId: "user_123" }
Memory: 45.2 MB
```

## Configuration

### Option 1: File-Based Configuration (Recommended)

Create a configuration file in your project root:

**Supported file formats (in priority order):**
- `quzz.config.ts` - TypeScript (requires async loading)
- `quzz.config.mts` - TypeScript ESM (requires async loading)
- `quzz.config.cts` - TypeScript CommonJS (requires async loading)
- `quzz.config.mjs` - JavaScript ESM (requires async loading)
- `quzz.config.js` - JavaScript CommonJS (immediate loading, **recommended**)
- `quzz.config.cjs` - JavaScript CommonJS explicit (immediate loading)

**Recommended: Use `.js` or `.cjs` for immediate synchronous loading:**

```javascript
// quzz.config.js
/** @type {import('quzz').QuzzConfig} */
module.exports = {
  logLevel: "info",
  outputFormat: "compact", // "pretty" | "compact" | "json"

  performance: {
    enabled: true,
    warnThreshold: 500, // Warn if render > 500ms
    trackMemory: true,
    memoryThreshold: 50 * 1024 * 1024, // 50MB
    enableHeapSnapshots: false, // Enable for memory debugging
  },

  props: {
    showPromiseTypes: true, // Next.js 15+ Promise type hints
    awaitProps: false, // Set to true to await Promises
    maxArrayItems: 10,
    maxObjectProps: 20,
  },

  // Component filtering with regex
  componentFilter: /^(Blog|Product|Work)/,

  // Security: redact sensitive keys
  sensitiveKeys: ["apiKey", "secretToken"],

  // Terminal hyperlinks (clickable trace IDs)
  enableHyperlinks: true,
};
```

**Alternative: TypeScript or ESM (async loading):**

```typescript
// quzz.config.ts or quzz.config.mjs
import type { QuzzConfig } from 'quzz';

const config: QuzzConfig = {
  logLevel: "info",
  outputFormat: "compact",
  // ... rest of config
};

export default config;
```

**Note:** TypeScript and ESM config files (`.ts`, `.mts`, `.mjs`) require asynchronous module loading and will be loaded in the background. For immediate loading at startup, use `.js` or `.cjs` with CommonJS syntax.

**That's it!** Config is automatically loaded when quzz initializes. No code changes needed.

### Option 2: Programmatic Configuration

For runtime configuration, use `configure()`:

```tsx
// app/layout.tsx
import { configure } from "quzz";

if (process.env.NODE_ENV === "development") {
  configure({
    logLevel: "info",
    outputFormat: "compact",
    performance: {
      enabled: true,
      warnThreshold: 500,
    },
  });
}
```

### Option 3: Environment Variables

Override any setting via environment variables:

```bash
# Enable/disable
QUZZ_ENABLED=true
QUZZ_DISABLE=true  # Complete disable (highest priority)

# Configuration
QUZZ_LOG_LEVEL=debug
QUZZ_OUTPUT_FORMAT=compact
QUZZ_FORCE_ENABLE=true  # Force enable in production (not recommended)

# Features
QUZZ_DISABLE_HYPERLINKS=true
```

### Configuration Priority

Settings are merged in this order (highest priority last):

1. **Defaults** (built-in)
2. **quzz.config.mjs** (file-based)
3. **Environment variables** (`QUZZ_*`)
4. **configure()** (programmatic)

## Examples

### Next.js 15+ Async Props Support

Next.js 15 introduced async props like `params` and `searchParams` that appear as `[Promise]` in logs, making debugging difficult. quzz provides two solutions:

#### Option 1: Promise Type Hints (Default, Safe)

By default, quzz detects Promise props and displays type hints without awaiting them:

```tsx
import { withRSCTrace, configure } from "quzz";

configure({
  logLevel: "info",
  logProps: true,
  props: {
    showPromiseTypes: true, // Default: true
  },
});

async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await fetchProduct(slug);
  return <div>{product.name}</div>;
}

export default withRSCTrace(ProductPage);
```

**Output:**

```
ℹ️ [quzz] ProductPage rendered in 142ms
Props: { params: [Promise<PageProps>] }
```

This approach is **safe** - no side effects, no performance impact.

#### Option 2: Await Props (Opt-in, May Trigger Side Effects)

For complete visibility, enable `awaitProps` to resolve Promise values before logging:

```tsx
import { configure } from "quzz";

configure({
  logLevel: "info",
  logProps: true,
  props: {
    awaitProps: true, // CAUTION: May trigger side effects
    awaitTimeout: 5000, // Timeout in ms (default: 5000)
    showPromiseTypes: true,
  },
});
```

**Output with awaitProps enabled:**

```
ℹ️ [quzz] ProductPage rendered in 145ms
Props: { params: { slug: "wireless-keyboard" } }
```

**⚠️ Important Warnings:**

- **Side Effects**: Awaiting props may trigger database queries, network requests, or other side effects
- **Performance**: Adds latency to resolve all Promises before logging
- **Hanging Risk**: If a Promise never resolves, it will timeout (default: 5s)
- **Error Handling**: Failed Promises show as `[Promise: Error - message]`

**When to use awaitProps:**

- ✅ Debugging specific issues with async props in development
- ✅ Investigating what values are actually being passed
- ❌ **NOT** in production (quzz is disabled by default anyway)
- ❌ **NOT** as a default configuration (too risky)

**Component-level override:**

```tsx
// Enable only for specific components
const DebugPage = withRSCTrace(ProductPage, {
  componentName: "ProductPage",
  logProps: true,
  props: {
    awaitProps: true, // Enable just for this component
  },
});
```

#### Handling Errors and Timeouts

When `awaitProps` is enabled, quzz handles Promise failures gracefully:

```tsx
async function BrokenPage({
  params,
  slowData,
}: {
  params: Promise<{ id: string }>;
  slowData: Promise<string>;
}) {
  // params will fail to resolve
  // slowData will timeout
  return <div>Content</div>;
}

export default withRSCTrace(BrokenPage, {
  props: { awaitProps: true, awaitTimeout: 1000 },
});
```

**Output:**

```
ℹ️ [quzz] BrokenPage rendered in 1050ms
Props: {
  params: [Promise<PageProps>: Error - Promise rejection],
  slowData: [Promise: Promise timeout after 1000ms]
}
```

### Track Slow Components

Monitor components that might be slow and get warnings when they exceed a threshold:

```tsx
import { withRSCTrace } from "quzz";

const DataTable = withRSCTrace(
  async function DataTable({ filters }) {
    const data = await db.query(filters);
    return <Table data={data} />;
  },
  {
    componentName: "DataTable",
    performance: { warnThreshold: 200 }, // Warn if > 200ms
  }
);

export default DataTable;
```

**Output when slow:**

```
⚠️  [DataTable] Slow render detected: 523ms
Props: { filters: { status: "active", limit: 100 } }
Threshold: 200ms
```

### Catch and Debug Errors

Get detailed error information with full context:

```tsx
const PaymentProcessor = withRSCTrace(
  async function PaymentProcessor({ orderId }) {
    const payment = await processPayment(orderId);
    return <PaymentStatus {...payment} />;
  },
  {
    componentName: "PaymentProcessor",
    logLevel: "error",
  }
);

export default PaymentProcessor;
```

**Output on error:**

```
❌ [PaymentProcessor] Error: Payment processing failed
Props: { orderId: "order_123" }
Stack:
  at processPayment (app/payments/processor.ts:45:11)
  at PaymentProcessor (app/components/Payment.tsx:12:20)
Duration before error: 234ms
```

### Monitor Multiple Components

Track performance across your entire application:

```tsx
// app/api/metrics/route.ts
import { getPerformanceSummary } from "quzz";

export async function GET() {
  const summary = getPerformanceSummary();

  return Response.json({
    totalRenders: summary.totalRenders,
    avgDuration: summary.avgDuration,
    slowest: summary.slowest,
    errors: summary.totalErrors,
  });
}
```

**Example response:**

```json
{
  "totalRenders": 1247,
  "avgDuration": 156,
  "slowest": { "component": "DataTable", "duration": 892 },
  "errors": 3
}
```

## New in v0.4.0

### 1. Compact Output Format

Clean, single-line logs perfect for high-frequency renders:

```bash
BlogDetailPage: 4.79ms (620MB) ✓
ProductPage: 124.32ms (45MB) ⚠
ErrorComponent: 532.11ms ✗ Database connection failed
```

**Configuration:**

```typescript
export default {
  outputFormat: "compact", // "pretty" | "compact" | "json"
};
```

### 2. Terminal Hyperlinks

Clickable trace IDs in supported terminals (iTerm2, VS Code, GNOME Terminal, Hyper):

```
Trace: trace_abc123 (clickable: cmd+click to navigate)
↳ Parent: trace_xyz789 (clickable)
```

Uses OSC 8 escape sequences with graceful fallback for unsupported terminals.

**Disable if needed:**

```bash
QUZZ_DISABLE_HYPERLINKS=true
```

### 3. Heap Snapshots (Memory Debugging)

Automatically capture heap snapshots when memory usage spikes:

```typescript
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

**How it works:**

1. Component renders with high memory delta (>50MB)
2. Warning logged: `High memory usage detected: +52.34MB`
3. Heap snapshot automatically saved: `heap-ComponentName-2025-10-27.heapsnapshot`
4. Analyze in Chrome DevTools → Memory tab → Load snapshot

**Safety:**

- ✅ Dev-only (disabled in production)
- ✅ Requires explicit `enableHeapSnapshots: true`
- ✅ Warns about disk usage

### 4. Environment Variable Support

Full CI/CD integration with environment variables:

```bash
# Development
QUZZ_LOG_LEVEL=debug QUZZ_OUTPUT_FORMAT=compact npm run dev

# CI/CD
QUZZ_ENABLED=true QUZZ_OUTPUT_FORMAT=json npm test

# Production debugging (use with caution)
QUZZ_FORCE_ENABLE=true QUZZ_LOG_LEVEL=error npm start
```

**Supported variables:**

- `QUZZ_ENABLED` - Enable/disable tracing
- `QUZZ_DISABLE` - Complete disable (highest priority)
- `QUZZ_LOG_LEVEL` - Set log level
- `QUZZ_OUTPUT_FORMAT` - Set output format
- `QUZZ_FORCE_ENABLE` - Force enable in production
- `QUZZ_DISABLE_HYPERLINKS` - Disable terminal hyperlinks

### 5. Component Filtering

Already existed but now better documented - filter traces with regex:

```typescript
export default {
  // Only trace components matching pattern
  componentFilter: /^(Blog|Product|Work)/,
};
```

Perfect for focusing on specific parts of your app during debugging.

## Advanced Features

### Modular Storage Architecture

quzz v0.3.0 introduces a powerful modular storage system built on Node.js AsyncLocalStorage, providing isolated context tracking across async boundaries:

```typescript
import { ContextManager } from "quzz/storage";

// Initialize with custom storage configuration
const contextManager = ContextManager.getInstance({
  enableTracing: true,
  enableMemoryMetrics: true,
  debugMode: true,
});

// Register custom storage for your application state
import { BaseAsyncStorage } from "quzz/storage";

class UserContextStorage extends BaseAsyncStorage<UserContext> {
  protected createDefaultStore() {
    return { userId: null, permissions: [] };
  }

  protected validateStore(store: unknown): store is UserContext {
    return typeof store === "object" && store !== null;
  }
}

// Register and use custom storage
const userStorage = new UserContextStorage({ name: "user-context" });
contextManager.registerStorage("user", userStorage);

// Run with isolated context
contextManager.runWithStorage(
  "user",
  { userId: "123", permissions: ["read"] },
  async () => {
    // Your async operations have access to the user context
    await processUserRequest();
  }
);
```

#### Memory Leak Detection

Monitor and detect memory leaks in your React Server Components:

```typescript
configure({
  performance: {
    enabled: true,
    trackMemory: true, // Enable memory tracking
  },
});

// Monitor memory usage
import { ContextManager } from "quzz/storage";

const manager = ContextManager.getInstance({
  enableMemoryMetrics: true,
});

// Get memory statistics
const memoryStats = manager.getMemoryStats();
if (memoryStats?.leakDetected) {
  console.warn("Memory leak detected:", memoryStats.growth);
}

// Get memory trend over time
const trend = manager.getMemoryTrend(10); // Last 10 snapshots
console.log("Memory trend:", trend);
```

### Context Snapshots for Debugging

Debug complex async flows with context snapshots (requires Node.js 16.12+):

```typescript
// Enable verbose mode with snapshots
configure({
  debugContext: true,
  enableSnapshots: true,
  verboseMode: true, // Automatically captures snapshots at key points
});

// Manual snapshot capture
import {
  getContextSnapshots,
  getLatestSnapshot,
  isSnapshotSupported,
} from "quzz";

// Check if your Node.js version supports snapshots
if (isSnapshotSupported()) {
  // Your component execution...

  // Get all captured snapshots
  const snapshots = getContextSnapshots();
  snapshots.forEach((snapshot) => {
    console.log(`Snapshot ${snapshot.label}:`, {
      timestamp: new Date(snapshot.timestamp).toISOString(),
      stackDepth: snapshot.stackDepth,
      context: snapshot.store,
    });
  });

  // Get the latest snapshot for debugging
  const latest = getLatestSnapshot();
  if (latest) {
    console.log("Latest context state:", latest);
  }
}
```

#### Snapshot Integration Example

```tsx
import { withRSCTrace, RSCBoundary } from "quzz";

// Snapshots are automatically captured in verbose mode
const DataProcessor = withRSCTrace(
  async function DataProcessor({ data }) {
    // Snapshot captured on entry: "component-enter:DataProcessor"

    try {
      const result = await processData(data);
      // Snapshot captured on exit: "component-exit:DataProcessor"
      return <Result data={result} />;
    } catch (error) {
      // Snapshot captured on error: "component-error:DataProcessor"
      throw error;
    }
  },
  {
    componentName: "DataProcessor",
  }
);

// Using with RSCBoundary
export default async function Dashboard() {
  return (
    <RSCBoundary label="dashboard" verboseMode={true}>
      {/* Snapshots captured: boundary-enter, boundary-exit, or boundary-error */}
      <DataProcessor data={userData} />
    </RSCBoundary>
  );
}
```

### RSCBoundary Component

Use `<RSCBoundary>` for fine-grained tracing without modifying your component structure:

```tsx
import { RSCBoundary } from "quzz";

export default async function Dashboard({ userId }: { userId: string }) {
  return (
    <RSCBoundary label="dashboard" tags={["critical"]} trackTotalLatency={true}>
      <div className="dashboard">
        <RSCBoundary label="user-section">
          <UserProfile userId={userId} />
        </RSCBoundary>

        <RSCBoundary label="feed-section" performance={{ warnThreshold: 200 }}>
          <UserFeed userId={userId} />
        </RSCBoundary>
      </div>
    </RSCBoundary>
  );
}
```

**When to use RSCBoundary vs withRSCTrace:**

- **Use RSCBoundary** for: async components without default exports, fine-grained tracing of specific regions, components you can't modify
- **Use withRSCTrace** for: simpler setup, lower overhead, most general component tracing

### Trace Collection for Performance Analysis

Collect and export component traces for analysis:

```tsx
import { configure, TraceCollector } from "quzz";

configure({
  visualizer: {
    enabled: true,
    output: "./traces.json",
  },
});
```

Then access collected traces programmatically:

```tsx
import { TraceCollector } from "quzz/visualizer/trace-collector";

const collector = TraceCollector.getInstance();

await collector.save("./my-traces.json");

const session = collector.getSession();
console.log(`Total traces: ${session?.totalTraces}`);
console.log(`Total errors: ${session?.totalErrors}`);
console.log(`Slowest component: ${session?.slowestComponent?.name}`);

const stats = collector.getStatistics();
console.log(stats);
```

The trace collector provides detailed statistics, error tracking, and performance metrics for building custom analysis tools.

## Production Safety

quzz is designed to be production-safe by default:

- **Automatically disabled in production**: quzz checks `NODE_ENV` and disables all tracing in production builds
- **Environment variable override**: Set `QUZZ_DISABLE=true` to disable quzz even in development
- **Explicit production enabling**: To enable in production (not recommended), use `forceEnable: true`:

```typescript
// Only use this for debugging production issues temporarily
configure({
  forceEnable: true, // Required to run in production
  logLevel: "error", // Only log errors to minimize overhead
});
```

**Important**: Never leave `forceEnable: true` in production code. It will impact performance.

## Advanced Configuration

### Component-Level Options

```typescript
withRSCTrace(Component, {
  // Naming
  componentName: "CustomName", // Override display name
  tags: ["auth", "critical"], // Add tags for filtering

  // Logging
  logLevel: "debug", // Override global level
  logProps: true, // Log sanitized props (deprecated, use props config)

  // Props Configuration (Next.js 15+ async props support)
  props: {
    awaitProps: false, // Await Promise props before logging
    awaitTimeout: 5000, // Timeout for awaiting (ms)
    showPromiseTypes: true, // Show type hints for Promises
  },

  // Performance
  performance: {
    enabled: true,
    warnThreshold: 1000, // ms
    trackMemory: true, // Node.js only
  },

  // Features
  disable: {
    props: false, // Skip prop logging
    timing: false, // Skip performance tracking
    errors: false, // Skip error logging
  },
});
```

### Plugin System

Create custom plugins for integrations:

```typescript
import { configure } from "quzz";

// Sentry Integration
const sentryPlugin = {
  onError: async (metadata, error) => {
    Sentry.captureException(error, {
      tags: {
        component: metadata.componentName,
        renderDuration: metadata.duration,
      },
      extra: { props: metadata.props },
    });
  },
};

// Performance Budget Plugin
const budgetPlugin = {
  onTraceEnd: async (metadata) => {
    if (metadata.duration > 1000) {
      await notifySlack(`🚨 ${metadata.componentName} exceeded 1s render time`);
    }
  },
};

configure({
  plugins: [sentryPlugin, budgetPlugin],
});
```

### Custom Output Formats

```typescript
import { configure } from "quzz";

configure({
  formatter: (entry) => ({
    timestamp: entry.timestamp,
    component: entry.componentName,
    level: entry.level,
    message: entry.message,
    // Custom fields
    traceId: entry.metadata?.traceId,
    userId: entry.metadata?.props?.userId,
  }),
});
```

## Troubleshooting

### Common Issues

#### 1. "I don't see any logs in development"

**Solution**: Check that `NODE_ENV` is set to `development`:

```bash
NODE_ENV=development next dev
```

Or force enable for debugging:

```tsx
configure({ forceEnable: true });
```

#### 2. "My sensitive data is being logged"

**Solution**: Add custom sensitive keys:

```tsx
configure({
  sensitiveKeys: ["creditCard", "ssn", "apiSecret"],
});
```

Default sensitive keys already include: password, token, secret, key, api_key, apikey, auth, credential, private, ssn, pin, passcode, hash, salt, signature, bearer, oauth, jwt, session, cookie, csrf, code

#### 3. "Performance metrics are accumulating memory"

**Solution**: quzz automatically cleans up old metrics, but you can tune it:

```tsx
import { clearMetrics } from "quzz";

// In a cleanup job or interval
setInterval(() => {
  clearMetrics();
}, 3600000); // Clear hourly
```

#### 4. "Errors lose context when crossing to client components"

**Solution**: quzz automatically serializes errors for the RSC boundary. For custom error types:

```tsx
class CustomError extends Error {
  toJSON() {
    return {
      message: this.message,
      customField: this.customField,
    };
  }
}
```

#### 5. "Logs are too verbose"

**Solution**: Use component filtering:

```tsx
configure({
  componentFilter: /^(Header|Footer|Nav)/, // Only trace these
  logLevel: "warn", // Only warnings and errors
});
```

#### 6. "How do I test with quzz enabled?"

**Solution**: In your test setup:

```tsx
// jest.setup.js or vitest.setup.js
import { configure } from "quzz";

configure({
  logLevel: "silent", // Disable logs in tests
  forceEnable: false,
});
```

#### 7. "Props show [Promise] in Next.js 15+"

**Problem**: Next.js 15 made `params` and `searchParams` async, appearing as `[Promise]` in logs.

**Solution A** (Safe, Default): quzz automatically detects Promises and shows type hints:

```tsx
configure({
  logProps: true,
  props: {
    showPromiseTypes: true, // Already enabled by default
  },
});
// Output: Props: { params: [Promise<PageProps>] }
```

**Solution B** (Advanced): Enable `awaitProps` for full visibility (use with caution):

```tsx
configure({
  logProps: true,
  props: {
    awaitProps: true, // ⚠️ May trigger side effects
    awaitTimeout: 5000,
  },
});
// Output: Props: { params: { slug: "product-123" } }
```

#### 8. "Props awaiting is hanging or slow"

**Solution**: Reduce timeout or disable awaitProps:

```tsx
configure({
  props: {
    awaitProps: false, // Disable awaiting
    showPromiseTypes: true, // Still show type hints
  },
});
```

Or adjust timeout per component:

```tsx
withRSCTrace(SlowComponent, {
  props: {
    awaitProps: true,
    awaitTimeout: 1000, // Shorter timeout
  },
});
```

### Performance Tips

1. **Use Component Filtering**: Don't trace every component

   ```tsx
   configure({
     componentFilter: /^Critical/, // Only components starting with "Critical"
   });
   ```

2. **Disable Prop Logging for Large Objects**:

   ```tsx
   withRSCTrace(Component, {
     logProps: false, // Skip if props are huge
   });
   ```

3. **Adjust Sanitization Depth**:

   ```tsx
   configure({
     maxPropDepth: 1, // Shallow sanitization for performance
     maxStringLength: 100, // Shorter strings
   });
   ```

4. **Use Throttling for High-Frequency Components**:
   ```tsx
   configure({
     throttleMs: 1000, // Max 1 log per second per component
   });
   ```

## API Reference

### Main Functions

#### `withRSCTrace(Component, options?)`

Wraps a React Server Component with tracing capabilities.

#### `configure(config)`

Sets global configuration for all traced components.

#### `getConfig()`

Returns current global configuration.

#### `resetConfig()`

Resets configuration to defaults.

### Performance Functions

#### `getMetrics(componentName?)`

Get performance metrics for a specific component or all components.

#### `getPerformanceSummary()`

Get aggregated performance summary across all components.

#### `exportMetrics()`

Export all metrics as JSON string.

#### `clearMetrics()`

Clear all collected performance metrics.

### Configuration File Functions (v0.4.0)

#### `hasConfigFile()`

Check if a quzz config file exists in the project root.

```typescript
import { hasConfigFile } from "quzz";

if (hasConfigFile()) {
  console.log("Config file found");
}
```

#### `getConfigFilePath()`

Get the path to the active config file.

```typescript
import { getConfigFilePath } from "quzz";

const path = getConfigFilePath();
console.log(`Using config: ${path}`);
// Output: Using config: /path/to/project/quzz.config.mjs
```

#### `loadConfigFromFileAsync()`

Manually load configuration from file (async). Useful for advanced use cases.

```typescript
import { loadConfigFromFileAsync } from "quzz";

const config = await loadConfigFromFileAsync();
```

### Context Snapshot Functions

#### `getContextSnapshots(storageName?)`

Get all captured context snapshots for debugging.

#### `getLatestSnapshot(storageName?)`

Get the most recent context snapshot.

#### `clearSnapshots(storageName?)`

Clear all captured snapshots.

#### `isSnapshotSupported()`

Check if AsyncLocalStorage.snapshot() is available (Node.js 16.12+).

### Storage Management

#### `ContextManager.getInstance(options?)`

Get the singleton context manager instance.

#### `contextManager.registerStorage(name, storage, enabled?)`

Register a custom storage instance.

#### `contextManager.runWithStorage(name, context, callback)`

Execute code with isolated storage context.

#### `contextManager.getMemoryStats()`

Get current memory usage statistics.

#### `contextManager.getMemoryTrend(windowSize?)`

Get memory usage trend over time.

## Architecture

quzz v0.3.0 features a modular architecture with enhanced storage capabilities:

1. **ConfigManager**: Global configuration with validation and runtime updates
2. **ContextManager**: Centralized storage orchestration with pluggable storage modules
3. **Storage Modules**:
   - **TraceStorage**: Request-isolated component hierarchy tracking
   - **MemoryMetricsStorage**: Memory usage monitoring and leak detection
   - **BaseAsyncStorage**: Abstract base for custom storage implementations
4. **TraceContext**: Legacy compatibility layer (delegates to ContextManager)
5. **PerformanceMonitor**: Metrics aggregation with automatic memory management
6. **Logger**: Multi-level, multi-format logging with transport support

### Storage Architecture Benefits

- **Isolation**: Each async context maintains isolated state
- **Extensibility**: Easy to add custom storage modules
- **Performance**: Optimized with Node.js AsyncLocalStorage
- **Debugging**: Context snapshots for complex flow analysis
- **Compatibility**: Fallback support for older Node.js versions

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed design documentation.

## Performance Impact

In development (with default settings):

- HOC wrapper overhead: ~50μs per component
- Prop sanitization: ~200μs (10 props, depth 3)
- Performance tracking: ~10μs per render

In production:

- **Complete no-op**: 0μs (unless forceEnabled)

## Contributing

Contributions are welcome! Please see the [Contributing Guide](./CONTRIBUTING.md) for details.

## License

MIT © 2025 quzz contributors

## Issues

Report bugs and request features at [GitHub Issues](https://github.com/onurhan1337/quzz/issues)

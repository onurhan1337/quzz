# API Reference

Complete API documentation for quzz.

## Core Functions

### `withRSCTrace(Component, options?)`

Wraps a React Server Component with tracing capabilities.

**Parameters:**

- `Component` - React Server Component to wrap
- `options` (optional) - Component-specific configuration

**Returns:** Wrapped component with tracing

**Example:**

```typescript
const TracedComponent = withRSCTrace(MyComponent, {
  componentName: "MyComponent",
  performance: { warnThreshold: 200 },
});
```

**Options:**

```typescript
interface TraceOptions {
  componentName?: string;
  tags?: string[];
  logLevel?: "debug" | "info" | "warn" | "error" | "silent";
  logProps?: boolean;
  routeHint?: string;
  props?: {
    awaitProps?: boolean;
    awaitTimeout?: number;
    showPromiseTypes?: boolean;
  };
  performance?: {
    enabled?: boolean;
    warnThreshold?: number;
    trackMemory?: boolean;
  };
  disable?: {
    props?: boolean;
    timing?: boolean;
    errors?: boolean;
  };
  autoLinkParent?: boolean;
}
```

### `configure(config)`

Sets global configuration for all traced components.

**Parameters:**

- `config` - Global configuration object

**Returns:** `void`

**Example:**

```typescript
import { configure } from "quzz";

configure({
  logLevel: "info",
  outputFormat: "compact",
  performance: { warnThreshold: 500 },
});
```

**Config Type:**

```typescript
interface QuzzConfig {
  logLevel?: "debug" | "info" | "warn" | "error" | "silent";
  outputFormat?: "pretty" | "compact" | "json";
  forceEnable?: boolean;
  traceId?: {
    mode?: "structured" | "random";
    includeRouteHint?: boolean;
    maxRouteLength?: number;
    maxSearchParamsLength?: number;
    maxIdLength?: number;
    maxPathLength?: number;
  };
  performance?: {
    enabled?: boolean;
    warnThreshold?: number;
    trackMemory?: boolean;
    memoryThreshold?: number;
    enableHeapSnapshots?: boolean;
    heapSnapshotDir?: string;
  };
  props?: {
    showPromiseTypes?: boolean;
    awaitProps?: boolean;
    awaitTimeout?: number;
    maxArrayItems?: number;
    maxObjectProps?: number;
  };
  componentFilter?: RegExp;
  sensitiveKeys?: string[];
  enableHyperlinks?: boolean;
  autoLinkParent?: boolean;
  debugContext?: boolean;
  enableSnapshots?: boolean;
  verboseMode?: boolean;
  visualizer?: {
    enabled?: boolean;
    output?: string;
  };
  plugins?: Plugin[];
  formatter?: (entry: LogEntry) => any;
}
```

### `getConfig()`

Returns current global configuration.

**Returns:** `QuzzConfig`

**Example:**

```typescript
import { getConfig } from "quzz";

const config = getConfig();
console.log(config.logLevel); // "info"
```

### `resetConfig()`

Resets configuration to defaults.

**Returns:** `void`

**Example:**

```typescript
import { resetConfig } from "quzz";

resetConfig();
```

## Performance Functions

### `getMetrics(componentName?)`

Get performance metrics for a specific component or all components.

**Parameters:**

- `componentName` (optional) - Component name to get metrics for

**Returns:** `ComponentMetrics | AllMetrics`

**Example:**

```typescript
import { getMetrics } from "quzz";

// Get metrics for specific component
const metrics = getMetrics("DataTable");
console.log(metrics);
// {
//   totalRenders: 45,
//   avgDuration: 234,
//   minDuration: 102,
//   maxDuration: 892,
//   totalErrors: 2
// }

// Get metrics for all components
const allMetrics = getMetrics();
console.log(allMetrics);
// {
//   DataTable: { ... },
//   UserProfile: { ... }
// }
```

**Types:**

```typescript
interface ComponentMetrics {
  totalRenders: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  totalErrors: number;
  lastRender?: Date;
}

interface AllMetrics {
  [componentName: string]: ComponentMetrics;
}
```

### `getPerformanceSummary()`

Get aggregated performance summary across all components.

**Returns:** `PerformanceSummary`

**Example:**

```typescript
import { getPerformanceSummary } from "quzz";

const summary = getPerformanceSummary();
console.log(summary);
// {
//   totalRenders: 1247,
//   avgDuration: 156,
//   slowest: { component: "DataTable", duration: 892 },
//   fastest: { component: "Header", duration: 12 },
//   totalErrors: 3
// }
```

**Type:**

```typescript
interface PerformanceSummary {
  totalRenders: number;
  avgDuration: number;
  slowest: { component: string; duration: number };
  fastest: { component: string; duration: number };
  totalErrors: number;
}
```

### `exportMetrics()`

Export all metrics as JSON string.

**Returns:** `string`

**Example:**

```typescript
import { exportMetrics } from "quzz";
import fs from "fs";

const metricsJson = exportMetrics();
fs.writeFileSync("metrics.json", metricsJson);
```

### `clearMetrics()`

Clear all collected performance metrics.

**Returns:** `void`

**Example:**

```typescript
import { clearMetrics } from "quzz";

// Clear metrics periodically
setInterval(() => {
  clearMetrics();
}, 3600000); // Every hour
```

## Configuration File Functions

### `hasConfigFile()`

Check if a quzz config file exists in the project root.

**Returns:** `boolean`

**Example:**

```typescript
import { hasConfigFile } from "quzz";

if (hasConfigFile()) {
  console.log("Config file found");
}
```

### `getConfigFilePath()`

Get the path to the active config file.

**Returns:** `string | null`

**Example:**

```typescript
import { getConfigFilePath } from "quzz";

const path = getConfigFilePath();
console.log(`Using config: ${path}`);
// Output: Using config: /path/to/project/quzz.config.js
```

### `loadConfigFromFileAsync()`

Manually load configuration from file (async).

**Returns:** `Promise<QuzzConfig | null>`

> Note: The synchronous `loadConfigFromFile()` is deprecated and returns `null`. Use the async API; file config is applied asynchronously (defaults/env take effect immediately, file config merges when ready).

**Example:**

```typescript
import { loadConfigFromFileAsync } from "quzz";

const config = await loadConfigFromFileAsync();
if (config) {
  console.log("Config loaded:", config);
}
```

## Context Snapshot Functions

### `getContextSnapshots(storageName?)`

Get all captured context snapshots for debugging.

**Parameters:**

- `storageName` (optional) - Storage name to get snapshots from

**Returns:** `Snapshot[]`

**Example:**

```typescript
import { getContextSnapshots } from "quzz";

const snapshots = getContextSnapshots();
snapshots.forEach((snapshot) => {
  console.log(`Snapshot ${snapshot.label}:`, {
    timestamp: new Date(snapshot.timestamp).toISOString(),
    stackDepth: snapshot.stackDepth,
  });
});
```

**Type:**

```typescript
interface Snapshot {
  label: string;
  timestamp: number;
  stackDepth: number;
  store: any;
}
```

### `getLatestSnapshot(storageName?)`

Get the most recent context snapshot.

**Parameters:**

- `storageName` (optional) - Storage name to get snapshot from

**Returns:** `Snapshot | null`

**Example:**

```typescript
import { getLatestSnapshot } from "quzz";

const latest = getLatestSnapshot();
if (latest) {
  console.log("Latest context:", latest);
}
```

### `clearSnapshots(storageName?)`

Clear all captured snapshots.

**Parameters:**

- `storageName` (optional) - Storage name to clear snapshots from

**Returns:** `void`

**Example:**

```typescript
import { clearSnapshots } from "quzz";

clearSnapshots();
```

### `isSnapshotSupported()`

Check if AsyncLocalStorage.snapshot() is available (Node.js 16.12+).

**Returns:** `boolean`

**Example:**

```typescript
import { isSnapshotSupported } from "quzz";

if (isSnapshotSupported()) {
  console.log("Snapshots are supported");
}
```

## Storage Management

### `ContextManager.getInstance(options?)`

Get the singleton context manager instance.

**Parameters:**

- `options` (optional) - Context manager configuration

**Returns:** `ContextManager`

**Example:**

```typescript
import { ContextManager } from "quzz/storage";

const manager = ContextManager.getInstance({
  enableTracing: true,
  enableMemoryMetrics: true,
  debugMode: true,
});
```

**Options:**

```typescript
interface ContextManagerOptions {
  enableTracing?: boolean;
  enableMemoryMetrics?: boolean;
  debugMode?: boolean;
}
```

### `contextManager.registerStorage(name, storage, enabled?)`

Register a custom storage instance.

**Parameters:**

- `name` - Storage name
- `storage` - Storage instance
- `enabled` (optional) - Whether storage is enabled

**Returns:** `void`

**Example:**

```typescript
import { BaseAsyncStorage } from "quzz/storage";

class CustomStorage extends BaseAsyncStorage<MyContext> {
  protected createDefaultStore() {
    return { userId: null };
  }

  protected validateStore(store: unknown): store is MyContext {
    return typeof store === "object" && store !== null;
  }
}

const storage = new CustomStorage({ name: "custom" });
manager.registerStorage("custom", storage);
```

### `contextManager.runWithStorage(name, context, callback)`

Execute code with isolated storage context.

**Parameters:**

- `name` - Storage name
- `context` - Context data
- `callback` - Function to execute with context

**Returns:** `Promise<T>`

**Example:**

```typescript
await manager.runWithStorage(
  "user",
  { userId: "123", permissions: ["read"] },
  async () => {
    await processUserRequest();
  }
);
```

### `contextManager.getMemoryStats()`

Get current memory usage statistics.

**Returns:** `MemoryStats | null`

**Example:**

```typescript
const memoryStats = manager.getMemoryStats();
if (memoryStats?.leakDetected) {
  console.warn("Memory leak detected:", memoryStats.growth);
}
```

**Type:**

```typescript
interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  growth: number;
  leakDetected: boolean;
}
```

### `contextManager.getMemoryTrend(windowSize?)`

Get memory usage trend over time.

**Parameters:**

- `windowSize` (optional) - Number of snapshots to include (default: 10)

**Returns:** `number[]`

**Example:**

```typescript
const trend = manager.getMemoryTrend(10);
console.log("Memory trend:", trend);
```

## Trace Collection

### `TraceCollector.getInstance()`

Get the singleton trace collector instance.

**Returns:** `TraceCollector`

**Example:**

```typescript
import { TraceCollector } from "quzz/visualizer/trace-collector";

const collector = TraceCollector.getInstance();
```

### `collector.save(filepath)`

Save collected traces to a file.

**Parameters:**

- `filepath` - Path to save traces

**Returns:** `Promise<void>`

**Example:**

```typescript
await collector.save("./traces.json");
```

### `collector.getSession()`

Get current trace session data.

**Returns:** `TraceSession | null`

**Example:**

```typescript
const session = collector.getSession();
console.log(`Total traces: ${session?.totalTraces}`);
console.log(`Total errors: ${session?.totalErrors}`);
console.log(`Slowest component: ${session?.slowestComponent?.name}`);
```

**Type:**

```typescript
interface TraceSession {
  startTime: number;
  endTime: number;
  totalTraces: number;
  totalErrors: number;
  slowestComponent: {
    name: string;
    duration: number;
    traceId: string;
  };
  traces: Trace[];
}
```

### `collector.getStatistics()`

Get detailed trace statistics.

**Returns:** `TraceStatistics`

**Example:**

```typescript
const stats = collector.getStatistics();
console.log(stats);
```

**Type:**

```typescript
interface TraceStatistics {
  totalTraces: number;
  totalErrors: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  componentBreakdown: {
    [componentName: string]: {
      count: number;
      avgDuration: number;
    };
  };
}
```

## URL Parsing Utilities

### `safeURLParsing(urlStr)`

Safely parses URLs and paths with security filtering.

**Parameters:**

- `urlStr` - URL string or path to parse

**Returns:** `URLParseResult`

**Example:**

```typescript
import { safeURLParsing } from "quzz";

const result = safeURLParsing("https://example.com/path?query=123");
console.log(result);
// { domain: "https://example.com", path: "/path?query=123" }

const pathResult = safeURLParsing("/users/profile");
console.log(pathResult);
// { domain: undefined, path: "/users/profile" }
```

**Type:**

```typescript
interface URLParseResult {
  domain?: string;
  path?: string;
}
```

**Security Features:**

- Filters dangerous protocols (javascript:, data:, etc.)
- Handles malformed URLs gracefully
- Applies length limits to prevent DoS
- Safe handling of special characters

### `truncatePath(path, maxLength)`

Intelligently truncates long paths while preserving important segments.

**Parameters:**

- `path` - Path string to truncate
- `maxLength` - Maximum length allowed

**Returns:** `string`

**Example:**

```typescript
import { truncatePath } from "quzz";

const longPath = "/products/electronics/smartphones/iphone-15-pro-max/reviews";
const result = truncatePath(longPath, 30);
console.log(result);
// "/products/.../reviews"

const urlPath = "https://example.com/very/long/path/here";
const urlResult = truncatePath(urlPath, 40);
console.log(urlResult);
// "https://example.com/.../here"
```

**Truncation Logic:**

- Preserves domain for URLs
- Shows first and last path segments when possible
- Uses "..." to indicate truncation
- Handles query parameters and fragments
- Maintains path structure intelligently

## Components

### `<RSCBoundary>`

Component for fine-grained tracing without modifying component structure.

**Props:**

```typescript
interface RSCBoundaryProps {
  label: string;
  tags?: string[];
  children: React.ReactNode;
  trackTotalLatency?: boolean;
  performance?: {
    warnThreshold?: number;
  };
  verboseMode?: boolean;
}
```

**Example:**

```tsx
import { RSCBoundary } from "quzz";

export default async function Dashboard() {
  return (
    <RSCBoundary label="dashboard" tags={["critical"]}>
      <div>Dashboard content</div>
    </RSCBoundary>
  );
}
```

## Types

### `Plugin`

```typescript
interface Plugin {
  onTraceStart?: (metadata: TraceMetadata) => void | Promise<void>;
  onTraceEnd?: (metadata: TraceMetadata) => void | Promise<void>;
  onError?: (metadata: TraceMetadata, error: Error) => void | Promise<void>;
}
```

### `TraceMetadata`

```typescript
interface TraceMetadata {
  traceId: string;
  componentName: string;
  duration: number;
  props: Record<string, any>;
  tags?: string[];
  parentTraceId?: string;
  timestamp: number;
  routeHint?: string;
  rootTraceId?: string;
  sequence?: number;
}
```

### `LogEntry`

```typescript
interface LogEntry {
  level: "debug" | "info" | "warn" | "error";
  message: string;
  componentName: string;
  timestamp: number;
  metadata?: TraceMetadata;
}
```

## Environment Variables

All configuration options can be overridden via environment variables:

- `QUZZ_ENABLED` - Enable/disable quzz (`true`/`false`)
- `QUZZ_DISABLE` - Complete disable, highest priority (`true`/`false`)
- `QUZZ_LOG_LEVEL` - Set log level (`debug`/`info`/`warn`/`error`/`silent`)
- `QUZZ_OUTPUT_FORMAT` - Set output format (`pretty`/`compact`/`json`)
- `QUZZ_FORCE_ENABLE` - Force enable in production (`true`/`false`)
- `QUZZ_DISABLE_HYPERLINKS` - Disable terminal hyperlinks (`true`/`false`)

**Example:**

```bash
QUZZ_LOG_LEVEL=debug QUZZ_OUTPUT_FORMAT=compact npm run dev
```

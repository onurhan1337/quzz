# Examples

Practical examples for common quzz use cases.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Next.js 15+ Async Props](#nextjs-15-async-props)
- [Performance Monitoring](#performance-monitoring)
- [Error Handling](#error-handling)
- [Memory Debugging](#memory-debugging)
- [Nested Components](#nested-components)
- [RSCBoundary Component](#rscboundary-component)
- [Performance Analysis](#performance-analysis)
- [Plugin Integration](#plugin-integration)

## Basic Usage

### Simple Component Tracing

```tsx
import { withRSCTrace } from "quzz";

async function UserProfile({ userId }: { userId: string }) {
  const user = await fetchUser(userId);
  return <div>{user.name}</div>;
}

export default withRSCTrace(UserProfile);
```

**Terminal output:**

```
ℹ️ [quzz] UserProfile rendered in 142ms
Props: { userId: "user_123" }
```

### Custom Component Name

```tsx
const TracedProfile = withRSCTrace(UserProfile, {
  componentName: "UserProfile",
  tags: ["auth", "user"],
});

export default TracedProfile;
```

## Next.js 15+ Async Props

Next.js 15 introduced async `params` and `searchParams`. quzz provides two solutions for debugging these.

### Option 1: Promise Type Hints (Safe, Default)

Shows Promise type without awaiting (no side effects):

```tsx
import { withRSCTrace, configure } from "quzz";

configure({
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

### Option 2: Await Props (Advanced)

Resolves Promise values before logging:

```tsx
import { configure } from "quzz";

configure({
  logProps: true,
  props: {
    awaitProps: true, // ⚠️ May trigger side effects
    awaitTimeout: 5000,
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
ℹ️ [quzz] ProductPage rendered in 145ms
Props: { params: { slug: "wireless-keyboard" } }
```

**Warnings:**

- May trigger database queries, network requests, or other side effects
- Adds latency to resolve Promises
- Use timeout to prevent hanging
- Only enable for specific debugging scenarios

### Component-Level Override

Enable `awaitProps` for specific components only:

```tsx
const DebugProductPage = withRSCTrace(ProductPage, {
  componentName: "ProductPage",
  props: {
    awaitProps: true, // Enable just for this component
    awaitTimeout: 5000,
  },
});

export default DebugProductPage;
```

### Handling Promise Errors

```tsx
async function BrokenPage({
  params,
  slowData,
}: {
  params: Promise<{ id: string }>;
  slowData: Promise<string>;
}) {
  return <div>Content</div>;
}

export default withRSCTrace(BrokenPage, {
  props: {
    awaitProps: true,
    awaitTimeout: 1000,
  },
});
```

**Output when Promises fail:**

```
ℹ️ [quzz] BrokenPage rendered in 1050ms
Props: {
  params: [Promise<PageProps>: Error - Promise rejection],
  slowData: [Promise: Promise timeout after 1000ms]
}
```

## Performance Monitoring

### Track Slow Components

```tsx
import { withRSCTrace } from "quzz";

const DataTable = withRSCTrace(
  async function DataTable({ filters }) {
    const data = await db.query(filters);
    return <Table data={data} />;
  },
  {
    componentName: "DataTable",
    performance: {
      warnThreshold: 200, // Warn if > 200ms
    },
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

### Global Performance Tracking

```javascript
// quzz.config.js
module.exports = {
  performance: {
    enabled: true,
    warnThreshold: 500,
    trackMemory: true,
  },
};
```

### Get Performance Metrics

```tsx
// app/api/metrics/route.ts
import { getPerformanceSummary, getMetrics } from "quzz";

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

### Component-Specific Metrics

```tsx
import { getMetrics } from "quzz";

const metrics = getMetrics("DataTable");
console.log(metrics);
// {
//   totalRenders: 45,
//   avgDuration: 234,
//   minDuration: 102,
//   maxDuration: 892,
//   totalErrors: 2
// }
```

## Error Handling

### Basic Error Tracking

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

### Custom Error Serialization

```tsx
class CustomError extends Error {
  constructor(message: string, public customField: string) {
    super(message);
  }

  toJSON() {
    return {
      message: this.message,
      customField: this.customField,
      stack: this.stack,
    };
  }
}
```

## Memory Debugging

### Enable Memory Tracking

```javascript
// quzz.config.js
module.exports = {
  performance: {
    enabled: true,
    trackMemory: true,
    memoryThreshold: 50 * 1024 * 1024, // 50MB
  },
};
```

### Automatic Heap Snapshots

```javascript
// quzz.config.js
module.exports = {
  performance: {
    enableHeapSnapshots: true,
    heapSnapshotDir: "./heap-snapshots",
    memoryThreshold: 50 * 1024 * 1024,
  },
};
```

**How it works:**

1. Component renders with memory delta > 50MB
2. Warning logged: `High memory usage detected: +52.34MB`
3. Heap snapshot saved: `heap-ComponentName-2025-10-30.heapsnapshot`
4. Analyze in Chrome DevTools → Memory tab → Load snapshot

### Memory Leak Detection

```typescript
import { ContextManager } from "quzz/storage";

const manager = ContextManager.getInstance({
  enableMemoryMetrics: true,
});

// Get memory statistics
const memoryStats = manager.getMemoryStats();
if (memoryStats?.leakDetected) {
  console.warn("Memory leak detected:", memoryStats.growth);
}

// Get memory trend
const trend = manager.getMemoryTrend(10); // Last 10 snapshots
console.log("Memory trend:", trend);
```

## Nested Components

### Component Hierarchy Tracking

```tsx
import { withRSCTrace } from "quzz";

const ParentComponent = withRSCTrace(async function Parent() {
  return (
    <div>
      <ChildComponent />
    </div>
  );
});

const ChildComponent = withRSCTrace(async function Child() {
  return <div>Child content</div>;
});
```

**Output:**

```
ℹ️ [Parent] rendered in 45ms
  ℹ️ [Child] rendered in 12ms
```

### Map-Rendered Components

```tsx
const ProductList = withRSCTrace(async function ProductList() {
  const products = await fetchProducts();

  return (
    <div>
      {products.map(product => (
        <TracedProductCard key={product.id} product={product} />
      ))}
    </div>
  );
});

const TracedProductCard = withRSCTrace(ProductCard);
```

### Enable Hierarchy Visualization

```javascript
// quzz.config.js
module.exports = {
  autoLinkParent: true, // Default: true
  visualizer: {
    enabled: true,
    output: "./traces.json",
  },
};
```

## RSCBoundary Component

Use `<RSCBoundary>` for fine-grained tracing without modifying component structure.

### Basic Usage

```tsx
import { RSCBoundary } from "quzz";

export default async function Dashboard({ userId }: { userId: string }) {
  return (
    <RSCBoundary label="dashboard" tags={["critical"]}>
      <div className="dashboard">
        <UserProfile userId={userId} />
        <UserFeed userId={userId} />
      </div>
    </RSCBoundary>
  );
}
```

### Nested Boundaries

```tsx
export default async function Dashboard({ userId }: { userId: string }) {
  return (
    <RSCBoundary label="dashboard" trackTotalLatency={true}>
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

### When to Use RSCBoundary vs withRSCTrace

**Use RSCBoundary for:**

- Async components without default exports
- Fine-grained tracing of specific regions
- Components you can't modify
- Debugging specific sections without wrapper overhead

**Use withRSCTrace for:**

- Simpler setup
- Lower overhead
- Most general component tracing
- Components you control

## Performance Analysis

### Collect Traces

```javascript
// quzz.config.js
module.exports = {
  visualizer: {
    enabled: true,
    output: "./traces.json",
  },
};
```

### Analyze Traces

```tsx
import { TraceCollector } from "quzz/visualizer/trace-collector";

const collector = TraceCollector.getInstance();

// Save traces
await collector.save("./my-traces.json");

// Get session statistics
const session = collector.getSession();
console.log(`Total traces: ${session?.totalTraces}`);
console.log(`Total errors: ${session?.totalErrors}`);
console.log(`Slowest component: ${session?.slowestComponent?.name}`);

// Get detailed statistics
const stats = collector.getStatistics();
console.log(stats);
```

### Export Metrics

```tsx
import { exportMetrics } from "quzz";

const metricsJson = exportMetrics();
fs.writeFileSync("metrics.json", metricsJson);
```

## Plugin Integration

### Sentry Integration

```javascript
// quzz.config.js
import * as Sentry from "@sentry/nextjs";

const sentryPlugin = {
  onError: async (metadata, error) => {
    Sentry.captureException(error, {
      tags: {
        component: metadata.componentName,
        renderDuration: metadata.duration,
      },
      extra: {
        props: metadata.props,
        traceId: metadata.traceId,
      },
    });
  },
};

module.exports = {
  plugins: [sentryPlugin],
};
```

### Performance Budget Plugin

```javascript
const budgetPlugin = {
  onTraceEnd: async (metadata) => {
    if (metadata.duration > 1000) {
      await notifySlack(
        `🚨 ${metadata.componentName} exceeded 1s render time: ${metadata.duration}ms`
      );
    }
  },
};

module.exports = {
  plugins: [budgetPlugin],
};
```

### Custom Logging Plugin

```javascript
const customLoggerPlugin = {
  onTraceStart: async (metadata) => {
    console.log(`[START] ${metadata.componentName}`);
  },
  onTraceEnd: async (metadata) => {
    console.log(`[END] ${metadata.componentName}: ${metadata.duration}ms`);
  },
  onError: async (metadata, error) => {
    console.error(`[ERROR] ${metadata.componentName}:`, error);
  },
};

module.exports = {
  plugins: [customLoggerPlugin],
};
```

### Multiple Plugins

```javascript
module.exports = {
  plugins: [sentryPlugin, budgetPlugin, customLoggerPlugin],
};
```

## Custom Output Formats

### JSON Format

```javascript
module.exports = {
  outputFormat: "json",
};
```

**Output:**

```json
{"level":"info","component":"UserProfile","duration":142,"props":{"userId":"user_123"},"timestamp":"2025-10-30T10:30:45.123Z"}
```

### Custom Formatter

```javascript
module.exports = {
  formatter: (entry) => ({
    timestamp: entry.timestamp,
    component: entry.componentName,
    level: entry.level,
    message: entry.message,
    traceId: entry.metadata?.traceId,
    userId: entry.metadata?.props?.userId,
  }),
};
```

## Advanced Patterns

### Component Filtering

```javascript
// quzz.config.js
module.exports = {
  componentFilter: /^(Blog|Product|Work)/, // Only trace specific components
};
```

### Sensitive Data Redaction

```javascript
module.exports = {
  sensitiveKeys: ["apiKey", "secretToken", "creditCard", "ssn"],
};
```

### Context Snapshots

```typescript
import { configure, getContextSnapshots, getLatestSnapshot } from "quzz";

configure({
  debugContext: true,
  enableSnapshots: true,
  verboseMode: true,
});

// After component execution
const snapshots = getContextSnapshots();
snapshots.forEach((snapshot) => {
  console.log(`Snapshot ${snapshot.label}:`, {
    timestamp: new Date(snapshot.timestamp).toISOString(),
    stackDepth: snapshot.stackDepth,
    context: snapshot.store,
  });
});

const latest = getLatestSnapshot();
console.log("Latest context:", latest);
```

## Testing with quzz

### Disable in Tests

```javascript
// jest.setup.js or vitest.setup.js
import { configure } from "quzz";

configure({
  logLevel: "silent",
  forceEnable: false,
});
```

### Enable for Specific Tests

```typescript
import { configure, resetConfig } from "quzz";

beforeEach(() => {
  configure({ logLevel: "debug" });
});

afterEach(() => {
  resetConfig();
});
```

## CI/CD Integration

### Enable in CI

```bash
# .github/workflows/test.yml
QUZZ_ENABLED=true QUZZ_OUTPUT_FORMAT=json npm test
```

### Disable in Production Builds

```bash
# Dockerfile or build script
QUZZ_DISABLE=true npm run build
```

### Conditional Enabling

```typescript
// app/layout.tsx
import { configure } from "quzz";

if (process.env.ENABLE_DEBUG === "true") {
  configure({
    forceEnable: true,
    logLevel: "error",
  });
}
```

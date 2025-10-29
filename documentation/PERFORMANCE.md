# Performance Guide

Optimization tips and best practices for using quzz efficiently.

## Table of Contents

- [Performance Impact](#performance-impact)
- [Optimization Strategies](#optimization-strategies)
- [Component Filtering](#component-filtering)
- [Prop Logging](#prop-logging)
- [Memory Tracking](#memory-tracking)
- [Heap Snapshots](#heap-snapshots)
- [Output Formats](#output-formats)
- [Metrics Management](#metrics-management)
- [Production Deployment](#production-deployment)

## Performance Impact

### Development (Default Settings)

- HOC wrapper overhead: ~50μs per component
- Prop sanitization: ~200μs (10 props, depth 3)
- Performance tracking: ~10μs per render
- Memory tracking: ~5μs per render
- Parent linking (v0.5.6+): ~10-20μs per trace

### Production

- **Complete no-op**: 0μs (when disabled)
- No code execution when `NODE_ENV=production`
- Zero bundle size impact (tree-shaken when unused)

## Optimization Strategies

### 1. Use Component Filtering

Don't trace every component. Focus on critical paths:

```javascript
// quzz.config.js
module.exports = {
  componentFilter: /^(Critical|Important|Slow)/, // Only these components
};
```

**Impact:** Reduces overhead by 80-90% if you filter out most components.

### 2. Adjust Log Levels

Higher log levels process less data:

```javascript
module.exports = {
  logLevel: "warn", // Only warnings and errors
};
```

**Log Levels (least to most verbose):**
- `silent` - No logs (0μs overhead)
- `error` - Errors only
- `warn` - Warnings and errors
- `info` - Info, warnings, and errors (default)
- `debug` - Everything (highest overhead)

### 3. Use Compact Format

```javascript
module.exports = {
  outputFormat: "compact", // Less processing than pretty
};
```

**Format Overhead:**
- `compact`: ~50μs per log
- `pretty`: ~100μs per log
- `json`: ~75μs per log

### 4. Disable Expensive Features

```javascript
module.exports = {
  performance: {
    trackMemory: false, // Disable memory tracking
  },
  props: {
    awaitProps: false, // Never await props
  },
  enableHyperlinks: false, // Disable hyperlinks
};
```

## Component Filtering

### Basic Filtering

Match component names with regex:

```javascript
module.exports = {
  componentFilter: /^(Blog|Product|User)/, // Only these prefixes
};
```

### Advanced Filtering

Complex patterns:

```javascript
module.exports = {
  // Match multiple patterns
  componentFilter: /^(Blog|Product)|Page$/, // Starts with Blog/Product OR ends with Page
};
```

### Component-Level Disabling

Disable tracing for specific components:

```tsx
const FastComponent = withRSCTrace(MyComponent, {
  logLevel: "silent", // No logs
});
```

Or skip entirely:

```tsx
// Don't wrap at all if not needed
export default MyComponent; // No wrapping
```

## Prop Logging

### Disable Prop Logging

For components with large props:

```tsx
const HeavyComponent = withRSCTrace(MyComponent, {
  disable: {
    props: true, // Skip prop logging
  },
});
```

### Adjust Sanitization Depth

Shallow sanitization is faster:

```javascript
module.exports = {
  props: {
    maxArrayItems: 5, // Fewer items
    maxObjectProps: 10, // Fewer properties
  },
  maxPropDepth: 1, // Shallow depth
  maxStringLength: 50, // Shorter strings
};
```

**Sanitization Performance:**
- Depth 1: ~50μs
- Depth 2: ~150μs
- Depth 3: ~200μs (default)
- Depth 4+: ~300μs+

### Disable awaitProps

Never enable globally:

```javascript
module.exports = {
  props: {
    awaitProps: false, // Never await (default)
  },
};
```

Only enable for specific debugging:

```tsx
// Temporary debugging only
const DebugComponent = withRSCTrace(MyComponent, {
  props: {
    awaitProps: true,
    awaitTimeout: 1000, // Short timeout
  },
});
```

## Memory Tracking

### Disable Memory Tracking

If you don't need it:

```javascript
module.exports = {
  performance: {
    trackMemory: false,
  },
};
```

**Savings:** ~5μs per render

### Adjust Memory Threshold

Higher threshold = fewer warnings:

```javascript
module.exports = {
  performance: {
    memoryThreshold: 100 * 1024 * 1024, // 100MB (higher = fewer logs)
  },
};
```

### Clear Memory Metrics

Prevent accumulation:

```typescript
import { clearMetrics } from "quzz";

setInterval(() => {
  clearMetrics();
}, 3600000); // Clear every hour
```

## Heap Snapshots

### Only Enable When Debugging

Heap snapshots are expensive:

```javascript
module.exports = {
  performance: {
    enableHeapSnapshots: false, // Disabled by default
  },
};
```

**Overhead when enabled:**
- Snapshot capture: ~500ms - 2s
- Disk I/O: ~100-500MB per snapshot

### Use Sparingly

Only enable for specific debugging sessions:

```bash
# Enable temporarily
ENABLE_HEAP_SNAPSHOTS=true npm run dev
```

## Output Formats

### Compact Format (Fastest)

```javascript
module.exports = {
  outputFormat: "compact",
};
```

Single-line logs with minimal processing.

### JSON Format (For Parsing)

```javascript
module.exports = {
  outputFormat: "json",
};
```

Good for log aggregation systems.

### Pretty Format (Most Readable)

```javascript
module.exports = {
  outputFormat: "pretty", // Default
};
```

Most overhead but easiest to read.

## Metrics Management

### Clear Metrics Periodically

Prevent memory accumulation:

```typescript
import { clearMetrics } from "quzz";

// In a background job
setInterval(() => {
  clearMetrics();
}, 3600000); // Every hour
```

### Disable Metrics Collection

If you don't need performance metrics:

```javascript
module.exports = {
  performance: {
    enabled: false, // No metrics collection
  },
};
```

### Export Before Clearing

Save metrics before clearing:

```typescript
import { exportMetrics, clearMetrics } from "quzz";
import fs from "fs";

setInterval(() => {
  const metrics = exportMetrics();
  fs.writeFileSync(`metrics-${Date.now()}.json`, metrics);
  clearMetrics();
}, 3600000);
```

## Production Deployment

### Ensure Automatic Disabling

quzz checks `NODE_ENV`:

```bash
NODE_ENV=production npm run build
```

### Explicit Disabling

Force disable:

```bash
QUZZ_DISABLE=true npm run build
```

### Never Force Enable

Don't do this in production:

```javascript
// ❌ BAD - Never do this
module.exports = {
  forceEnable: true,
};
```

### Verify No Overhead

Check that quzz is disabled:

```typescript
import { getConfig } from "quzz";

console.log("quzz enabled:", getConfig().enabled); // Should be false
```

## Benchmarking

### Measure Overhead

```typescript
import { withRSCTrace } from "quzz";

// Without quzz
console.time("without-quzz");
await MyComponent(props);
console.timeEnd("without-quzz");

// With quzz
const TracedComponent = withRSCTrace(MyComponent);
console.time("with-quzz");
await TracedComponent(props);
console.timeEnd("with-quzz");
```

### Typical Results

For a simple component (10 props, depth 2):

```
without-quzz: 1.234ms
with-quzz: 1.584ms
overhead: ~0.35ms (28%)
```

For production (quzz disabled):

```
without-quzz: 1.234ms
with-quzz: 1.234ms
overhead: 0ms (0%)
```

## Best Practices

### 1. Filter Aggressively

Only trace what you need:

```javascript
module.exports = {
  componentFilter: /^Critical/, // Very specific
  logLevel: "warn", // Only important logs
};
```

### 2. Disable Expensive Features

```javascript
module.exports = {
  performance: {
    trackMemory: false,
  },
  props: {
    awaitProps: false,
  },
  enableHyperlinks: false,
};
```

### 3. Use Compact Format

```javascript
module.exports = {
  outputFormat: "compact",
};
```

### 4. Clear Metrics Regularly

```typescript
setInterval(clearMetrics, 3600000);
```

### 5. Component-Level Optimization

```tsx
// Disable for fast components
const FastComponent = withRSCTrace(MyComponent, {
  logLevel: "silent",
});

// Enable only for slow components
const SlowComponent = withRSCTrace(MyComponent, {
  performance: { warnThreshold: 500 },
});
```

### 6. Disable in Tests

```javascript
// jest.setup.js
configure({ logLevel: "silent" });
```

### 7. Monitor Production Builds

Ensure quzz is disabled:

```typescript
if (process.env.NODE_ENV === "production" && getConfig().enabled) {
  console.error("⚠️ quzz is enabled in production!");
}
```

## Performance Checklist

Before deploying to production:

- [ ] `NODE_ENV=production` is set
- [ ] `forceEnable: false` (or unset)
- [ ] Component filtering is used (if applicable)
- [ ] Memory tracking is disabled (if not needed)
- [ ] Heap snapshots are disabled
- [ ] Metrics are cleared periodically (if collected)
- [ ] Test build to verify zero overhead

## Troubleshooting Performance Issues

### Issue: Slow Development Server

**Solutions:**
1. Use component filtering
2. Disable memory tracking
3. Use compact format
4. Increase log level to `warn`

### Issue: High Memory Usage

**Solutions:**
1. Clear metrics periodically
2. Disable memory tracking
3. Use component filtering
4. Disable visualizer

### Issue: Slow Component Renders

**Solutions:**
1. Disable prop logging
2. Reduce sanitization depth
3. Disable `awaitProps`
4. Use component filtering

## Measuring Real Impact

### Add Timing Markers

```typescript
import { withRSCTrace } from "quzz";

console.time("component-render");
const TracedComponent = withRSCTrace(MyComponent);
await TracedComponent(props);
console.timeEnd("component-render");
```

### Profile with Node.js

```bash
node --prof npm run dev
```

### Use React DevTools Profiler

Profile with and without quzz to measure impact.

## Summary

- **Development overhead:** Minimal (~200-300μs per component with default settings)
- **Production overhead:** Zero (automatically disabled)
- **Optimization:** Use component filtering and disable expensive features
- **Best practice:** Only trace what you need to debug

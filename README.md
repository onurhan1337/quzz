# quzz

Debugging tool for React Server Components in Next.js. Wrap your components to get visibility into render times, props, errors, and execution flow.

[![npm version](https://badge.fury.io/js/quzz.svg)](https://www.npmjs.com/package/quzz)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why quzz?

React Server Components don't work with traditional debugging tools like React DevTools. Console logs get scattered in server output, and errors lose context when crossing the server-client boundary.

quzz provides a simple HOC wrapper that gives you detailed logging during development and automatically disables itself in production.

## Features

- Zero configuration required
- Simple HOC (`withRSCTrace`) wrapper for components
- Automatic performance tracking with configurable thresholds
- Error tracking with full context
- Props logging with automatic sensitive data redaction
- Component hierarchy visualization
- Optional: `<RSCBoundary>` component for fine-grained tracing
- Optional: Built-in trace visualizer CLI (`quzz-viz`)
- TypeScript support
- Plugin system for custom integrations
- Zero production overhead (automatically disabled in production)
- Production-safe by default

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

Set global options in your root layout:

```tsx
// app/layout.tsx
import { configure } from "quzz";

if (process.env.NODE_ENV === "development") {
  configure({
    logLevel: "info",
    outputFormat: "pretty",
    performance: {
      enabled: true,
      warnThreshold: 500, // Warn if render takes > 500ms
    },
  });
}
```

## Examples

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

## Advanced Features

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

### Trace Visualization (Optional)

Visualize component traces with the built-in CLI tool:

```tsx
// Enable trace collection
configure({
  visualizer: {
    enabled: true,
    output: './traces.json'
  }
});
```

Then run your app and visualize:

```bash
npm run dev
npx quzz-viz ./traces.json
# Open http://localhost:3456
```

The visualizer provides timeline views, flamegraphs, statistics, and filtering capabilities.

## Production Safety

quzz is designed to be production-safe by default:

- **Automatically disabled in production**: quzz checks `NODE_ENV` and disables all tracing in production builds
- **Environment variable override**: Set `QUZZ_DISABLE=true` to disable quzz even in development
- **Explicit production enabling**: To enable in production (not recommended), use `forceEnable: true`:

```typescript
// Only use this for debugging production issues temporarily
configure({
  forceEnable: true, // Required to run in production
  logLevel: 'error' // Only log errors to minimize overhead
})
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
  logProps: true, // Log sanitized props

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

## Architecture

quzz uses a singleton pattern with four core subsystems:

1. **ConfigManager**: Global configuration with validation
2. **TraceContext**: Request-isolated component hierarchy tracking (via AsyncLocalStorage)
3. **PerformanceMonitor**: Metrics aggregation with automatic memory management
4. **Logger**: Multi-level, multi-format logging with transport support

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

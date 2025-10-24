# quzz

**Production-grade debugging and performance monitoring for React Server Components in Next.js**

Zero-config by default, infinitely configurable when you need it. Built for modern Next.js development.

[![npm version](https://badge.fury.io/js/quzz.svg)](https://www.npmjs.com/package/quzz)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why quzz?

Debugging React Server Components is hard. Traditional React DevTools don't work with RSCs. Console logs get lost in server output. Error boundaries lose context when errors cross the server-client boundary.

**quzz** solves these problems with a lightweight, zero-config HOC that provides rich debugging information during development and completely disappears in production.

## Features

### Core DX Features
- ⚡ **Zero Production Overhead**: Completely disabled in production (no runtime cost)
- 🚀 **Zero Config**: Works out of the box with sensible defaults
- 🔐 **Request Isolation**: Uses AsyncLocalStorage for proper concurrent request handling
- 📘 **TypeScript First**: Full type safety with comprehensive type exports
- 🧹 **Automatic Memory Management**: Self-cleaning to prevent memory leaks

### Debugging & Monitoring
- 📊 **Smart Error Tracking**: Enhanced error serialization that survives the RSC boundary
- 🎨 **Beautiful Output**: Colorized terminal output with customizable formatters
- 🔒 **Secure by Default**: Automatic sanitization of 22+ sensitive prop patterns
- 📈 **Performance Insights**: Track render times with automatic threshold warnings
- 🌳 **Component Hierarchy**: Track nested RSC relationships and render trees

### Enterprise Ready
- 🔌 **Plugin System**: Extensible architecture for custom integrations
- 🚚 **Custom Transports**: Send telemetry to any logging service
- 💾 **Memory Safe**: Automatic cleanup of stale metrics and traces
- 🎯 **Selective Tracing**: Regex-based component filtering

## Installation

```bash
npm install quzz
```

## Quick Start

### Basic Usage (Zero Config)

```tsx
import { withRSCTrace } from 'quzz'

async function UserProfile({ userId }: { userId: string }) {
  const user = await fetchUser(userId)
  return <div>{user.name}</div>
}

export default withRSCTrace(UserProfile)
```

That's it! In development, you'll automatically get:
- Component render timing
- Error tracking with enhanced stack traces
- Prop logging (with sensitive data redacted)

### Global Configuration

Configure once in your root layout:

```tsx
// app/layout.tsx
import { configure } from 'quzz'

if (process.env.NODE_ENV === 'development') {
  configure({
    logLevel: 'info',
    performance: {
      enabled: true,
      warnThreshold: 500, // Warn on renders > 500ms
    }
  })
}
```

## Common Use Cases

### 1. Debug Slow Components

```tsx
import { withRSCTrace } from 'quzz'

const SlowComponent = withRSCTrace(
  async function DataTable({ filters }) {
    const data = await complexQuery(filters) // This is slow
    return <Table data={data} />
  },
  {
    componentName: 'DataTable',
    performance: { warnThreshold: 200 } // Warn if > 200ms
  }
)
```

Output:
```
⚠️  [DataTable] Slow render detected: 523.45ms
   Props: { filters: { status: "active", limit: 100 } }
   Threshold: 200ms
```

### 2. Track Component Errors

```tsx
const RiskyComponent = withRSCTrace(
  async function PaymentProcessor({ orderId }) {
    const payment = await processPayment(orderId) // Might fail
    return <PaymentStatus {...payment} />
  },
  {
    componentName: 'PaymentProcessor',
    logLevel: 'error' // Only log errors
  }
)
```

Output on error:
```
❌ [PaymentProcessor] Rendering failed: Payment processing failed
   Props: { orderId: "order_123" }
   Stack:
     at processPayment (app/payments/processor.ts:45:11)
     at PaymentProcessor (app/components/Payment.tsx:12:20)
   Duration before error: 234.56ms
```

### 3. Monitor Performance Across All Components

```tsx
// In your monitoring dashboard or API route
import { getPerformanceSummary, exportMetrics } from 'quzz'

export async function GET() {
  const summary = getPerformanceSummary()

  // Send to monitoring service
  await sendToDatadog({
    totalRenders: summary.totalRenders,
    avgDuration: summary.avgDuration,
    errorRate: (summary.totalErrors / summary.totalRenders) * 100
  })

  return Response.json(summary)
}
```

### 4. Production Debugging (Use with Caution)

```tsx
const CriticalComponent = withRSCTrace(Component, {
  forceEnable: process.env.DEBUG_USER === request.headers.get('x-user-id'),
  logLevel: 'error',
  performance: { enabled: false } // Don't impact performance
})
```

## Advanced Configuration

### Component-Level Options

```typescript
withRSCTrace(Component, {
  // Naming
  componentName: 'CustomName',     // Override display name
  tags: ['auth', 'critical'],      // Add tags for filtering

  // Logging
  logLevel: 'debug',               // Override global level
  logProps: true,                  // Log sanitized props

  // Performance
  performance: {
    enabled: true,
    warnThreshold: 1000,           // ms
    trackMemory: true              // Node.js only
  },

  // Features
  disable: {
    props: false,                  // Skip prop logging
    timing: false,                 // Skip performance tracking
    errors: false                  // Skip error logging
  }
})
```

### Plugin System

Create custom plugins for integrations:

```typescript
import { configure } from 'quzz'

// Sentry Integration
const sentryPlugin = {
  onError: async (metadata, error) => {
    Sentry.captureException(error, {
      tags: {
        component: metadata.componentName,
        renderDuration: metadata.duration,
      },
      extra: { props: metadata.props }
    })
  }
}

// Performance Budget Plugin
const budgetPlugin = {
  onTraceEnd: async (metadata) => {
    if (metadata.duration > 1000) {
      await notifySlack(`🚨 ${metadata.componentName} exceeded 1s render time`)
    }
  }
}

configure({
  plugins: [sentryPlugin, budgetPlugin]
})
```

### Custom Output Formats

```typescript
import { configure } from 'quzz'

configure({
  formatter: (entry) => ({
    timestamp: entry.timestamp,
    component: entry.componentName,
    level: entry.level,
    message: entry.message,
    // Custom fields
    traceId: entry.metadata?.traceId,
    userId: entry.metadata?.props?.userId
  })
})
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
configure({ forceEnable: true })
```

#### 2. "My sensitive data is being logged"

**Solution**: Add custom sensitive keys:
```tsx
configure({
  sensitiveKeys: ['creditCard', 'ssn', 'apiSecret']
})
```

Default sensitive keys already include: password, token, secret, key, api_key, apikey, auth, credential, private, ssn, pin, passcode, hash, salt, signature, bearer, oauth, jwt, session, cookie, csrf, code

#### 3. "Performance metrics are accumulating memory"

**Solution**: quzz automatically cleans up old metrics, but you can tune it:
```tsx
import { clearMetrics } from 'quzz'

// In a cleanup job or interval
setInterval(() => {
  clearMetrics()
}, 3600000) // Clear hourly
```

#### 4. "Errors lose context when crossing to client components"

**Solution**: quzz automatically serializes errors for the RSC boundary. For custom error types:
```tsx
class CustomError extends Error {
  toJSON() {
    return {
      message: this.message,
      customField: this.customField
    }
  }
}
```

#### 5. "Logs are too verbose"

**Solution**: Use component filtering:
```tsx
configure({
  componentFilter: /^(Header|Footer|Nav)/, // Only trace these
  logLevel: 'warn' // Only warnings and errors
})
```

#### 6. "How do I test with quzz enabled?"

**Solution**: In your test setup:
```tsx
// jest.setup.js or vitest.setup.js
import { configure } from 'quzz'

configure({
  logLevel: 'silent', // Disable logs in tests
  forceEnable: false
})
```

### Performance Tips

1. **Use Component Filtering**: Don't trace every component
   ```tsx
   configure({
     componentFilter: /^Critical/ // Only components starting with "Critical"
   })
   ```

2. **Disable Prop Logging for Large Objects**:
   ```tsx
   withRSCTrace(Component, {
     logProps: false // Skip if props are huge
   })
   ```

3. **Adjust Sanitization Depth**:
   ```tsx
   configure({
     maxPropDepth: 1, // Shallow sanitization for performance
     maxStringLength: 100 // Shorter strings
   })
   ```

4. **Use Throttling for High-Frequency Components**:
   ```tsx
   configure({
     throttleMs: 1000 // Max 1 log per second per component
   })
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

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

## License

MIT © 2024 quzz contributors

## Support

- 📧 Email: support@quzz.dev
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/quzz/issues)
- 💬 Discord: [Join our community](https://discord.gg/quzz)
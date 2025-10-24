# quzz Examples

This directory contains practical examples demonstrating different ways to use quzz for debugging React Server Components.

## Quick Start Examples

### 1. **basic-usage.ts** - HOC Approach (Recommended)
The primary way to use quzz: wrapping components with the `withRSCTrace` HOC.

- Simple component wrapping
- Zero configuration setup
- Best for most use cases
- Minimal overhead

**Use this when**: You want the simplest, most straightforward debugging setup.

### 2. **boundary-usage.ts** - RSCBoundary Component (Alternative)
Using `<RSCBoundary>` for fine-grained tracing without HOCs.

- Declarative approach with JSX
- Fine-grained control over trace regions
- Nested boundaries for complex hierarchies
- Total latency tracking (compute vs wait time)
- Error boundaries integration
- Dynamic boundaries in loops

**Use this when**:
- You have async components without default exports
- You need to trace specific sections within a component
- You want more granular control over what gets traced
- HOC wrapping is difficult or impossible

## Advanced Examples

### 3. **advanced-config.ts** - Configuration Options
Global and component-level configuration examples.

- Log levels and output formats
- Performance thresholds
- Sensitive data redaction
- Component filtering
- Environment-based config

### 4. **performance-monitoring.ts** - Performance Tracking
Monitoring and analyzing component performance.

- Performance metrics collection
- Slow component warnings
- Memory tracking
- Aggregated statistics
- Performance budgets

### 5. **plugin-examples.ts** - Plugin System
Extending quzz with custom integrations.

- Sentry integration
- Custom logging transports
- Performance budget alerts
- Analytics integration
- Lifecycle hooks

### 6. **visualization.ts** - Trace Visualization
Using the built-in `quzz-viz` CLI tool.

- Enabling trace collection
- Exporting trace data
- Running the visualizer
- Performance analysis workflow
- Filtering traces

## HOC vs RSCBoundary Comparison

| Feature | `withRSCTrace` (HOC) | `<RSCBoundary>` |
|---------|---------------------|-----------------|
| **Setup** | Wrap component once | Wrap JSX regions |
| **Overhead** | Minimal | Slightly higher |
| **Granularity** | Per component | Per region/section |
| **Async components** | Requires export | Works inline |
| **TypeScript** | Full inference | Full inference |
| **Nesting** | Limited | Flexible |
| **Total latency** | ✅ | ✅ |
| **Best for** | Most cases | Fine-grained control |

## Usage Patterns

### Pattern 1: Start with HOC
```typescript
// 1. Start simple with HOC
export default withRSCTrace(MyComponent)

// 2. Add configuration as needed
export default withRSCTrace(MyComponent, {
  componentName: 'MyComponent',
  performance: { warnThreshold: 200 }
})
```

### Pattern 2: Use RSCBoundary for granularity
```typescript
// When you need to trace specific parts
export default async function Page() {
  return (
    <div>
      <Header /> {/* Not traced */}

      <RSCBoundary label="critical-section">
        <CriticalContent /> {/* Traced */}
      </RSCBoundary>

      <Footer /> {/* Not traced */}
    </div>
  )
}
```

### Pattern 3: Combine both approaches
```typescript
// Use HOC for the component
const TracedComponent = withRSCTrace(BaseComponent)

// Use RSCBoundary for specific sections
export default function Page() {
  return (
    <RSCBoundary label="page">
      <TracedComponent />
    </RSCBoundary>
  )
}
```

## Quick Reference

### Enable quzz in development
```typescript
// app/layout.tsx
import { configure } from "quzz";

if (process.env.NODE_ENV === "development") {
  configure({
    logLevel: "info",
    performance: { enabled: true },
  });
}
```

### Disable in production (automatic)
quzz is automatically disabled in production unless you explicitly enable it:
```typescript
configure({ forceEnable: true }) // Not recommended!
```

### Disable in development
```bash
QUZZ_DISABLE=true npm run dev
```

## Need Help?

- 📚 [Main Documentation](../README.md)
- 🐛 [Report Issues](https://github.com/onurhan1337/quzz/issues)
- 💬 [Discussions](https://github.com/onurhan1337/quzz/discussions)

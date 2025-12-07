# quzz Documentation & Testing Site

This is a Next.js application that demonstrates and tests the quzz package for debugging React Server Components.

## Getting Started

1. First, build the parent quzz package:

   ```bash
   cd ..
   npm run build
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Run the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## What to Look For

### In Your Browser

- **Slow Component Demo**: Shows components that take 1-2 seconds to render
- **Error Handling Demo**: Randomly throws errors (30% failure rate)
- **Nested Components**: Demonstrates parent-child tracing
- **Performance Metrics**: Real-time dashboard showing render times and errors

### In Your Terminal

While the site is running, check your terminal for:

- 📊 Component render times
- 🔍 Sanitized prop values
- ⚠️ Performance warnings (components slower than threshold)
- ❌ Enhanced error stack traces
- 🌳 Component hierarchy and relationships
- 📈 Performance aggregation

## Testing Features

### Basic Tracing

Every component wrapped with `withRSCTrace` automatically logs:

- Start and end of rendering
- Total render duration
- Props (with sensitive data redacted)

### Performance Monitoring

Components can set performance thresholds:

```tsx
withRSCTrace(Component, {
  performance: {
    enabled: true,
    warnThreshold: 500, // Warn if > 500ms
  },
});
```

### Error Tracking

Errors are automatically caught and logged with:

- Full stack trace
- Component props at time of error
- Render duration before error
- Error serialization for RSC boundary

### Nested Tracing

With context tracking enabled, you can see parent-child relationships:

```tsx
withRSCTrace(Component, {
  contextTracking: true,
});
```

## Configuration

The global quzz configuration is set in `app/layout.tsx`:

```tsx
configure({
  logLevel: "info",
  outputFormat: "pretty",
  performance: {
    enabled: true,
    warnThreshold: 500,
    trackMemory: true,
  },
  logProps: true,
  contextTracking: true,
});
```

Notes:

- The config file (`quzz.config.ts` / `.js`) loads asynchronously; defaults + env apply first, then the file merges when ready.
- In production (`NODE_ENV=production`), quzz is off by default. Keep `QUZZ_ENABLED=false` or `QUZZ_DISABLE=true`; only force it on if you really need it with `QUZZ_FORCE_ENABLE=true` (not recommended).
- If you also call `configure()` in code, programmatic settings win over the file-based config.
- `resetConfig()` restores defaults (+env, optional file config). `reloadConfig()` re-reads the config file and resets using it.

## Components

- **SlowComponent**: Simulates slow database queries (1-2s)
- **ErrorComponent**: Simulates payment processing with 30% failure rate
- **NestedComponents**: Shows three levels of component hierarchy
- **PerformanceDemo**: Client component that polls and displays metrics

## Tips

1. **Refresh the page** to trigger new renders and see fresh logs
2. **Check the terminal** where you ran `npm run dev` for all quzz output
3. **Try the error component multiple times** to see both success and failure cases
4. **Watch the performance dashboard** update in real-time as components render

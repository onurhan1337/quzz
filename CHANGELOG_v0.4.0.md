# Changelog - v0.4.0

## 🎉 Next.js 15+ Async Props Support

### New Features

#### 1. Promise Type Hints (Default, Safe)
- Automatically detects `Promise` props and displays type hints without awaiting
- No side effects, no performance impact
- Provides meaningful debugging information for Next.js 15's async `params` and `searchParams`

**Example Output:**
```
Props: { params: [Promise<PageProps>] }
```

#### 2. Optional Await Props Configuration
- New `props.awaitProps` configuration option (opt-in, disabled by default)
- Resolves Promise values before logging for complete visibility
- Includes timeout protection (default: 5000ms)
- Graceful error handling for failed/rejected Promises

**Configuration:**
```tsx
configure({
  props: {
    awaitProps: false,        // Default: false (safe mode)
    awaitTimeout: 5000,       // Timeout in milliseconds
    showPromiseTypes: true,   // Show type hints (default: true)
  },
});
```

### API Changes

#### New Configuration Interface: `PropsConfig`

```typescript
interface PropsConfig {
  /**
   * Await Promise props before logging (Next.js 15+ async props support)
   * WARNING: May trigger side effects (DB/network calls) or cause hangs
   * @default false
   */
  awaitProps?: boolean;

  /**
   * Timeout for awaiting Promise props in milliseconds
   * @default 5000
   */
  awaitTimeout?: number;

  /**
   * Show type hints for Promise props without awaiting them
   * @default true
   */
  showPromiseTypes?: boolean;
}
```

#### Updated `QuzzConfig`

```typescript
interface QuzzConfig {
  // ... existing fields

  /**
   * Props logging configuration
   */
  props?: PropsConfig;

  /**
   * @deprecated Use props configuration instead
   */
  logProps?: boolean;
}
```

### Implementation Details

#### New Utility Functions

1. **`isPromise(value)`** - Detects Promise instances
2. **`inferPromiseType(promise)`** - Attempts to extract type hints from Promises
3. **`awaitWithTimeout(promise, timeout)`** - Awaits Promise with timeout protection
4. **`sanitizePropsAsync(props, config)`** - Async version of sanitizeProps that resolves Promises

#### Error Handling

- **Timeout**: `[Promise: Promise timeout after Xms]`
- **Rejection**: `[Promise: Error - error message]`
- **With Type Hint**: `[Promise<PageProps>: Error - error message]`

### Testing

All features tested with comprehensive test suite:
- ✅ Promise detection with type hints
- ✅ Async props awaiting
- ✅ Timeout handling
- ✅ Error/rejection handling
- ✅ Mixed props (primitives, objects, Promises)
- ✅ Configuration integration
- ✅ Type inference

See `examples/test-promise-handling.ts` for complete test coverage.

### Documentation

Updated [README.md](README.md) with:
- Comprehensive Next.js 15+ usage examples
- Configuration options and best practices
- Warning about side effects and performance implications
- Troubleshooting guide for common issues
- Component-level override examples

### Breaking Changes

None - all features are opt-in and backward compatible.

### Deprecations

- `logProps` is deprecated in favor of `props` configuration
- Old usage still works but will show deprecation notice in future versions

### Migration Guide

#### From v0.3.0 to v0.4.0

**Before:**
```tsx
configure({
  logProps: true,
});
```

**After (recommended):**
```tsx
configure({
  props: {
    showPromiseTypes: true,  // Default behavior
    awaitProps: false,       // Explicit opt-in required
  },
});
```

**For Next.js 15 async props debugging:**
```tsx
// Component-level override for specific debugging
withRSCTrace(ProductPage, {
  props: {
    awaitProps: true,      // Only when needed
    awaitTimeout: 3000,    // Adjust timeout as needed
  },
});
```

### Performance Impact

- **Default mode (showPromiseTypes)**: ~0μs overhead (same as v0.3.0)
- **awaitProps mode**: Depends on Promise resolution time + timeout
  - Minimum: actual Promise resolution time
  - Maximum: `awaitTimeout` value (default: 5000ms)

### Security Considerations

- Sensitive key redaction still applies to resolved Promise values
- No additional security concerns introduced
- Awaiting Promises may expose timing attacks (development only)

### Future Improvements

Potential enhancements for future versions:
- Advanced type inference using TypeScript compiler API
- Configurable type hint formatters
- Per-prop await configuration
- Promise resolution caching

---

## 🚀 Additional Features

### 1. Compact Output Format Mode

**Problem:** Default logs are verbose, leading to clutter in high-frequency renders.

**Solution:** Enhanced compact output format with colors and memory display.

**Example Output:**
```
BlogDetailPage: 4.79ms (620MB) ✓
ProductPage: 124.32ms (45MB) ⚠
ErrorComponent: 532.11ms ✗ Database connection failed
```

**Configuration:**
```tsx
configure({
  outputFormat: "compact",
  performance: {
    enabled: true,
    trackMemory: true,
  },
});
```

### 2. Environment-Based Configuration

**Problem:** Config relies too much on code, limiting flexibility in different environments.

**Solution:** Comprehensive environment variable support.

**Supported Variables:**
- `QUZZ_ENABLED=true|false|1|0` - Enable/disable tracing
- `QUZZ_LOG_LEVEL=silent|error|warn|info|debug|trace` - Set log level
- `QUZZ_OUTPUT_FORMAT=pretty|json|compact` - Set output format
- `QUZZ_FORCE_ENABLE=true|false|1|0` - Force enable in production (not recommended)
- `QUZZ_DISABLE_HYPERLINKS=true` - Disable terminal hyperlinks
- `QUZZ_DISABLE=true` - Completely disable quzz

**Example Usage:**
```bash
# Development with debug logging
QUZZ_LOG_LEVEL=debug QUZZ_OUTPUT_FORMAT=compact npm run dev

# CI/CD with compact JSON output
QUZZ_ENABLED=true QUZZ_OUTPUT_FORMAT=json npm test

# Production debugging (use with caution)
QUZZ_FORCE_ENABLE=true QUZZ_LOG_LEVEL=error npm start
```

**Priority Order:**
1. `QUZZ_DISABLE` (highest - overrides everything)
2. `QUZZ_ENABLED` (explicit enable)
3. `configure()` settings
4. Environment detection (`NODE_ENV`)

### 3. Terminal Hyperlinks for Trace IDs

**Problem:** Trace IDs are plain text, missing interactivity for quick navigation.

**Solution:** Clickable trace IDs using OSC 8 escape sequences.

**Features:**
- Automatic hyperlink generation for trace IDs and parent traces
- Custom URL scheme: `quzz://trace/{traceId}`
- Graceful fallback for unsupported terminals
- Configurable enable/disable

**Supported Terminals:**
- iTerm2 (macOS)
- VS Code integrated terminal
- GNOME Terminal
- Hyper
- Most xterm-compatible terminals

**Configuration:**
```tsx
configure({
  enableHyperlinks: true, // Default: true
});

// Or disable via environment
// QUZZ_DISABLE_HYPERLINKS=true
```

**Example Output:**
```
Trace: trace_abc123 (clickable)
↳ Parent: trace_xyz789 (clickable)
```

### 4. Perf Mode with Heap Snapshots

**Problem:** Advanced memory debugging requires external tools, not integrated into quzz.

**Solution:** Automatic heap snapshot generation on high memory usage.

**Features:**
- Triggers v8.writeHeapSnapshot() when memory threshold exceeded
- Dev-only safety (disabled in production)
- Configurable directory and thresholds
- Automatic directory creation

**Configuration:**
```tsx
configure({
  performance: {
    enabled: true,
    trackMemory: true,
    memoryThreshold: 50 * 1024 * 1024, // 50MB
    enableHeapSnapshots: true,
    heapSnapshotDir: "./heap-snapshots",
  },
});
```

**How It Works:**
1. Component renders with high memory usage (>50MB delta)
2. Warning logged: `High memory usage detected: +52.34MB`
3. Heap snapshot automatically saved: `heap-ComponentName-2025-10-27T12-34-56.heapsnapshot`
4. Log message: `Heap snapshot saved to: ./heap-snapshots/heap-ComponentName-...`

**Analyzing Snapshots:**
1. Open Chrome DevTools
2. Go to Memory tab
3. Click "Load" button
4. Select the `.heapsnapshot` file
5. Analyze memory leaks, retainers, and allocation patterns

**Safety Features:**
- ✅ Only enabled in development (`NODE_ENV !== 'production'`)
- ✅ Requires explicit `enableHeapSnapshots: true`
- ✅ Warns about disk usage and overhead
- ✅ Creates directory automatically
- ✅ Filename includes timestamp for easy identification

### 5. File-Based Configuration (Next.js Convention)

**Problem:** Calling `configure()` in code is not ideal for project-wide settings.

**Solution:** Automatic config file loading following Next.js conventions.

**Supported Files (in priority order):**
- `quzz.config.mjs` (ESM - preferred)
- `quzz.config.js` (CommonJS)
- `quzz.config.cjs` (CommonJS explicit)

**Example quzz.config.mjs:**
```typescript
/** @type {import('quzz').QuzzConfig} */
export default {
  logLevel: "info",
  outputFormat: "compact",

  performance: {
    enabled: true,
    trackMemory: true,
    memoryThreshold: 50 * 1024 * 1024,
  },

  props: {
    showPromiseTypes: true,
    awaitProps: false,
  },

  // Component filtering with regex
  componentFilter: /^(Blog|Product|Work)/,

  // Security
  sensitiveKeys: ["apiKey", "secretToken"],
};
```

**Configuration Priority:**
1. `DEFAULT_CONFIG` (lowest priority)
2. `quzz.config.mjs` / `quzz.config.js` / `quzz.config.cjs`
3. Environment variables (`QUZZ_*`)
4. `configure()` (highest priority)

**Features:**
- ✅ Automatic loading on package initialization
- ✅ No code changes needed in components
- ✅ Type-safe with JSDoc `@type` comments
- ✅ Follows Next.js convention (`next.config.mjs`)
- ✅ Supports both ESM and CommonJS
- ✅ Can still use `configure()` for runtime overrides
- ✅ Error handling with graceful fallbacks

**Usage:**
```bash
# 1. Create config file in project root
echo "export default { logLevel: 'info' };" > quzz.config.mjs

# 2. That's it! Config is automatically loaded
npm run dev
```

**Helper Functions:**
- `hasConfigFile()` - Check if config file exists
- `getConfigFilePath()` - Get path to active config file
- `loadConfigFromFileAsync()` - Manually load config (async)

---

**Contributors:** Claude (AI Assistant) & Onurhan Demir

**Release Date:** TBD

**Compatibility:** Next.js 13+, React 18+, Node.js 16.12+

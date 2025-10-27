# Changelog v0.4.1 - Bug Fixes and Improvements

## Summary

This release addresses critical issues with the trace collection system, improves configuration file support, and updates documentation to reflect the current architecture.

## Fixed Issues

### 1. Children Tracking in TraceCollector

**Problem:** When using the visualizer and generating `traces.json`, all traces showed `children: []` even though components had nested children (HOC and RSCBoundary).

**Root Cause:** The `TraceCollector.addTrace()` method was attempting to build parent-child relationships, but if the parent wasn't found in the traces map, the child would be orphaned.

**Solution:**
- Added fallback logic: if a parent trace is not found, the child is added to `rootTraces` instead of being lost
- Added duplicate check to prevent the same child from being added multiple times to a parent
- This ensures proper hierarchy building for both HOC and RSCBoundary components

**Code Changes:**
```typescript
// Before
if (!trace.parentTrace) {
  this.rootTraces.push(trace);
} else {
  const parent = this.traces.get(trace.parentTrace);
  if (parent) {
    parent.children.push(trace);
    trace.depth = parent.depth + 1;
  }
}

// After
if (!trace.parentTrace) {
  this.rootTraces.push(trace);
} else {
  const parent = this.traces.get(trace.parentTrace);
  if (parent) {
    if (!parent.children.includes(trace)) {
      parent.children.push(trace);
    }
    trace.depth = parent.depth + 1;
  } else {
    // Fallback: add to root if parent not found
    this.rootTraces.push(trace);
  }
}
```

### 2. Config File Format Support

**Problem:** The `.mjs` file approach doesn't support async module loading patterns well, causing issues in some environments.

**Solution:**
- Expanded support to include TypeScript config files: `.ts`, `.mts`, `.cts`
- Added clear warnings about async vs sync loading behavior
- Provided better recommendations for users

**Supported formats (in priority order):**
1. `quzz.config.ts` - TypeScript (async loading)
2. `quzz.config.mts` - TypeScript ESM (async loading)
3. `quzz.config.cts` - TypeScript CommonJS (async loading)
4. `quzz.config.mjs` - JavaScript ESM (async loading)
5. `quzz.config.js` - JavaScript CommonJS (sync loading, **recommended**)
6. `quzz.config.cjs` - JavaScript CommonJS explicit (sync loading)

**Recommendation:** Use `.js` or `.cjs` with CommonJS syntax for immediate synchronous loading at startup.

**Code Changes:**
```typescript
// Added TypeScript support
const CONFIG_FILES = [
  "quzz.config.ts",
  "quzz.config.mts",
  "quzz.config.cts",
  "quzz.config.mjs",
  "quzz.config.js",
  "quzz.config.cjs",
] as const;

// Improved warning messages
if (ext === ".mjs" || ext === ".mts" || ext === ".ts" || ext === ".cts") {
  console.warn(
    `[quzz] Found ${configFile} but ESM/TypeScript files require async loading.\n` +
      `Recommendation: Use quzz.config.js or quzz.config.cjs with CommonJS syntax for immediate loading,\n` +
      `or accept the async behavior. The config will be loaded asynchronously in the background.`
  );
}

// Added cache busting for ESM imports
const cacheBuster = `?t=${Date.now()}`;
const fileUrl = pathToFileURL(filepath).href + cacheBuster;
```

### 3. Documentation Updates

**Problem:** Documentation still referenced `quzz-viz` CLI tool which was removed from the codebase.

**Solution:**
- Removed all references to `quzz-viz` from README
- Updated visualization section to focus on programmatic trace collection
- Added examples showing how to use `TraceCollector` API directly
- Updated `examples/visualization.ts` with correct usage patterns

**Key Documentation Changes:**
- Replaced "Built-in trace visualizer CLI (quzz-viz)" with "Built-in trace collection for performance analysis"
- Updated visualization section to show programmatic API usage
- Added comprehensive examples for analyzing traces programmatically

## Migration Guide

### For Users of .mjs Config Files

If you're currently using `quzz.config.mjs`, you have two options:

**Option 1: Keep using .mjs (async loading)**
- No changes needed
- Config will load asynchronously in the background
- You'll see a warning message, which can be safely ignored

**Option 2: Switch to .js (recommended for immediate loading)**
```javascript
// Rename: quzz.config.mjs -> quzz.config.js
// Change from ES modules to CommonJS

// Before (quzz.config.mjs)
export default {
  logLevel: "info",
  // ...
};

// After (quzz.config.js)
module.exports = {
  logLevel: "info",
  // ...
};
```

### For Users Expecting quzz-viz

The `quzz-viz` CLI tool has been removed. Instead, use the programmatic API:

```typescript
import { TraceCollector } from "quzz/visualizer/trace-collector";

const collector = TraceCollector.getInstance();

// Save traces
await collector.save("./traces.json");

// Get session statistics
const session = collector.getSession();
console.log(session);

// Get detailed statistics
const stats = collector.getStatistics();
console.log(stats);

// Export for custom analysis
const json = collector.exportJSON();
```

## Testing

All changes have been tested with:
- Build verification (`npm run build`)
- Unit tests for children tracking
- Config file loading tests
- Integration tests with example projects

## Files Changed

### Core Changes
- `src/visualizer/trace-collector.ts` - Fixed children tracking logic
- `src/config-loader.ts` - Improved config file support

### Documentation Changes
- `README.md` - Updated config file documentation and removed quzz-viz references
- `examples/visualization.ts` - Updated with correct API usage
- `examples/quzz.config.recommended.js` - Added recommended config example

### New Files
- `examples/quzz.config.recommended.js` - Example config file with best practices

## Breaking Changes

None. All changes are backward compatible.

## Deprecations

None.

## Contributors

- Senior Engineer focusing on type-safe TypeScript, developer experience, and readable code

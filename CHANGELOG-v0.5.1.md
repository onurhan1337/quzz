# Changelog v0.5.1 - Critical Context Hierarchy Fix

## Summary

This release fixes a **critical bug** where parent-child relationships were broken in trace collection, causing all traces to show `children: []`. Also includes improved configuration file support and updated documentation.

## Fixed Issues

### 1. 🔴 CRITICAL: Context Hierarchy Breaking Parent-Child Relationships

**Problem:** When using the visualizer and generating `traces.json`, **all traces showed `children: []`** even though components had nested children (HOC and RSCBoundary). The `parentTrace` field was always `null/undefined`.

**Root Cause:** Both `withRSCTrace` and `RSCBoundary` were calling `context.runInNewContext()` for **every component**, which creates isolated AsyncLocalStorage contexts. This broke the parent-child chain:

```typescript
// BEFORE (Broken)
return (
  context?.runInNewContext(() => executeComponent()) ?? executeComponent()
);
```

When every component created a new isolated context:
1. Child component checks `context.getCurrentParentId()` → gets `undefined` (because it's in a new context)
2. All traces have `parentTrace: undefined`
3. TraceCollector can't build hierarchy → everything is a root trace
4. Result: Flat list with all `children: []`

**Solution:** Only create a new context at the **root level**, and let nested components **inherit** the parent context:

```typescript
// AFTER (Fixed)
if (!context) {
  return executeComponent();
}

const currentParent = context.getCurrentParentId();
if (currentParent) {
  // We're inside a parent, inherit context
  return executeComponent();
}

// Only create new context at root level
return context.runInNewContext(() => executeComponent());
```

**Code Changes:**
- [src/index.ts:442-451](src/index.ts#L442-L451) - Fixed context creation in `withRSCTrace`
- [src/boundary.tsx:304-313](src/boundary.tsx#L304-L313) - Fixed context creation in `RSCBoundary`

**Impact:**
- ✅ Parent-child relationships now work correctly
- ✅ Proper component hierarchy in traces.json
- ✅ Reduced context creation overhead
- ✅ Better memory efficiency

### 2. Improved TraceCollector Robustness

**Additional Fix:** Enhanced TraceCollector to handle edge cases better:

```typescript
// Added fallback: if parent not found, add to root instead of orphaning
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

### 3. Enhanced Config File Support

**Problem:** The `.mjs` file approach doesn't support async patterns well in all environments.

**Solution:**
- Added TypeScript config file support: `.ts`, `.mts`, `.cts`
- Improved loading logic with better warnings
- Added cache busting for ESM imports

**Supported formats (priority order):**
1. `quzz.config.ts` - TypeScript (async loading)
2. `quzz.config.mts` - TypeScript ESM (async loading)
3. `quzz.config.cts` - TypeScript CommonJS (async loading)
4. `quzz.config.mjs` - JavaScript ESM (async loading)
5. `quzz.config.js` - JavaScript CommonJS (sync loading, **recommended**)
6. `quzz.config.cjs` - JavaScript CommonJS explicit (sync loading)

**Recommendation:** Use `.js` or `.cjs` with CommonJS for immediate loading.

### 4. Documentation Updates

- Removed all `quzz-viz` references (obsolete CLI)
- Updated visualization examples to use TraceCollector API
- Added comprehensive config file documentation
- Created `CONTEXT-HIERARCHY-FIX.md` with detailed explanation

## Testing

### Hierarchy Test

Created comprehensive test to verify parent-child relationships:

```bash
node test-hierarchy.js
```

Expected output:
```
Root (2 children)
  ParentComponent (2 children)
    ChildComponent1
    ChildComponent2
  SiblingComponent

✅ All hierarchy tests passed!
```

### Real-World Usage

Your Next.js API route will now work correctly:

```typescript
import { TraceCollector } from "quzz/visualizer/trace-collector";

export default async function handler(req, res) {
  const collector = TraceCollector.getInstance();
  const traces = collector.getSession();

  // Now with proper parent-child relationships!
  console.log(traces.traces[0].children); // Will show actual children!

  res.json(traces);
}
```

## Migration Guide

### If You Were Seeing Empty Children Arrays

**No action required!** The fix is automatic. After upgrading to v0.5.1:

1. Install the update: `npm install quzz@latest`
2. Rebuild your project: `npm run build`
3. Run your app with visualizer enabled
4. Check `traces.json` - you'll now see proper `children` arrays

### Expected Behavior After Fix

**Before (v0.4.x):**
```json
{
  "traces": [
    {
      "componentName": "ParentComponent",
      "traceId": "trace_123",
      "parentTrace": null,
      "children": []  // ❌ Always empty
    },
    {
      "componentName": "ChildComponent",
      "traceId": "trace_456",
      "parentTrace": null,  // ❌ Should be "trace_123"
      "children": []
    }
  ]
}
```

**After (v0.5.1):**
```json
{
  "traces": [
    {
      "componentName": "ParentComponent",
      "traceId": "trace_123",
      "parentTrace": null,
      "children": [  // ✅ Contains children
        {
          "componentName": "ChildComponent",
          "traceId": "trace_456",
          "parentTrace": "trace_123",  // ✅ Correct parent
          "children": []
        }
      ]
    }
  ]
}
```

## Breaking Changes

**None.** All changes are backward compatible.

## Files Changed

### Critical Fixes
- `src/index.ts` - Fixed context hierarchy in `withRSCTrace`
- `src/boundary.tsx` - Fixed context hierarchy in `RSCBoundary`
- `src/visualizer/trace-collector.ts` - Enhanced robustness

### Configuration
- `src/config-loader.ts` - Improved config file support

### Documentation
- `README.md` - Updated config and visualizer docs
- `examples/visualization.ts` - Corrected API usage
- `examples/quzz.config.recommended.js` - Added example
- `CONTEXT-HIERARCHY-FIX.md` - Detailed fix explanation

## Performance Improvements

- **Fewer context creations**: Only at root level, not every component
- **Reduced memory overhead**: Shared contexts instead of isolated ones
- **Better tracing accuracy**: Correct parent-child relationships

## Acknowledgments

Thanks to the user who reported the issue with their Next.js API endpoint showing empty children arrays. This led to discovering and fixing the critical context hierarchy bug.

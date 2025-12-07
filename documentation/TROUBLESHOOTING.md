# Troubleshooting Guide

Solutions to common issues with quzz.

## Table of Contents

- [No Logs in Development](#no-logs-in-development)
- [Sensitive Data Being Logged](#sensitive-data-being-logged)
- [Performance Metrics Memory Issues](#performance-metrics-memory-issues)
- [Errors Losing Context](#errors-losing-context)
- [Logs Too Verbose](#logs-too-verbose)
- [Testing with quzz](#testing-with-quzz)
- [Next.js 15+ Promise Props](#nextjs-15-promise-props)
- [Props Awaiting Hanging](#props-awaiting-hanging)
- [Terminal Hyperlinks Not Working](#terminal-hyperlinks-not-working)
- [Config File Not Loading](#config-file-not-loading)
- [TypeScript Errors](#typescript-errors)

## No Logs in Development

**Problem:** You don't see any quzz logs in your terminal during development.

**Solutions:**

### Check NODE_ENV

quzz is automatically disabled in production. Ensure `NODE_ENV` is set to `development`:

```bash
NODE_ENV=development next dev
```

### Force Enable

Temporarily force enable for debugging:

```typescript
import { configure } from "quzz";

configure({ forceEnable: true });
```

### Check if Disabled

Check if quzz was explicitly disabled:

```bash
# Remove if set
unset QUZZ_DISABLE
```

### Verify Component Wrapping

Ensure your component is wrapped correctly:

```tsx
import { withRSCTrace } from "quzz";

// ✅ Correct
export default withRSCTrace(MyComponent);

// ❌ Wrong - Missing export
withRSCTrace(MyComponent);
```

### Check Log Level

Your log level might be too restrictive:

```typescript
configure({ logLevel: "debug" }); // Show all logs
```

## Sensitive Data Being Logged

**Problem:** Sensitive information (passwords, tokens, etc.) is appearing in logs.

**Solutions:**

### Add Custom Sensitive Keys

```typescript
import { configure } from "quzz";

configure({
  sensitiveKeys: [
    "password",
    "creditCard",
    "ssn",
    "apiKey",
    "apiSecret",
    "secretToken",
  ],
});
```

### Component-Level Disabling

Disable prop logging for specific components:

```tsx
const SecureComponent = withRSCTrace(MyComponent, {
  disable: {
    props: true, // Don't log props at all
  },
});
```

### Custom Sanitization

For complex objects, sanitize before passing:

```tsx
async function SecureComponent({ user }) {
  const sanitizedUser = {
    id: user.id,
    name: user.name,
    // Omit sensitive fields
  };

  return <ComponentWithTrace user={sanitizedUser} />;
}
```

### Default Sensitive Keys

quzz automatically redacts these keys by default:

- password
- token
- secret
- key
- api_key
- apikey
- auth
- credential
- private
- ssn
- pin
- passcode
- hash
- salt
- signature
- bearer
- oauth
- jwt
- session
- cookie
- csrf
- code

## Performance Metrics Memory Issues

**Problem:** Memory usage increases over time due to metric accumulation.

**Solutions:**

### Automatic Cleanup

quzz automatically cleans up old metrics, but you can tune it manually:

```typescript
import { clearMetrics } from "quzz";

// Clear periodically
setInterval(() => {
  clearMetrics();
}, 3600000); // Every hour
```

### Disable Metrics Collection

If you don't need metrics:

```typescript
configure({
  performance: {
    enabled: false,
  },
});
```

### Component Filtering

Only track specific components:

```typescript
configure({
  componentFilter: /^(Critical|Important)/, // Only track these
});
```

## Errors Losing Context

**Problem:** Error context is lost when crossing the server-client boundary.

**Solutions:**

### Custom Error Serialization

For custom error types, implement `toJSON()`:

```typescript
class CustomError extends Error {
  constructor(
    message: string,
    public customField: string
  ) {
    super(message);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      customField: this.customField,
      stack: this.stack,
    };
  }
}
```

### Use Error Boundaries

Combine with React Error Boundaries:

```tsx
import { ErrorBoundary } from "react-error-boundary";

<ErrorBoundary fallback={<ErrorFallback />}>
  <TracedComponent />
</ErrorBoundary>;
```

### Enable Error Logging

Ensure error logging is enabled:

```tsx
const TracedComponent = withRSCTrace(MyComponent, {
  logLevel: "error",
  disable: {
    errors: false, // Ensure errors are logged
  },
});
```

## Logs Too Verbose

**Problem:** Too many logs cluttering your terminal.

**Solutions:**

### Adjust Log Level

```typescript
configure({
  logLevel: "warn", // Only warnings and errors
});
```

### Use Component Filtering

Only trace specific components:

```typescript
configure({
  componentFilter: /^(Header|Footer|Nav)/, // Only these components
});
```

### Use Compact Format

```typescript
configure({
  outputFormat: "compact", // Single-line logs
});
```

### Disable for Specific Components

```tsx
const QuietComponent = withRSCTrace(MyComponent, {
  logLevel: "silent", // No logs for this component
});
```

## Testing with quzz

**Problem:** quzz interferes with tests or produces unwanted output.

**Solutions:**

### Disable in Test Setup

```javascript
// jest.setup.js or vitest.setup.js
import { configure } from "quzz";

configure({
  logLevel: "silent",
  forceEnable: false,
});
```

### Conditional Configuration

```typescript
import { configure } from "quzz";

if (process.env.NODE_ENV !== "test") {
  configure({
    logLevel: "info",
  });
}
```

### Mock quzz in Tests

```typescript
// __mocks__/quzz.ts
export const withRSCTrace = (component: any) => component;
export const configure = jest.fn();
```

## Next.js 15+ Promise Props

**Problem:** Props show `[Promise]` in logs (Next.js 15+).

**Solutions:**

### Option 1: Promise Type Hints (Safe, Default)

quzz automatically detects Promises and shows type hints:

```typescript
configure({
  props: {
    showPromiseTypes: true, // Already enabled by default
  },
});
```

**Output:** `Props: { params: [Promise<PageProps>] }`

### Option 2: Await Props (Advanced)

Enable `awaitProps` for full visibility:

```typescript
configure({
  props: {
    awaitProps: true, // ⚠️ May trigger side effects
    awaitTimeout: 5000,
  },
});
```

**Output:** `Props: { params: { slug: "product-123" } }`

**Warning:** Only use for debugging specific issues.

### Component-Level Override

Enable only for specific components:

```tsx
const DebugComponent = withRSCTrace(MyComponent, {
  props: {
    awaitProps: true,
  },
});
```

## Props Awaiting Hanging

**Problem:** Application hangs or is very slow when `awaitProps` is enabled.

**Solutions:**

### Reduce Timeout

```typescript
configure({
  props: {
    awaitProps: true,
    awaitTimeout: 1000, // Shorter timeout
  },
});
```

### Disable awaitProps

```typescript
configure({
  props: {
    awaitProps: false, // Disable awaiting
    showPromiseTypes: true, // Still show type hints
  },
});
```

### Component-Level Timeout

Adjust timeout per component:

```tsx
withRSCTrace(SlowComponent, {
  props: {
    awaitProps: true,
    awaitTimeout: 500, // Very short timeout
  },
});
```

## Terminal Hyperlinks Not Working

**Problem:** Trace IDs are not clickable in your terminal.

**Solutions:**

### Check Terminal Support

Hyperlinks (OSC 8) are supported in:

- iTerm2 (macOS)
- VS Code integrated terminal
- GNOME Terminal (Linux)
- Hyper

### Disable Hyperlinks

If your terminal doesn't support them:

```bash
QUZZ_DISABLE_HYPERLINKS=true npm run dev
```

Or in config:

```typescript
configure({
  enableHyperlinks: false,
});
```

## Config File Not Loading

**Problem:** quzz.config.js is not being loaded.

**Solutions:**

### Check File Location

Config file must be in project root (same directory as package.json):

```
project/
├── package.json
├── quzz.config.js  ← Here
└── app/
```

### Check File Name

Supported names (in priority order):

- `quzz.config.ts`
- `quzz.config.js` ← Recommended

### Verify Config Syntax

```javascript
// ✅ Correct
module.exports = {
  logLevel: "info",
};

// ❌ Wrong - Missing module.exports
{
  logLevel: "info",
}
```

### Check if Config is Loaded

```typescript
import { hasConfigFile, getConfigFilePath } from "quzz";

console.log("Has config:", hasConfigFile());
console.log("Config path:", getConfigFilePath());
```

### Force Reload

Restart your dev server after creating config file.

## TypeScript Errors

**Problem:** TypeScript errors when using quzz.

**Solutions:**

### Install Type Definitions

```bash
npm install --save-dev @types/node
```

### Import Types

```typescript
import type { QuzzConfig } from "quzz";

const config: QuzzConfig = {
  logLevel: "info",
};
```

### Use JSDoc for .js Files

```javascript
/** @type {import('quzz').QuzzConfig} */
module.exports = {
  logLevel: "info",
};
```

### Check peer Dependencies

Ensure you have compatible versions:

```json
{
  "peerDependencies": {
    "next": ">=13.0.0",
    "react": ">=18.0.0"
  }
}
```

## Performance Issues

**Problem:** quzz is slowing down your application.

**Solutions:**

### Use Component Filtering

Don't trace every component:

```typescript
configure({
  componentFilter: /^Critical/, // Only critical components
});
```

### Disable Prop Logging

Skip prop logging for large objects:

```tsx
withRSCTrace(Component, {
  disable: {
    props: true,
  },
});
```

### Adjust Sanitization Depth

```typescript
configure({
  maxPropDepth: 1, // Shallow sanitization
  maxStringLength: 100, // Shorter strings
});
```

### Use Compact Format

```typescript
configure({
  outputFormat: "compact", // Less processing
});
```

### Disable Memory Tracking

```typescript
configure({
  performance: {
    trackMemory: false,
  },
});
```

## Still Having Issues?

If none of these solutions work:

1. **Check the logs** - Look for quzz warnings or errors
2. **Enable debug mode** - `configure({ logLevel: "debug", debugContext: true })`
3. **Check GitHub Issues** - [github.com/onurhan1337/quzz/issues](https://github.com/onurhan1337/quzz/issues)
4. **Report a bug** - Create a new issue with:
   - quzz version
   - Next.js version
   - Node.js version
   - Minimal reproduction example
   - Error messages and logs

## Common Error Messages

### "AsyncLocalStorage is not available"

**Solution:** Update Node.js to version 16+ which includes AsyncLocalStorage.

### "Config file syntax error"

**Solution:** Check your config file syntax. Use `module.exports` for .js files:

```javascript
module.exports = {
  logLevel: "info",
};
```

### "Component name cannot be inferred"

**Solution:** Provide explicit component name:

```tsx
withRSCTrace(MyComponent, {
  componentName: "MyComponent",
});
```

### "Memory threshold exceeded"

**Solution:** Either increase threshold or investigate memory leak:

```typescript
configure({
  performance: {
    memoryThreshold: 100 * 1024 * 1024, // 100MB
  },
});
```

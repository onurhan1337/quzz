<div align="center">
  <img src="logo.svg" alt="quzz logo" width="64" height="64">
  <h1>quzz</h1>
  <p>Debugging for React Server Components in Next.js</p>
</div>

[![npm version](https://badge.fury.io/js/quzz.svg)](https://www.npmjs.com/package/quzz)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Traditional debugging tools like React DevTools don't work with React Server Components. quzz wraps your components with a simple HOC to provide detailed logging during development and automatically disables itself in production.

## Features

- **Zero config** - Works out of the box, highly customizable when needed
- **Performance tracking** - Automatic timing with configurable thresholds
- **Error debugging** - Full context and stack traces across RSC boundary
- **Props logging** - Automatic sensitive data redaction
- **Next.js 15+ support** - Handles async `params` and `searchParams`
- **Multiple output formats** - Pretty, compact, or JSON
- **Meaningful trace IDs** - Request-scoped IDs with component counters and optional route hints
- **Production-safe** - Automatically disabled in production, zero overhead
- **TypeScript support** - Fully typed configuration and APIs
- **Presets and type-safe config** - `configurePreset` and `defineConfig` for fast setup

## Installation

```bash
npm install quzz
```

## Quick Start

Wrap any React Server Component:

```tsx
import { withRSCTrace } from "quzz";

async function UserProfile({ userId }: { userId: string }) {
  const user = await fetchUser(userId);
  return <div>{user.name}</div>;
}

export default withRSCTrace(UserProfile);
```

Prefer presets for zero thinking:

```ts
import { configurePreset } from "quzz";

configurePreset("debug");
```

Terminal output:

```
ℹ️ [quzz] UserProfile rendered in 142ms
Props: { userId: "user_123" }
Trace: req_ab12.UserProfile#3 (/users?tab=profile)
```

## Configuration

Create `quzz.config.js` in your project root:

```javascript
/** @type {import('quzz').QuzzConfig} */
module.exports = {
  logLevel: "info",
  outputFormat: "compact", // "pretty" | "compact" | "json"
  performance: {
    warnThreshold: 500, // Warn if render > 500ms
  },
  traceId: { includeRouteHint: true, maxRouteLength: 120 },
  componentFilter: /^(Blog|Product)/, // Only trace specific components
  sensitiveKeys: ["apiKey", "secretToken"], // Additional keys to redact
};
```

Type-safe config file:

```ts
import { defineConfig } from "quzz";

export default defineConfig({
  logLevel: "debug",
  outputFormat: "grouped",
  performance: { enabled: true, warnThreshold: 500 },
  visualizer: { enabled: true },
});
```

Configuration is automatically loaded. See [full configuration guide](./documentation/CONFIGURATION.md) for all options.

### Logging formats and transports

- Formats: `pretty`, `compact`, `json`, `grouped`, or a custom formatter.
- Transports: use `createConsoleTransport`, `createFileTransport`, or `createHttpTransport`, or provide your own.

## Documentation

- **[Getting Started Guide](./documentation/GETTING_STARTED.md)** - Detailed installation and setup
- **[Configuration](./documentation/CONFIGURATION.md)** - All configuration options explained
- **[Examples](./documentation/EXAMPLES.md)** - Common use cases and patterns
- **[API Reference](./documentation/API_REFERENCE.md)** - Complete API documentation
- **[Troubleshooting](./documentation/TROUBLESHOOTING.md)** - Common issues and solutions
- **[Performance Guide](./documentation/PERFORMANCE.md)** - Optimization tips and best practices

## What's New

See [CHANGELOG.md](./CHANGELOG.md) for version history and updates.

## Production Safety

- **Automatically disabled** - Zero overhead in production (`NODE_ENV=production`)
- **No performance impact** - Complete no-op when disabled
- **Environment control** - Use `QUZZ_DISABLE=true` to disable in any environment

## Links

- [GitHub Repository](https://github.com/onurhan1337/quzz)
- [Issue Tracker](https://github.com/onurhan1337/quzz/issues)
- [NPM Package](https://www.npmjs.com/package/quzz)
- [Contributing Guide](./CONTRIBUTING.md)

## License

MIT © 2025 quzz contributors

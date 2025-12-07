# Configuration Guide

quzz supports multiple configuration methods with a clear priority system.

## Configuration Methods

### 1. File-Based Configuration (Recommended)

Create a configuration file in your project root. quzz automatically loads it on initialization.

#### Supported File Formats (priority order)

- `quzz.config.ts` (TypeScript, preferred)
- `quzz.config.js` (JavaScript, ESM/Node-resolved)

#### JavaScript Configuration (Recommended)

```javascript
// quzz.config.js
/** @type {import('quzz').QuzzConfig} */
module.exports = {
  logLevel: "info",
  outputFormat: "compact",

  performance: {
    enabled: true,
    warnThreshold: 500,
    trackMemory: true,
    memoryThreshold: 50 * 1024 * 1024, // 50MB
    enableHeapSnapshots: false,
  },

  props: {
    showPromiseTypes: true,
    awaitProps: false,
    maxArrayItems: 10,
    maxObjectProps: 20,
  },

  componentFilter: /^(Blog|Product|Work)/,
  sensitiveKeys: ["apiKey", "secretToken"],
  enableHyperlinks: true,
};
```

#### TypeScript Configuration

```typescript
// quzz.config.ts
import { defineConfig } from "quzz";

export default defineConfig({
  logLevel: "debug",
  outputFormat: "grouped",
  performance: {
    enabled: true,
    warnThreshold: 500,
  },
  visualizer: { enabled: true },
});
```

**Note:** TypeScript config loading requires `typescript` to be available in your project.

### 2. Programmatic Configuration

Configure at runtime using the `configure()` function:

```typescript
// app/layout.tsx
import { configure } from "quzz";

if (process.env.NODE_ENV === "development") {
  configure({
    logLevel: "info",
    outputFormat: "compact",
    performance: {
      enabled: true,
      warnThreshold: 500,
    },
  });
}
```

Or pick a preset:

```typescript
import { configurePreset } from "quzz";

configurePreset("debug");
```

### Presets

- `debug`: verbose logs, props, snapshots, visualizer on, perf warnings at 500ms.
- `perf`: compact logs, performance and memory tracking, throttled output.
- `minimal`: warnings only, minimal overhead.

### 3. Environment Variables

Override any setting via environment variables:

```bash
# Enable/disable
QUZZ_ENABLED=true
QUZZ_DISABLE=true  # Complete disable (highest priority)

# Configuration
QUZZ_LOG_LEVEL=debug
QUZZ_OUTPUT_FORMAT=compact
QUZZ_FORCE_ENABLE=true  # Force enable in production (not recommended)

# Features
QUZZ_DISABLE_HYPERLINKS=true
```

> Production behavior: when `NODE_ENV=production`, quzz is off by default. Keep `QUZZ_ENABLED=false` or `QUZZ_DISABLE=true` to stay disabled. Only force it on (not recommended) with `QUZZ_FORCE_ENABLE=true`.

### Configuration Priority

Settings are merged in this order (highest priority last):

1. **Defaults** (built-in)
2. **Config file** (`quzz.config.ts` or `quzz.config.js`, loaded async)
3. **Environment variables** (`QUZZ_*`)
4. **`configure()`** (programmatic)

> Note: The config file loads asynchronously; defaults+env apply first, then the file merges when ready. The sync loader is deprecated.
> If you call `configure()` after providing a config file, the programmatic call wins. (File-based config does not override values set via `configure()`.)
> `resetConfig()` restores defaults (+env, optionally file config). `reloadConfig()` re-reads the config file and resets using it.

## Configuration Options

### Core Options

#### `logLevel`

- **Type:** `"debug" | "info" | "warn" | "error" | "silent"`
- **Default:** `"error"`
- **Description:** Minimum log level to display

```javascript
module.exports = {
  logLevel: "debug", // Show all logs including debug
};
```

#### `outputFormat`

- **Type:** `"pretty" | "compact" | "json" | "grouped" | "custom"`
- **Default:** `"pretty"`
- **Description:** Output format for logs

```javascript
module.exports = {
  outputFormat: "grouped",
};
```

**Examples:**

- `pretty`: Multi-line, detailed logs
- `compact`: Single-line logs (e.g., `BlogPost: 4.79ms (620MB) ✓`)
- `json`: JSON-formatted logs for parsing
- `grouped`: Grouped multi-line logs without ANSI

#### `traceId`

- **Type:** `{ mode?: "structured" | "random"; includeRouteHint?: boolean; maxRouteLength?: number; maxSearchParamsLength?: number; maxIdLength?: number }`
- **Default:** `{ mode: "structured", includeRouteHint: true, maxRouteLength: 120, maxSearchParamsLength: 80, maxIdLength: 180 }`
- **Description:** Controls trace ID shape and route hint inclusion

```javascript
module.exports = {
  traceId: {
    mode: "structured",
    includeRouteHint: true,
    maxRouteLength: 120,
    maxSearchParamsLength: 80,
    maxIdLength: 180,
  },
};
```

Per-component route hints can be supplied via `withRSCTrace(Component, { routeHint: "/products?tag=summer" })`. Set `includeRouteHint: false` to disable.

#### Transports

Send logs to multiple destinations:

```typescript
import {
  configure,
  createConsoleTransport,
  createFileTransport,
  createHttpTransport,
} from "quzz";

configure({
  outputFormat: "json",
  transports: [
    createConsoleTransport(),
    createFileTransport({ path: "./quzz.log" }),
    createHttpTransport({ url: "https://logs.example.com/ingest" }),
  ],
});
```

- `grouped`: Grouped multi-line logs without ANSI

#### `forceEnable`

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Force enable quzz in production

```javascript
module.exports = {
  forceEnable: true, // NOT RECOMMENDED
};
```

**Warning:** Only use for temporary debugging. Impacts performance.

### Performance Options

#### `performance.enabled`

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Enable performance tracking

#### `performance.warnThreshold`

- **Type:** `number` (milliseconds)
- **Default:** `750`
- **Description:** Warn when component render exceeds threshold

```javascript
module.exports = {
  performance: {
    enabled: true,
    warnThreshold: 500, // Warn if > 500ms
  },
};
```

#### `performance.trackMemory`

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Track memory usage (Node.js only)

#### `performance.memoryThreshold`

- **Type:** `number` (bytes)
- **Default:** `30 * 1024 * 1024` (30MB)
- **Description:** Threshold for memory warnings

#### `performance.enableHeapSnapshots`

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Automatically capture heap snapshots on high memory usage

```javascript
module.exports = {
  performance: {
    enableHeapSnapshots: true,
    heapSnapshotDir: "./heap-snapshots",
  },
};
```

**Warning:** Heap snapshots are large files. Use only for debugging memory issues.

### Props Options

#### `props.showPromiseTypes`

- **Type:** `boolean`
- **Default:** `true`
- **Description:** Show type hints for Promise props (Next.js 15+)

```javascript
module.exports = {
  props: {
    showPromiseTypes: true, // Output: { params: [Promise<PageProps>] }
  },
};
```

#### `props.awaitProps`

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Await Promise props before logging

```javascript
module.exports = {
  props: {
    awaitProps: true, // Output: { params: { slug: "product-123" } }
    awaitTimeout: 5000, // Timeout in ms
  },
};
```

**Warning:** May trigger side effects and impact performance.

#### `props.maxArrayItems`

- **Type:** `number`
- **Default:** `10`
- **Description:** Maximum array items to log

#### `props.maxObjectProps`

- **Type:** `number`
- **Default:** `20`
- **Description:** Maximum object properties to log

### Filtering Options

#### `componentFilter`

- **Type:** `RegExp`
- **Default:** `undefined` (all components)
- **Description:** Only trace components matching regex

```javascript
module.exports = {
  componentFilter: /^(Blog|Product|Work)/, // Only trace these components
};
```

#### `sensitiveKeys`

- **Type:** `string[]`
- **Default:** Built-in list (password, token, secret, etc.)
- **Description:** Additional keys to redact from props

```javascript
module.exports = {
  sensitiveKeys: ["apiKey", "secretToken", "creditCard"],
};
```

**Default sensitive keys:** password, token, secret, key, api_key, apikey, auth, credential, private, ssn, pin, passcode, hash, salt, signature, bearer, oauth, jwt, session, cookie, csrf, code

### Advanced Options

#### `enableHyperlinks`

- **Type:** `boolean`
- **Default:** `true`
- **Description:** Enable clickable trace IDs in terminal (OSC 8)

#### `autoLinkParent`

- **Type:** `boolean`
- **Default:** `true`
- **Description:** Automatically link child traces to parent (v0.5.6+)

#### `debugContext`

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Enable context debugging warnings

#### `enableSnapshots`

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Enable context snapshots (requires Node.js 16.12+)

#### `verboseMode`

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Automatically capture snapshots at key points

#### `visualizer.enabled`

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Enable trace collection for visualization

```javascript
module.exports = {
  visualizer: {
    enabled: true,
    output: "./traces.json",
  },
};
```

### Plugin System

#### `plugins`

- **Type:** `Array<Plugin>`
- **Default:** `[]`
- **Description:** Custom plugins for integrations

```javascript
const sentryPlugin = {
  onError: async (metadata, error) => {
    Sentry.captureException(error, {
      tags: { component: metadata.componentName },
    });
  },
};

module.exports = {
  plugins: [sentryPlugin],
};
```

#### `formatter`

- **Type:** `(entry: LogEntry) => any`
- **Default:** `undefined`
- **Description:** Custom output formatter

```javascript
module.exports = {
  formatter: (entry) => ({
    timestamp: entry.timestamp,
    component: entry.componentName,
    message: entry.message,
  }),
};
```

## Component-Level Configuration

Override global config for specific components:

```typescript
import { withRSCTrace } from "quzz";

const DataTable = withRSCTrace(
  async function DataTable({ filters }) {
    const data = await db.query(filters);
    return <Table data={data} />;
  },
  {
    componentName: "DataTable",
    tags: ["critical", "database"],
    logLevel: "debug",
    performance: {
      warnThreshold: 200, // Override global threshold
    },
    props: {
      awaitProps: true, // Enable only for this component
    },
    autoLinkParent: true,
  }
);
```

### Component Options

All component-level options:

```typescript
{
  // Naming
  componentName: "CustomName",
  tags: ["auth", "critical"],

  // Logging
  logLevel: "debug",
  logProps: true,

  // Props configuration
  props: {
    awaitProps: false,
    awaitTimeout: 5000,
    showPromiseTypes: true,
  },

  // Performance
  performance: {
    enabled: true,
    warnThreshold: 1000,
    trackMemory: true,
  },

  // Features
  disable: {
    props: false,
    timing: false,
    errors: false,
  },

  // Hierarchy tracking
  autoLinkParent: true,
}
```

## Utility Functions

### Check for Config File

```typescript
import { hasConfigFile, getConfigFilePath } from "quzz";

if (hasConfigFile()) {
  console.log(`Using config: ${getConfigFilePath()}`);
}
```

### Load Config Manually

```typescript
import { loadConfigFromFileAsync } from "quzz";

const config = await loadConfigFromFileAsync();
console.log(config);
```

### Get Current Config

```typescript
import { getConfig } from "quzz";

const currentConfig = getConfig();
console.log(currentConfig);
```

### Reset Config

```typescript
import { resetConfig } from "quzz";

resetConfig(); // Reset to defaults
```

## Best Practices

1. **Use file-based config** for most projects (easier to version control)
2. **Use `.js` format** for immediate loading
3. **Use component filters** to reduce noise
4. **Don't enable `awaitProps` globally** - use only when debugging specific issues
5. **Keep `forceEnable: false`** in production
6. **Use environment variables** for CI/CD overrides
7. **Set appropriate `warnThreshold`** values for your use case
8. **Add custom `sensitiveKeys`** for your domain-specific sensitive data

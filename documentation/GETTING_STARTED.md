# Getting Started with quzz

A complete guide to getting started with quzz for debugging React Server Components.

## Prerequisites

- Next.js 13.0.0 or higher
- React 18.0.0 or higher
- Node.js 16.0.0 or higher (for AsyncLocalStorage)

## Installation

Install quzz via npm:

```bash
npm install quzz
```

Or with yarn:

```bash
yarn add quzz
```

Or with pnpm:

```bash
pnpm add quzz
```

## Basic Setup

### Step 1: Wrap Your Components

The simplest way to use quzz is to wrap your React Server Components with `withRSCTrace`:

```tsx
// app/components/UserProfile.tsx
import { withRSCTrace } from "quzz";

async function UserProfile({ userId }: { userId: string }) {
  const user = await fetchUser(userId);
  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}

export default withRSCTrace(UserProfile);
```

### Step 2: Run Your App

Start your Next.js development server:

```bash
npm run dev
```

### Step 3: Check Your Terminal

You'll see output in your terminal:

```
ℹ️ [quzz] UserProfile rendered in 142ms
Props: { userId: "user_123" }
```

That's it! quzz is now tracking your component renders.

## Configuration (Optional)

While quzz works without configuration, you can customize it to your needs.

### Create a Config File

Create `quzz.config.js` in your project root:

```javascript
// quzz.config.js
/** @type {import('quzz').QuzzConfig} */
module.exports = {
  logLevel: "info",
  outputFormat: "compact",
  traceId: {
    mode: "structured",
    includeRouteHint: true,
    maxPathLength: 120,
    maxSearchParamsLength: 80,
    maxIdLength: 180,
  },
  performance: {
    enabled: true,
    warnThreshold: 500,
  },
};
```

quzz automatically loads this file on startup.

### Programmatic Configuration

Alternatively, configure in your app code:

```tsx
// app/layout.tsx
import { configure } from "quzz";

if (process.env.NODE_ENV === "development") {
  configure({
    logLevel: "info",
    outputFormat: "compact",
    traceId: {
      includeRouteHint: true,
      maxPathLength: 100,
    },
  });
}
```

export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
```

## Common Patterns

### Wrapping Multiple Components

```tsx
// app/blog/BlogPost.tsx
import { withRSCTrace } from "quzz";

async function BlogPost({ slug }: { slug: string }) {
  const post = await fetchPost(slug);
  return <article>{post.content}</article>;
}

export default withRSCTrace(BlogPost);
```

```tsx
// app/products/ProductCard.tsx
import { withRSCTrace } from "quzz";

function ProductCard({ product }: { product: Product }) {
  return (
    <div>
      <h3>{product.name}</h3>
      <p>${product.price}</p>
    </div>
  );
}

export default withRSCTrace(ProductCard);
```

### Performance Monitoring

Set performance thresholds:

```tsx
const DataTable = withRSCTrace(
  async function DataTable({ query }) {
    const data = await db.query(query);
    return <Table data={data} />;
  },
  {
    componentName: "DataTable",
    performance: {
      warnThreshold: 200, // Warn if > 200ms
    },
  }
);

export default DataTable;
```

### Route Hints for Better Debugging

Add custom route hints to identify component context:

```tsx
const ProductPage = withRSCTrace(
  async function ProductPage({ params }) {
    const { slug } = await params;
    const product = await fetchProduct(slug);
    return <ProductDetails product={product} />;
  },
  {
    componentName: "ProductPage",
    routeHint: "/products/[slug]", // Custom route identifier
  }
);

export default ProductPage;
```

**Output with route hints:**
```
ℹ️ [quzz] ProductPage rendered in 89ms
Trace: req_abc123.ProductPage#1 (/products/[slug])
```

### Component Filtering

Only trace specific components:

```javascript
// quzz.config.js
module.exports = {
  componentFilter: /^(Blog|Product|User)/, // Only trace these
};
```

## Output Formats

### Pretty Format (Default)

Multi-line, detailed logs:

```
ℹ️ [quzz] UserProfile rendered in 142ms
Props: { userId: "user_123" }
Memory: 45.2 MB
Trace: req_abc123.UserProfile#1 (/users/profile)
```

### Compact Format

Single-line logs:

```javascript
module.exports = {
  outputFormat: "compact",
};
```

Output:

```
UserProfile: 142ms (45MB) ✓ (/users/profile)
DataTable: 523ms (45MB) ⚠ (/admin/data?view=table)
ErrorComponent: 234ms ✗ Database error (/api/users)
```

### JSON Format

Machine-readable logs:

```javascript
module.exports = {
  outputFormat: "json",
};
```

Output:

```json
{"level":"info","component":"UserProfile","duration":142,"props":{"userId":"user_123"},"timestamp":"2025-10-30T10:30:45.123Z"}
```

## Next Steps

- [Configuration Guide](./CONFIGURATION.md) - Detailed configuration options
- [Examples](./EXAMPLES.md) - Common use cases and patterns
- [API Reference](./API_REFERENCE.md) - Complete API documentation
- [Troubleshooting](./TROUBLESHOOTING.md) - Solutions to common issues

## Quick Reference

### Import from quzz

```typescript
import {
  withRSCTrace,       // Wrap components
  configure,          // Configure globally
  getConfig,          // Get current config
  resetConfig,        // Reset to defaults
  getMetrics,         // Get performance metrics
  getPerformanceSummary, // Get aggregated metrics
  clearMetrics,       // Clear metrics
  RSCBoundary,        // Boundary component
  safeURLParsing,     // Safe URL parsing utility
  truncatePath,       // Path truncation utility
} from "quzz";
```

### Environment Variables

```bash
QUZZ_ENABLED=true              # Enable/disable
QUZZ_DISABLE=true              # Complete disable
QUZZ_LOG_LEVEL=debug           # Set log level
QUZZ_OUTPUT_FORMAT=compact     # Set format
```

### Config File Location

```
project/
├── package.json
├── quzz.config.js  ← Here
└── app/
```

## Production Safety

quzz is automatically disabled in production:

- Checks `NODE_ENV` environment variable
- Zero overhead when disabled
- No code runs, no performance impact

To explicitly disable in any environment:

```bash
QUZZ_DISABLE=true npm run build
```

## Tips for Success

1. **Start simple** - Just wrap components with `withRSCTrace`
2. **Use component filtering** - Don't trace every component
3. **Set appropriate thresholds** - Match your performance goals
4. **Check the docs** - Comprehensive guides for advanced features
5. **Never force enable in production** - Keep `forceEnable: false`

## Help and Support

- [GitHub Issues](https://github.com/onurhan1337/quzz/issues) - Report bugs
- [Troubleshooting Guide](./TROUBLESHOOTING.md) - Common issues
- [Examples](./EXAMPLES.md) - Practical examples

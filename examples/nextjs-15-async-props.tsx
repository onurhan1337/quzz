/**
 * Example: Next.js 15+ Async Props with quzz
 *
 * This example demonstrates how quzz handles Next.js 15's async props
 * with both Promise type detection and optional awaiting.
 */

import { withRSCTrace, configure } from "quzz";

// ============================================================================
// Configuration Examples
// ============================================================================

// Option 1: Safe Promise Detection (Default)
// Shows Promise type hints without awaiting - no side effects
configure({
  logLevel: "info",
  logProps: true,
  props: {
    showPromiseTypes: true, // Default: true
    awaitProps: false, // Default: false - safe mode
  },
});

// Option 2: Await Props for Full Visibility (Use with Caution)
// Resolves Promises before logging - may trigger side effects
configure({
  logLevel: "info",
  logProps: true,
  props: {
    awaitProps: true, // ⚠️ May trigger DB/network calls
    awaitTimeout: 5000, // Timeout after 5 seconds
    showPromiseTypes: true,
  },
});

// ============================================================================
// Example Components
// ============================================================================

/**
 * Example 1: Basic Product Page with Async Params
 *
 * With showPromiseTypes (default):
 * Props: { params: [Promise<PageProps>] }
 *
 * With awaitProps enabled:
 * Props: { params: { slug: "wireless-keyboard" } }
 */
async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await fetchProduct(slug);

  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
    </div>
  );
}

export const TracedProductPage = withRSCTrace(ProductPage, {
  componentName: "ProductPage",
  logProps: true,
});

/**
 * Example 2: Search Page with Multiple Async Props
 *
 * With showPromiseTypes (default):
 * Props: {
 *   params: [Promise<PageProps>],
 *   searchParams: [Promise<PageProps>]
 * }
 *
 * With awaitProps enabled:
 * Props: {
 *   params: { category: "electronics" },
 *   searchParams: { q: "laptop", sort: "price" }
 * }
 */
async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const { category } = await params;
  const { q, sort } = await searchParams;

  const results = await searchProducts(category, q, sort);

  return (
    <div>
      <h1>Search Results for {category}</h1>
      {/* ... */}
    </div>
  );
}

export const TracedSearchPage = withRSCTrace(SearchPage, {
  componentName: "SearchPage",
  logProps: true,
  // Component-level override - enable awaitProps only for this component
  props: {
    awaitProps: true,
    awaitTimeout: 3000,
  },
});

/**
 * Example 3: Handling Slow or Failed Promises
 *
 * With awaitProps enabled and timeout:
 * Props: {
 *   params: { id: "123" },
 *   slowData: [Promise: Promise timeout after 1000ms],
 *   failedData: [Promise: Error - Failed to fetch]
 * }
 */
async function RobustPage({
  params,
  slowData,
  failedData,
}: {
  params: Promise<{ id: string }>;
  slowData: Promise<string>;
  failedData: Promise<unknown>;
}) {
  const { id } = await params;

  // Handle slow/failed data gracefully
  const [slow, failed] = await Promise.allSettled([
    slowData,
    failedData,
  ]);

  return <div>ID: {id}</div>;
}

export const TracedRobustPage = withRSCTrace(RobustPage, {
  componentName: "RobustPage",
  props: {
    awaitProps: true,
    awaitTimeout: 1000, // Short timeout to demonstrate handling
  },
});

/**
 * Example 4: Mixed Props (Regular + Promise)
 *
 * With showPromiseTypes (default):
 * Props: {
 *   userId: "user_123",
 *   isAdmin: true,
 *   params: [Promise<PageProps>]
 * }
 *
 * With awaitProps enabled:
 * Props: {
 *   userId: "user_123",
 *   isAdmin: true,
 *   params: { tab: "settings" }
 * }
 */
async function UserDashboard({
  userId,
  isAdmin,
  params,
}: {
  userId: string;
  isAdmin: boolean;
  params: Promise<{ tab: string }>;
}) {
  const { tab } = await params;
  const userData = await fetchUserData(userId);

  return (
    <div>
      <h1>Dashboard - {tab}</h1>
      {/* ... */}
    </div>
  );
}

export const TracedUserDashboard = withRSCTrace(UserDashboard, {
  componentName: "UserDashboard",
  logProps: true,
});

/**
 * Example 5: Nested Promise Objects
 *
 * With showPromiseTypes:
 * Props: {
 *   config: {
 *     theme: "dark",
 *     asyncSettings: [Promise<unknown>]
 *   }
 * }
 */
async function ConfigurablePage({
  config,
}: {
  config: {
    theme: string;
    asyncSettings: Promise<Record<string, unknown>>;
  };
}) {
  const settings = await config.asyncSettings;

  return <div>Theme: {config.theme}</div>;
}

export const TracedConfigurablePage = withRSCTrace(ConfigurablePage, {
  componentName: "ConfigurablePage",
  logProps: true,
  props: {
    showPromiseTypes: true,
  },
});

// ============================================================================
// Helper Functions (Mock)
// ============================================================================

async function fetchProduct(slug: string) {
  return {
    name: "Wireless Keyboard",
    description: "High-quality wireless keyboard",
  };
}

async function searchProducts(
  category: string,
  query?: string,
  sort?: string
) {
  return [];
}

async function fetchUserData(userId: string) {
  return { id: userId, name: "John Doe" };
}

// ============================================================================
// Expected Output Examples
// ============================================================================

/*
┌─────────────────────────────────────────────────────────────────────────────┐
│ Example 1: Default Mode (showPromiseTypes: true, awaitProps: false)        │
└─────────────────────────────────────────────────────────────────────────────┘

2025-01-26 10:30:45.123 ℹ️  INFO ProductPage Rendering started
  Props: { params: [Promise<PageProps>] }

2025-01-26 10:30:45.265 ℹ️  INFO ProductPage Rendering completed in 142.34ms
  Props: { params: [Promise<PageProps>] }


┌─────────────────────────────────────────────────────────────────────────────┐
│ Example 2: Await Mode (awaitProps: true)                                    │
└─────────────────────────────────────────────────────────────────────────────┘

2025-01-26 10:31:20.456 ℹ️  INFO SearchPage Rendering started

2025-01-26 10:31:20.461 🔍 DEBUG SearchPage Props captured
  Props: {
    params: { category: "electronics" },
    searchParams: { q: "laptop", sort: "price" }
  }

2025-01-26 10:31:20.598 ℹ️  INFO SearchPage Rendering completed in 142.45ms
  Props: {
    params: { category: "electronics" },
    searchParams: { q: "laptop", sort: "price" }
  }


┌─────────────────────────────────────────────────────────────────────────────┐
│ Example 3: Error Handling (awaitProps with timeout)                         │
└─────────────────────────────────────────────────────────────────────────────┘

2025-01-26 10:32:15.789 ℹ️  INFO RobustPage Rendering started

2025-01-26 10:32:16.790 🔍 DEBUG RobustPage Props captured
  Props: {
    params: { id: "123" },
    slowData: [Promise: Promise timeout after 1000ms],
    failedData: [Promise: Error - Failed to fetch]
  }

2025-01-26 10:32:16.935 ℹ️  INFO RobustPage Rendering completed in 1146.23ms
  Props: {
    params: { id: "123" },
    slowData: [Promise: Promise timeout after 1000ms],
    failedData: [Promise: Error - Failed to fetch]
  }
*/

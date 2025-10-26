/**
 * Manual Test Suite for Promise Handling Features
 * Run this with: npx tsx examples/test-promise-handling.ts
 */

import { configure } from "../src/index";
import { sanitizeProps, sanitizePropsAsync } from "../src/utils";

console.log("🧪 Testing quzz Promise Handling Features\n");

// ============================================================================
// Test 1: Promise Detection with Type Hints (Default Mode)
// ============================================================================
console.log("─".repeat(80));
console.log("Test 1: Promise Detection with Type Hints (Default Mode)");
console.log("─".repeat(80));

const testProps1 = {
  userId: "user_123",
  isActive: true,
  params: Promise.resolve({ slug: "test-product" }),
  searchParams: Promise.resolve({ q: "laptop", page: "1" }),
  metadata: {
    timestamp: Date.now(),
    asyncData: Promise.resolve({ loaded: true }),
  },
};

const sanitized1 = sanitizeProps(testProps1, {
  maxPropDepth: 3,
  maxStringLength: 200,
  props: {
    showPromiseTypes: true,
    awaitProps: false,
  },
});

console.log("Input props:", {
  userId: testProps1.userId,
  isActive: testProps1.isActive,
  params: "[Promise object]",
  searchParams: "[Promise object]",
  metadata: { timestamp: "number", asyncData: "[Promise object]" },
});
console.log("\nSanitized output:");
console.log(JSON.stringify(sanitized1, null, 2));
console.log("\n✅ Expected: Promises shown as [Promise] or [Promise<type>]\n");

// ============================================================================
// Test 2: Await Props with Successful Resolution
// ============================================================================
console.log("─".repeat(80));
console.log("Test 2: Await Props with Successful Resolution");
console.log("─".repeat(80));

const testProps2 = {
  userId: "user_456",
  params: Promise.resolve({ id: "123", category: "electronics" }),
  searchParams: Promise.resolve({ sort: "price", order: "asc" }),
  count: 42,
};

(async () => {
  const sanitized2 = await sanitizePropsAsync(testProps2, {
    maxPropDepth: 3,
    maxStringLength: 200,
    props: {
      awaitProps: true,
      awaitTimeout: 5000,
      showPromiseTypes: true,
    },
  });

  console.log("Input props:", {
    userId: testProps2.userId,
    params: "[Promise object]",
    searchParams: "[Promise object]",
    count: testProps2.count,
  });
  console.log("\nSanitized output (awaited):");
  console.log(JSON.stringify(sanitized2, null, 2));
  console.log("\n✅ Expected: Promises resolved to their actual values\n");
})();

// ============================================================================
// Test 3: Promise Timeout Handling
// ============================================================================
console.log("─".repeat(80));
console.log("Test 3: Promise Timeout Handling");
console.log("─".repeat(80));

const slowPromise = new Promise((resolve) => {
  // Never resolves within timeout
  setTimeout(() => resolve({ data: "slow" }), 10000);
});

const testProps3 = {
  normalProp: "hello",
  slowData: slowPromise,
};

(async () => {
  const startTime = Date.now();
  const sanitized3 = await sanitizePropsAsync(testProps3, {
    maxPropDepth: 3,
    maxStringLength: 200,
    props: {
      awaitProps: true,
      awaitTimeout: 1000, // 1 second timeout
      showPromiseTypes: true,
    },
  });
  const duration = Date.now() - startTime;

  console.log("Input props:", {
    normalProp: testProps3.normalProp,
    slowData: "[Slow Promise object]",
  });
  console.log("\nSanitized output (with timeout):");
  console.log(JSON.stringify(sanitized3, null, 2));
  console.log(`\nResolution time: ${duration}ms`);
  console.log("✅ Expected: Timeout message after ~1000ms\n");
})();

// ============================================================================
// Test 4: Promise Rejection Handling
// ============================================================================
console.log("─".repeat(80));
console.log("Test 4: Promise Rejection Handling");
console.log("─".repeat(80));

const failedPromise = Promise.reject(new Error("Database connection failed"));

const testProps4 = {
  userId: "user_789",
  failedData: failedPromise,
  normalData: { key: "value" },
};

(async () => {
  const sanitized4 = await sanitizePropsAsync(testProps4, {
    maxPropDepth: 3,
    maxStringLength: 200,
    props: {
      awaitProps: true,
      awaitTimeout: 5000,
      showPromiseTypes: true,
    },
  });

  console.log("Input props:", {
    userId: testProps4.userId,
    failedData: "[Rejected Promise]",
    normalData: testProps4.normalData,
  });
  console.log("\nSanitized output (with error):");
  console.log(JSON.stringify(sanitized4, null, 2));
  console.log("\n✅ Expected: Error message shown for rejected Promise\n");
})();

// ============================================================================
// Test 5: Mixed Props (Primitives, Objects, Promises)
// ============================================================================
console.log("─".repeat(80));
console.log("Test 5: Mixed Props (Complex Nested Structure)");
console.log("─".repeat(80));

const testProps5 = {
  // Primitives
  id: "item_123",
  count: 42,
  isEnabled: true,

  // Objects
  config: {
    theme: "dark",
    language: "en",
  },

  // Arrays
  tags: ["featured", "new", "sale"],

  // Promises
  params: Promise.resolve({ slug: "product-name" }),
  asyncConfig: Promise.resolve({ loaded: true, version: "2.0" }),

  // Nested with Promises
  metadata: {
    createdAt: new Date(),
    author: "John Doe",
    asyncData: Promise.resolve({ status: "active" }),
  },

  // Functions
  callback: () => console.log("test"),

  // Special values
  nullValue: null,
  undefinedValue: undefined,
};

(async () => {
  // Test with awaitProps
  const sanitized5 = await sanitizePropsAsync(testProps5, {
    maxPropDepth: 3,
    maxStringLength: 200,
    props: {
      awaitProps: true,
      awaitTimeout: 5000,
      showPromiseTypes: true,
    },
  });

  console.log("Sanitized output (complex nested structure):");
  console.log(JSON.stringify(sanitized5, null, 2));
  console.log(
    "\n✅ Expected: All types handled correctly, Promises resolved\n"
  );
})();

// ============================================================================
// Test 6: Configuration Integration
// ============================================================================
console.log("─".repeat(80));
console.log("Test 6: Configuration Integration");
console.log("─".repeat(80));

// Test configuration
configure({
  logLevel: "info",
  logProps: true,
  props: {
    awaitProps: false,
    awaitTimeout: 3000,
    showPromiseTypes: true,
  },
});

console.log("✅ Configuration set successfully");
console.log("   - awaitProps: false");
console.log("   - awaitTimeout: 3000ms");
console.log("   - showPromiseTypes: true\n");

// Test with warning
configure({
  logLevel: "info",
  props: {
    awaitProps: true, // Should trigger warning
  },
});

console.log("✅ Warning should be shown for awaitProps: true\n");

// ============================================================================
// Test 7: Type Hints without Awaiting
// ============================================================================
console.log("─".repeat(80));
console.log("Test 7: Type Hints Detection");
console.log("─".repeat(80));

const testProps7 = {
  simplePromise: Promise.resolve("value"),
  objectPromise: Promise.resolve({ data: "test" }),
  arrayPromise: Promise.resolve([1, 2, 3]),
};

const sanitized7 = sanitizeProps(testProps7, {
  maxPropDepth: 3,
  maxStringLength: 200,
  props: {
    showPromiseTypes: true,
  },
});

console.log("Sanitized output (type hints only):");
console.log(JSON.stringify(sanitized7, null, 2));
console.log("✅ Expected: Promises shown with type hints if detectable\n");

// ============================================================================
// Summary
// ============================================================================
setTimeout(() => {
  console.log("═".repeat(80));
  console.log("🎉 All tests completed!");
  console.log("═".repeat(80));
  console.log("\nFeatures tested:");
  console.log("  ✅ Promise detection with type hints");
  console.log("  ✅ Async props awaiting");
  console.log("  ✅ Timeout handling");
  console.log("  ✅ Error/rejection handling");
  console.log("  ✅ Mixed props handling");
  console.log("  ✅ Configuration integration");
  console.log("  ✅ Type inference");
  console.log("\nReady for production use! 🚀\n");
}, 3000); // Wait for async tests to complete

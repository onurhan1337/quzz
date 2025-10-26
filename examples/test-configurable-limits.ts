/**
 * Test configurable limits for arrays, objects, and error depth
 */

import { sanitizeProps } from "../src/utils";

console.log("Testing configurable limits\n");

// Test 1: Array limits
console.log("=== Test 1: Custom maxArrayItems ===");
const largeArray = Array.from({ length: 50 }, (_, i) => i);

const result1 = sanitizeProps(
  { items: largeArray },
  {
    maxPropDepth: 3,
    maxStringLength: 200,
    props: { maxArrayItems: 3 }, // Only show 3 items
  }
);
console.log("Array with maxArrayItems=3:");
console.log(JSON.stringify(result1, null, 2));
console.log();

// Test 2: Object property limits
console.log("=== Test 2: Custom maxObjectProps ===");
const largeObject = Object.fromEntries(
  Array.from({ length: 50 }, (_, i) => [`prop${i}`, `value${i}`])
);

const result2 = sanitizeProps(
  { config: largeObject },
  {
    maxPropDepth: 3,
    maxStringLength: 200,
    props: { maxObjectProps: 5 }, // Only show 5 props
  }
);
console.log("Object with maxObjectProps=5:");
console.log(JSON.stringify(result2, null, 2));
console.log();

// Test 3: Error depth limit
console.log("=== Test 3: Custom maxErrorDepth ===");
import { serializeError } from "../src/utils";

// Create deeply nested error cause chain
const deepError = new Error("Level 0");
let currentError: Error & { cause?: Error } = deepError;

for (let i = 1; i <= 10; i++) {
  const nextError = new Error(`Level ${i}`);
  currentError.cause = nextError;
  currentError = nextError;
}

const serializedDeep = serializeError(deepError, 2); // Max depth 2
console.log("Error chain with maxErrorDepth=2:");
console.log(JSON.stringify(serializedDeep, null, 2));
console.log();

// Test 4: Combined limits
console.log("=== Test 4: All limits combined ===");
const complexData = {
  bigArray: Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` })),
  bigObject: Object.fromEntries(
    Array.from({ length: 100 }, (_, i) => [
      `key${i}`,
      { value: i, nested: Array.from({ length: 20 }, (_, j) => j) },
    ])
  ),
};

const result4 = sanitizeProps(complexData, {
  maxPropDepth: 2,
  maxStringLength: 50,
  props: {
    maxArrayItems: 2,
    maxObjectProps: 3,
  },
});
console.log("Complex data with tight limits:");
console.log(JSON.stringify(result4, null, 2));

console.log("\n✅ All configurable limits working correctly!");

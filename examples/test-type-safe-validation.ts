/**
 * Test type-safe validation with constants
 */

import { configure } from "../src/index";

console.log("Testing type-safe validation\n");

// Test 1: Valid log level
console.log("=== Test 1: Valid log level ===");
configure({ logLevel: "info" });
console.log("✓ Valid log level 'info' accepted\n");

// Test 2: Invalid log level (TypeScript should catch this at compile time)
console.log("=== Test 2: Invalid log level (runtime check) ===");
configure({ logLevel: "verbose" as any }); // Force invalid value
console.log("Warning should appear above for invalid log level\n");

// Test 3: Valid output format
console.log("=== Test 3: Valid output format ===");
configure({ outputFormat: "json" });
console.log("✓ Valid output format 'json' accepted\n");

// Test 4: Invalid output format
console.log("=== Test 4: Invalid output format (runtime check) ===");
configure({ outputFormat: "xml" as any }); // Force invalid value
console.log("Warning should appear above for invalid output format\n");

// Test 5: Custom format (should be allowed)
console.log("=== Test 5: Custom output format ===");
configure({ outputFormat: "custom" });
console.log("✓ Custom output format accepted (no warning expected)\n");

console.log("✅ Type-safe validation complete!");
console.log("\nBenefits:");
console.log("  • TypeScript autocomplete for valid values");
console.log("  • Compile-time type checking");
console.log("  • Runtime validation with type-safe constants");
console.log("  • Single source of truth for valid values");

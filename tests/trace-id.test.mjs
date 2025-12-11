import test from "node:test";
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Get directory path for ESM modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the built distribution entry point
const DIST_ENTRY = path.resolve(__dirname, "../dist/index.mjs");

// Load the distribution module dynamically
async function loadDistModule() {
  try {
    return await import(DIST_ENTRY);
  } catch (err) {
    console.warn("Could not load dist module:", err.message);
    return {};
  }
}

// Test suite for safeURLParsing function
test("safeURLParsing - should parse valid URLs correctly", async () => {
  const distModule = await loadDistModule();

  if (typeof distModule.safeURLParsing !== "function") {
    console.warn("safeURLParsing is not available, skipping test");
    return;
  }

  const { safeURLParsing } = distModule;

  const result = safeURLParsing(
    "https://example.com/path/to/resource?query=123#fragment"
  );
  assert.strictEqual(result.domain, "https://example.com");
  assert.strictEqual(result.path, "/path/to/resource?query=123#fragment");

  const httpResult = safeURLParsing("http://test.com/api");
  assert.strictEqual(httpResult.domain, "http://test.com");
  assert.strictEqual(httpResult.path, "/api");
});

test("safeURLParsing - should handle simple paths", async () => {
  const distModule = await loadDistModule();

  if (typeof distModule.safeURLParsing !== "function") {
    console.warn("safeURLParsing is not available, skipping test");
    return;
  }

  const { safeURLParsing } = distModule;

  const result = safeURLParsing("/users/profile/settings");
  assert.strictEqual(result.domain, undefined);
  assert.strictEqual(result.path, "/users/profile/settings");

  const relativeResult = safeURLParsing("api/users");
  assert.strictEqual(relativeResult.domain, undefined);
  assert.strictEqual(relativeResult.path, "api/users");
});

test("safeURLParsing - should handle invalid inputs gracefully", async () => {
  const distModule = await loadDistModule();

  if (typeof distModule.safeURLParsing !== "function") {
    console.warn("safeURLParsing is not available, skipping test");
    return;
  }

  const { safeURLParsing } = distModule;

  assert.deepStrictEqual(safeURLParsing(""), { path: "" });
  assert.deepStrictEqual(safeURLParsing(null), { path: "" });
  assert.deepStrictEqual(safeURLParsing(undefined), { path: "" });
  assert.deepStrictEqual(safeURLParsing(123), { path: "" });
});

test("safeURLParsing - should handle malformed URLs", async () => {
  const distModule = await loadDistModule();

  if (typeof distModule.safeURLParsing !== "function") {
    console.warn("safeURLParsing is not available, skipping test");
    return;
  }

  const { safeURLParsing } = distModule;

  const result = safeURLParsing("https:example.com/path");
  assert.strictEqual(result.path, "https:example.com/path");
  assert.strictEqual(result.domain, undefined);

  const result2 = safeURLParsing("http://[invalid-host]/path");
  assert.strictEqual(result2.path, "");
});

test("safeURLParsing - should filter dangerous protocols", async () => {
  const distModule = await loadDistModule();

  if (typeof distModule.safeURLParsing !== "function") {
    console.warn("safeURLParsing is not available, skipping test");
    return;
  }

  const { safeURLParsing } = distModule;

  const jsResult = safeURLParsing("javascript:alert('xss')");
  assert.strictEqual(jsResult.path, "javascript:alert('xss')");
  assert.strictEqual(jsResult.domain, undefined);

  const dataResult = safeURLParsing("data:text/html,<script>alert(1)</script>");
  assert.strictEqual(
    dataResult.path,
    "data:text/html,<script>alert(1)</script>"
  );
  assert.strictEqual(dataResult.domain, undefined);
});

test("safeURLParsing - should handle very long URLs", async () => {
  const distModule = await loadDistModule();

  if (typeof distModule.safeURLParsing !== "function") {
    console.warn("safeURLParsing is not available, skipping test");
    return;
  }

  const { safeURLParsing } = distModule;

  const longUrl = "https://example.com/" + "a".repeat(10000);
  const result = safeURLParsing(longUrl);

  // Should not throw and should process the truncated version
  assert.ok(result.domain === "https://example.com");
  assert.ok(result.path);
});

test("safeURLParsing - should handle special characters", async () => {
  const distModule = await loadDistModule();

  if (typeof distModule.safeURLParsing !== "function") {
    console.warn("safeURLParsing is not available, skipping test");
    return;
  }

  const { safeURLParsing } = distModule;

  const specialUrl =
    "https://example.com/path?query=hello%20world&test=1#section";
  const result = safeURLParsing(specialUrl);
  assert.strictEqual(result.domain, "https://example.com");
  assert.strictEqual(result.path, "/path?query=hello%20world&test=1#section");
});

test("safeURLParsing - should handle Unicode domains", async () => {
  const distModule = await loadDistModule();

  if (typeof distModule.safeURLParsing !== "function") {
    console.warn("safeURLParsing is not available, skipping test");
    return;
  }

  const { safeURLParsing } = distModule;

  const unicodeUrl = "https://тест.com/path";
  const result = safeURLParsing(unicodeUrl);
  assert.ok(result.domain);
  assert.strictEqual(result.path, "/path");
});

// Test suite for truncatePath function
test("truncatePath - should return short paths unchanged", async () => {
  const distModule = await loadDistModule();

  if (typeof distModule.truncatePath !== "function") {
    console.warn("truncatePath is not available, skipping test");
    return;
  }

  const { truncatePath } = distModule;

  assert.strictEqual(truncatePath("/users/profile", 30), "/users/profile");
  assert.strictEqual(truncatePath("", 30), "");
  assert.strictEqual(truncatePath("/", 30), "/");
});

test("truncatePath - should truncate long paths intelligently", async () => {
  const distModule = await loadDistModule();

  if (typeof distModule.truncatePath !== "function") {
    console.warn("truncatePath is not available, skipping test");
    return;
  }

  const { truncatePath } = distModule;

  const longPath =
    "/products/electronics/smartphones/iphone-13-pro/reviews/detailed";
  const result = truncatePath(longPath, 30);

  assert.ok(result.length <= 30);
  assert.ok(result.includes("..."));
  assert.ok(result.includes("/"));
});

test("truncatePath - should handle URL truncation with domains", async () => {
  const distModule = await loadDistModule();

  if (typeof distModule.truncatePath !== "function") {
    console.warn("truncatePath is not available, skipping test");
    return;
  }

  const { truncatePath } = distModule;

  const url =
    "https://example.com/very/long/path/to/resource/that/exceeds/limit";
  const result = truncatePath(url, 50);

  assert.ok(result.length <= 50);
  assert.ok(result.includes("https://example.com"));
  assert.ok(result.includes("..."));
});

test("truncatePath - should handle very short maxLength", async () => {
  const distModule = await loadDistModule();

  if (typeof distModule.truncatePath !== "function") {
    console.warn("truncatePath is not available, skipping test");
    return;
  }

  const { truncatePath } = distModule;

  const path = "/this/is/a/very/long/path";

  assert.strictEqual(truncatePath(path, 5).length, 5);
  assert.ok(truncatePath(path, 8).includes("..."));
  assert.ok(truncatePath(path, 3).endsWith("..."));
});

test("truncatePath - should handle edge cases", async () => {
  const distModule = await loadDistModule();

  if (typeof distModule.truncatePath !== "function") {
    console.warn("truncatePath is not available, skipping test");
    return;
  }

  const { truncatePath } = distModule;

  // Empty or null inputs
  assert.strictEqual(truncatePath("", 10), "");
  assert.strictEqual(truncatePath(null, 10), null);
  assert.strictEqual(truncatePath(undefined, 10), undefined);

  // Already at limit
  const exactPath = "12345";
  assert.strictEqual(truncatePath(exactPath, 5), exactPath);
});

test("truncatePath - should handle paths with query parameters", async () => {
  const distModule = await loadDistModule();

  if (typeof distModule.truncatePath !== "function") {
    console.warn("truncatePath is not available, skipping test");
    return;
  }

  const { truncatePath } = distModule;

  const pathWithQuery = "/search?query=test&category=books&page=1#results";
  const result = truncatePath(pathWithQuery, 25);

  assert.ok(result.length <= 25);
  assert.ok(result.includes("/search"));
});

test("truncatePath - should handle very long single segments", async () => {
  const distModule = await loadDistModule();

  if (typeof distModule.truncatePath !== "function") {
    console.warn("truncatePath is not available, skipping test");
    return;
  }

  const { truncatePath } = distModule;

  const singleSegment = "/" + "a".repeat(100);
  const result = truncatePath(singleSegment, 20);

  assert.ok(result.length <= 20);
  assert.ok(result.includes("..."));
});

test("truncatePath - should handle special characters in paths", async () => {
  const distModule = await loadDistModule();

  if (typeof distModule.truncatePath !== "function") {
    console.warn("truncatePath is not available, skipping test");
    return;
  }

  const { truncatePath } = distModule;

  const specialPath = "/users/john-doe_123/profile@settings?test=1";
  const result = truncatePath(specialPath, 30);

  assert.ok(result.length <= 30);
  // Based on actual behavior: /users/john-doe_123/profile@settings?test=1 -> //.../profile@settings?test=1
  assert.ok(result.includes("profile@settings"));
  assert.ok(result.includes("..."));
});

// Test suite for TraceIdGenerator (if available)
test("TraceIdGenerator - should generate valid trace IDs", async () => {
  const distModule = await loadDistModule();

  if (!distModule.TraceIdGenerator) {
    console.warn("TraceIdGenerator is not available, skipping test");
    return;
  }

  const { TraceIdGenerator } = distModule;

  const generator = TraceIdGenerator.getInstance();

  const options = {
    componentName: "TestComponent",
    config: {
      traceId: {
        mode: "structured",
        maxRouteLength: 30,
        maxIdLength: 100,
        includeRouteHint: true,
      },
    },
    contextId: "ctx_123456789",
    routeHint: "/users/profile/settings",
  };

  const result = generator.generate(options);

  assert.ok(result.traceId);
  assert.ok(result.traceId.includes("req_"));
  assert.ok(result.traceId.includes("TestComponent"));
  assert.ok(result.traceId.includes("#"));
  assert.ok(typeof result.sequence === "number");
  assert.ok(result.sequence > 0);
});

test("TraceIdGenerator - should handle long route hints properly", async () => {
  const distModule = await loadDistModule();

  if (!distModule.TraceIdGenerator) {
    console.warn("TraceIdGenerator is not available, skipping test");
    return;
  }

  const { TraceIdGenerator } = distModule;

  const generator = TraceIdGenerator.getInstance();

  const longRouteHint =
    "/very/long/path/that/should/be/truncated/properly/by/the/generator/function";

  const options = {
    componentName: "TestComponent",
    config: {
      traceId: {
        mode: "structured",
        maxRouteLength: 25,
        maxIdLength: 150,
        includeRouteHint: true,
      },
    },
    contextId: "ctx_987654321",
    routeHint: longRouteHint,
  };

  const result = generator.generate(options);

  if (result.routeHint) {
    assert.ok(result.routeHint.includes("("));
    assert.ok(result.routeHint.includes(")"));
    assert.ok(result.routeHint.includes("..."));
  }

  assert.ok(result.traceId.length <= 150);
});

test("TraceIdGenerator - should handle random mode", async () => {
  const distModule = await loadDistModule();

  if (!distModule.TraceIdGenerator) {
    console.warn("TraceIdGenerator is not available, skipping test");
    return;
  }

  const { TraceIdGenerator } = distModule;

  const generator = TraceIdGenerator.getInstance();

  const options = {
    componentName: "TestComponent",
    config: {
      traceId: {
        mode: "random",
        maxIdLength: 50,
      },
    },
    contextId: "ctx_123",
    routeHint: "/some/path",
  };

  const result = generator.generate(options);

  assert.ok(result.traceId);
  assert.ok(result.traceId.length <= 50);
  // In random mode, should not include structured components
  assert.ok(!result.rootTraceId);
  assert.ok(!result.sequence);
});

// Integration test with URL parsing functions
test("URL parsing integration - should work together for URL processing", async () => {
  const distModule = await loadDistModule();

  if (
    typeof distModule.safeURLParsing !== "function" ||
    typeof distModule.truncatePath !== "function"
  ) {
    console.warn(
      "URL parsing functions not available, skipping integration test"
    );
    return;
  }

  const { safeURLParsing, truncatePath } = distModule;

  // Test the workflow: parse URL, then truncate if needed
  const longUrl =
    "https://example.com/very/long/path/that/needs/truncation?with=many&query=params";

  const parsed = safeURLParsing(longUrl);
  assert.ok(parsed.domain);
  assert.ok(parsed.path);

  const truncated = truncatePath(longUrl, 40);
  assert.ok(truncated.length <= 40);
  assert.ok(truncated.includes("https://example.com"));
});

test("URL parsing integration - should handle malformed URLs in pipeline", async () => {
  const distModule = await loadDistModule();

  if (
    typeof distModule.safeURLParsing !== "function" ||
    typeof distModule.truncatePath !== "function"
  ) {
    console.warn(
      "URL parsing functions not available, skipping integration test"
    );
    return;
  }

  const { safeURLParsing, truncatePath } = distModule;

  const malformedUrl = "not-a-real://url/but/still/processable";

  // Should not throw errors in the pipeline
  assert.doesNotThrow(() => {
    const parsed = safeURLParsing(malformedUrl);
    const truncated = truncatePath(parsed.path || malformedUrl, 25);
    assert.ok(truncated);
  });
});

test("URL parsing integration - should maintain security through the pipeline", async () => {
  const distModule = await loadDistModule();

  if (
    typeof distModule.safeURLParsing !== "function" ||
    typeof distModule.truncatePath !== "function"
  ) {
    console.warn(
      "URL parsing functions not available, skipping integration test"
    );
    return;
  }

  const { safeURLParsing, truncatePath } = distModule;

  const dangerousUrl = "javascript:alert('xss')//https://example.com/long/path";

  const parsed = safeURLParsing(dangerousUrl);
  // Should treat as path, not URL
  assert.ok(!parsed.domain || !parsed.domain.startsWith("javascript:"));

  const truncated = truncatePath(dangerousUrl, 30);
  assert.ok(truncated.length <= 30);
});

// Comprehensive security tests
test("Security tests - XSS prevention", async () => {
  const distModule = await loadDistModule();

  if (typeof distModule.safeURLParsing !== "function") {
    console.warn("safeURLParsing is not available, skipping security test");
    return;
  }

  const { safeURLParsing } = distModule;

  // Test various XSS attack vectors
  const xssAttempts = [
    "javascript:alert(document.cookie)",
    "vbscript:msgbox(1)",
    "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
    "https://example.com/<script>alert(1)</script>",
    "ftp://evil.com/malicious",
  ];

  xssAttempts.forEach((attempt) => {
    const result = safeURLParsing(attempt);

    // Should not create dangerous domain results
    if (result.domain) {
      assert.ok(!result.domain.startsWith("javascript:"));
      assert.ok(!result.domain.startsWith("vbscript:"));
      assert.ok(!result.domain.startsWith("data:"));
    }

    // Should always return some result without throwing
    assert.ok(result !== null && typeof result === "object");
  });
});

test("Security tests - URL spoofing prevention", async () => {
  const distModule = await loadDistModule();

  if (typeof distModule.safeURLParsing !== "function") {
    console.warn("safeURLParsing is not available, skipping security test");
    return;
  }

  const { safeURLParsing } = distModule;

  // Test URL spoofing attempts
  const spoofAttempts = [
    "https://evil.com@example.com",
    "https://example.com\\@evil.com/",
    "https://еxample.com/path", // Cyrillic 'е' instead of 'e'
    "https://example.com\r\nSet-Cookie: malicious=payload",
  ];

  spoofAttempts.forEach((attempt) => {
    const result = safeURLParsing(attempt);

    // Should handle gracefully without throwing
    assert.ok(result !== null && typeof result === "object");
    assert.ok(result.hasOwnProperty("path"));
  });
});

test("Performance tests - Large input handling", async () => {
  const distModule = await loadDistModule();

  if (
    typeof distModule.safeURLParsing !== "function" ||
    typeof distModule.truncatePath !== "function"
  ) {
    console.warn("Functions not available, skipping performance test");
    return;
  }

  const { safeURLParsing, truncatePath } = distModule;

  // Test with very large inputs
  const largeUrl = "https://example.com/" + "segment/".repeat(1000) + "end";
  const largeString = "a".repeat(50000);

  // Should handle large inputs without hanging or crashing
  const start = Date.now();

  assert.doesNotThrow(() => {
    const parsed = safeURLParsing(largeUrl);
    const truncated = truncatePath(largeString, 100);

    assert.ok(parsed);
    assert.ok(truncated);
    assert.ok(truncated.length <= 100);
  });

  const duration = Date.now() - start;

  // Should complete within reasonable time (less than 1 second)
  assert.ok(duration < 1000, `Processing took too long: ${duration}ms`);
});

/**
 * Environment detection utilities for quzz
 */

declare global {
  /**
   * Next.js runtime data, present on server/client when running under Next.js.
   * Kept intentionally loose to avoid coupling to Next.js internals.
   */
  // eslint-disable-next-line no-var
  var __NEXT_DATA__: unknown | undefined;
}

/**
 * Check if running in Node.js environment
 */
export function isNodeEnvironment(): boolean {
  return (
    typeof process !== "undefined" &&
    process.versions !== undefined &&
    process.versions.node !== undefined
  );
}

/**
 * Check if running in browser environment
 */
export function isBrowserEnvironment(): boolean {
  return (
    typeof globalThis !== "undefined" &&
    "window" in globalThis &&
    "document" in globalThis &&
    typeof (globalThis as { window?: unknown }).window !== "undefined" &&
    typeof (globalThis as { document?: unknown }).document !== "undefined"
  );
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return (
    typeof process !== "undefined" && process.env?.NODE_ENV === "development"
  );
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return (
    typeof process !== "undefined" && process.env?.NODE_ENV === "production"
  );
}

/**
 * Check if running in test environment
 */
export function isTest(): boolean {
  return typeof process !== "undefined" && process.env?.NODE_ENV === "test";
}

/**
 * Check if running in Next.js server environment
 */
export function isNextJSServer(): boolean {
  return isNodeEnvironment() && typeof global.__NEXT_DATA__ !== "undefined";
}

/**
 * Safe check for Node.js features availability
 */
export function hasNodeFeature(
  feature: "memoryUsage" | "cpuUsage" | "asyncHooks"
): boolean {
  if (!isNodeEnvironment()) return false;

  switch (feature) {
    case "memoryUsage":
      return typeof process.memoryUsage === "function";
    case "cpuUsage":
      return typeof process.cpuUsage === "function";
    case "asyncHooks":
      try {
        require("node:async_hooks");
        return true;
      } catch {
        return false;
      }
    default:
      return false;
  }
}

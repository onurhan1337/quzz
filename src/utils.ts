import type { ComponentType } from "react";
import type { SerializedError, PropsConfig } from "./types";

const DEFAULT_SENSITIVE_KEYS = [
  "password",
  "passwd",
  "pwd",
  "token",
  "secret",
  "apikey",
  "api_key",
  "accesstoken",
  "access_token",
  "sessionid",
  "session_id",
  "authorization",
  "auth",
  "bearer",
  "credential",
  "privatekey",
  "private_key",
];

/**
 * Type guard to check if a value is a Promise
 */
function isPromise(value: unknown): value is Promise<unknown> {
  return (
    value instanceof Promise ||
    (typeof value === "object" &&
      value !== null &&
      "then" in value &&
      typeof value.then === "function" &&
      "catch" in value &&
      typeof value.catch === "function")
  );
}

/**
 * Object with potential type metadata
 */
interface ObjectWithMetadata {
  constructor?: { name?: string };
  __typename?: string;
}

/**
 * Extract type hint from a Promise by inspecting its properties
 * This is a best-effort approach to provide helpful debugging info
 */
function inferPromiseType(promise: Promise<unknown>): string {
  try {
    const promiseObj = promise as ObjectWithMetadata;

    if (
      promiseObj.constructor?.name &&
      promiseObj.constructor.name !== "Promise"
    ) {
      return promiseObj.constructor.name;
    }

    if (promiseObj.__typename) {
      return promiseObj.__typename;
    }

    const promiseStr = String(promise);
    if (promiseStr.includes("params") || promiseStr.includes("searchParams")) {
      return "PageProps";
    }

    return "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Error result from a Promise that failed or timed out
 */
interface PromiseErrorResult {
  __error: string;
}

/**
 * Await a Promise with timeout to prevent hanging
 */
async function awaitWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T | PromiseErrorResult> {
  let timeoutId: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<PromiseErrorResult>((resolve) => {
    timeoutId = setTimeout(() => {
      resolve({ __error: `Promise timeout after ${timeoutMs}ms` });
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    return result;
  } catch (error) {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    return {
      __error: error instanceof Error ? error.message : "Promise rejection",
    };
  }
}

/**
 * Configuration for sanitizing props
 */
export interface SanitizePropsConfig {
  maxPropDepth?: number;
  maxStringLength?: number;
  sensitiveKeys?: string[];
  props?: PropsConfig;
}

/**
 * Type handlers for safe stringify
 */
const stringifyHandlers = {
  primitive: (val: unknown): string | null => {
    if (val === null) return "null";
    if (val === undefined) return "undefined";
    if (typeof val === "string") return JSON.stringify(val);
    if (typeof val === "number" || typeof val === "boolean") return String(val);
    if (typeof val === "bigint") return `${val}n`;
    if (typeof val === "symbol") return val.toString();
    if (typeof val === "function")
      return `[Function: ${(val as Function).name || "anonymous"}]`;
    return null;
  },

  special: (val: unknown, showPromiseTypes: boolean): string | null => {
    if (val instanceof Date) return `"${val.toISOString()}"`;
    if (val instanceof RegExp) return `"${val.toString()}"`;
    if (val instanceof Error) return `"[Error: ${val.message}]"`;

    if (isPromise(val)) {
      if (showPromiseTypes) {
        const typeHint = inferPromiseType(val);
        return typeHint !== "unknown"
          ? `"[Promise<${typeHint}>]"`
          : '"[Promise]"';
      }
      return '"[Promise]"';
    }

    return null;
  },
};

/**
 * Safe stringify that handles circular references, Promises, and complex types
 * Zero dependencies - custom implementation
 */
export function safeStringify(
  value: unknown,
  options: {
    maxDepth?: number;
    showPromiseTypes?: boolean;
  } = {}
): string {
  const maxDepth = options.maxDepth ?? 3;
  const showPromiseTypes = options.showPromiseTypes ?? true;
  const seen = new WeakSet<object>();

  function stringify(val: unknown, depth: number): string {
    const primitive = stringifyHandlers.primitive(val);
    if (primitive !== null) return primitive;

    if (depth >= maxDepth) return '"[Max Depth]"';

    const special = stringifyHandlers.special(val, showPromiseTypes);
    if (special !== null) return special;

    if (typeof val === "object" && val !== null) {
      if (seen.has(val)) return '"[Circular]"';

      seen.add(val);
      try {
        if (Array.isArray(val)) {
          const items = val.map((item) => stringify(item, depth + 1));
          return `[${items.join(",")}]`;
        }

        const entries = Object.entries(val)
          .map(([k, v]) => `${JSON.stringify(k)}:${stringify(v, depth + 1)}`)
          .join(",");
        return `{${entries}}`;
      } finally {
        seen.delete(val);
      }
    }

    return '"[Unknown]"';
  }

  try {
    return stringify(value, 0);
  } catch (error) {
    return `"[Stringify Error: ${error instanceof Error ? error.message : "Unknown"}]"`;
  }
}

/**
 * Helper to check if a result is a Promise error
 */
function isPromiseErrorResult(value: unknown): value is PromiseErrorResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "__error" in value &&
    typeof (value as PromiseErrorResult).__error === "string"
  );
}

/**
 * Sanitize props with configurable depth and truncation
 * Supports async mode for awaiting Promise props (Next.js 15+)
 */
export function sanitizeProps(
  props: Record<string, unknown>,
  config: SanitizePropsConfig
): Record<string, unknown> {
  const maxDepth = config.maxPropDepth ?? 3;
  const maxLength = config.maxStringLength ?? 200;
  const maxArrayItems = config.props?.maxArrayItems ?? 10;
  const maxObjectProps = config.props?.maxObjectProps ?? 20;
  const sensitiveKeys: readonly string[] = [
    ...DEFAULT_SENSITIVE_KEYS,
    ...(config.sensitiveKeys ?? []),
  ];
  const showPromiseTypes = config.props?.showPromiseTypes ?? true;

  const seen = new WeakSet<object>();

  function sanitizeValue(
    value: unknown,
    key?: string,
    depth: number = 0
  ): unknown {
    // Check sensitive keys
    if (
      key &&
      sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))
    ) {
      return "[REDACTED]";
    }

    // Check depth limit
    if (depth > maxDepth) {
      return "[Max Depth Exceeded]";
    }

    // Handle primitives
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === "string") {
      return value.length > maxLength
        ? `${value.substring(0, maxLength)}... [truncated]`
        : value;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return value;
    }

    if (typeof value === "bigint") {
      return `[BigInt: ${value.toString()}]`;
    }

    if (typeof value === "function") {
      const fnName = value.name || "anonymous";
      return `[Function: ${fnName}]`;
    }

    if (typeof value === "symbol") {
      return `[Symbol: ${value.toString()}]`;
    }

    // Handle special objects
    if (value instanceof Date) {
      return value.toISOString();
    }

    if (value instanceof Error) {
      return `[Error: ${value.message}]`;
    }

    if (value instanceof RegExp) {
      return `[RegExp: ${value.toString()}]`;
    }

    if (isPromise(value)) {
      if (showPromiseTypes) {
        const typeHint = inferPromiseType(value);
        return typeHint !== "unknown" ? `[Promise<${typeHint}>]` : "[Promise]";
      }
      return "[Promise]";
    }

    // Handle objects and arrays
    if (typeof value === "object") {
      // Circular reference check
      if (seen.has(value as object)) {
        return "[Circular Reference]";
      }
      seen.add(value as object);

      // Arrays
      if (Array.isArray(value)) {
        const items = value
          .slice(0, maxArrayItems)
          .map((item) => sanitizeValue(item, undefined, depth + 1));
        if (value.length > maxArrayItems) {
          items.push(`... [${value.length - maxArrayItems} more items]`);
        }
        return items;
      }

      // Plain objects
      const sanitizedObj: Record<string, unknown> = {};
      const entries = Object.entries(value);

      for (const [k, v] of entries.slice(0, maxObjectProps)) {
        sanitizedObj[k] = sanitizeValue(v, k, depth + 1);
      }

      if (entries.length > maxObjectProps) {
        sanitizedObj["..."] =
          `[${entries.length - maxObjectProps} more properties]`;
      }

      return sanitizedObj;
    }

    return String(value);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    sanitized[key] = sanitizeValue(value, key, 0);
  }

  return sanitized;
}

/**
 * Async version of sanitizeProps that can await Promise values
 * Use with caution - may trigger side effects and slow down rendering
 */
export async function sanitizePropsAsync(
  props: Record<string, unknown>,
  config: SanitizePropsConfig
): Promise<Record<string, unknown>> {
  const maxDepth = config.maxPropDepth ?? 3;
  const maxLength = config.maxStringLength ?? 200;
  const maxArrayItems = config.props?.maxArrayItems ?? 10;
  const maxObjectProps = config.props?.maxObjectProps ?? 20;
  const sensitiveKeys: readonly string[] = [
    ...DEFAULT_SENSITIVE_KEYS,
    ...(config.sensitiveKeys ?? []),
  ];
  const showPromiseTypes = config.props?.showPromiseTypes ?? true;
  const awaitTimeout = config.props?.awaitTimeout ?? 5000;

  const seen = new WeakSet<object>();

  async function sanitizeValueAsync(
    value: unknown,
    key?: string,
    depth: number = 0
  ): Promise<unknown> {
    // Check sensitive keys
    if (
      key &&
      sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))
    ) {
      return "[REDACTED]";
    }

    // Check depth limit
    if (depth > maxDepth) {
      return "[Max Depth Exceeded]";
    }

    // Handle primitives
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === "string") {
      return value.length > maxLength
        ? `${value.substring(0, maxLength)}... [truncated]`
        : value;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return value;
    }

    if (typeof value === "bigint") {
      return `[BigInt: ${value.toString()}]`;
    }

    if (typeof value === "function") {
      const fnName = value.name || "anonymous";
      return `[Function: ${fnName}]`;
    }

    if (typeof value === "symbol") {
      return `[Symbol: ${value.toString()}]`;
    }

    // Handle special objects
    if (value instanceof Date) {
      return value.toISOString();
    }

    if (value instanceof Error) {
      return `[Error: ${value.message}]`;
    }

    if (value instanceof RegExp) {
      return `[RegExp: ${value.toString()}]`;
    }

    // Handle Promise - await it with timeout
    if (isPromise(value)) {
      try {
        const result = await awaitWithTimeout(value, awaitTimeout);

        // Check if timeout or error occurred using type guard
        if (isPromiseErrorResult(result)) {
          // Show error with type hint if available
          const typeHint = showPromiseTypes
            ? inferPromiseType(value)
            : "unknown";
          return typeHint !== "unknown"
            ? `[Promise<${typeHint}>: ${result.__error}]`
            : `[Promise: ${result.__error}]`;
        }

        // Successfully resolved - sanitize the resolved value
        return sanitizeValueAsync(result, key, depth + 1);
      } catch (error) {
        const typeHint = showPromiseTypes ? inferPromiseType(value) : "unknown";
        const errorMsg =
          error instanceof Error ? error.message : "Failed to resolve";
        return typeHint !== "unknown"
          ? `[Promise<${typeHint}>: Error - ${errorMsg}]`
          : `[Promise: Error - ${errorMsg}]`;
      }
    }

    // Handle objects and arrays
    if (typeof value === "object") {
      // Circular reference check
      if (seen.has(value as object)) {
        return "[Circular Reference]";
      }
      seen.add(value as object);

      // Arrays
      if (Array.isArray(value)) {
        const items = await Promise.all(
          value
            .slice(0, maxArrayItems)
            .map((item) => sanitizeValueAsync(item, undefined, depth + 1))
        );
        if (value.length > maxArrayItems) {
          items.push(`... [${value.length - maxArrayItems} more items]`);
        }
        return items;
      }

      // Plain objects
      const sanitizedObj: Record<string, unknown> = {};
      const entries = Object.entries(value);

      for (const [k, v] of entries.slice(0, maxObjectProps)) {
        sanitizedObj[k] = await sanitizeValueAsync(v, k, depth + 1);
      }

      if (entries.length > maxObjectProps) {
        sanitizedObj["..."] =
          `[${entries.length - maxObjectProps} more properties]`;
      }

      return sanitizedObj;
    }

    return String(value);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    sanitized[key] = await sanitizeValueAsync(value, key, 0);
  }

  return sanitized;
}

/**
 * Error with additional metadata (Next.js, React)
 */
interface ErrorWithMetadata extends Error {
  digest?: string;
  code?: string | number;
  componentStack?: string;
}

/**
 * Serialize error with all available information and depth control for cause chains
 */
export function serializeError(
  error: Error,
  maxDepth: number = 3,
  currentDepth: number = 0
): SerializedError {
  const serialized: SerializedError = {
    message: error.message,
    name: error.name,
    stack: error.stack,
  };

  const errorWithMeta = error as ErrorWithMetadata;

  // Next.js error digest
  if (errorWithMeta.digest !== undefined) {
    serialized.digest = errorWithMeta.digest;
  }

  // Error code
  if (errorWithMeta.code !== undefined) {
    serialized.code = errorWithMeta.code;
  }

  // Component stack (React)
  if (errorWithMeta.componentStack !== undefined) {
    serialized.componentStack = errorWithMeta.componentStack;
  }

  // Error cause (ES2022) with depth control to prevent recursive explosion
  if ("cause" in error && error.cause !== undefined) {
    if (currentDepth >= maxDepth) {
      serialized.cause = "[Max depth reached for error cause chain]";
    } else if (error.cause instanceof Error) {
      serialized.cause = serializeError(
        error.cause,
        maxDepth,
        currentDepth + 1
      );
    } else {
      serialized.cause = String(error.cause);
    }
  }

  return serialized;
}

/**
 * Format stack trace with smart filtering
 */
export function formatStackTrace(
  stack?: string,
  includeNodeModules: boolean = false
): string {
  if (!stack) return "";

  const lines = stack.split("\n");
  let filtered = lines;

  if (!includeNodeModules) {
    filtered = lines.filter(
      (line) =>
        !line.includes("node_modules") &&
        !line.includes("webpack-internal") &&
        !line.includes("node:internal")
    );
  }

  // Highlight application code
  const formatted = filtered.slice(0, 10).map((line) => {
    // Extract file path and line number
    const match = line.match(/\((.+):(\d+):(\d+)\)/);
    if (match) {
      const [, path] = match;
      const fileName = path.split("/").pop();
      return `  at ${line.split("at ")[1]?.replace(path, fileName || path) || line}`;
    }
    return line;
  });

  return formatted.join("\n");
}

/**
 * Get component name with fallback
 */
export function getComponentName(Component: ComponentType<unknown>): string {
  return Component.displayName || Component.name || "AnonymousComponent";
}

/**
 * Check if code is running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Safely get stack trace from current location
 */
export function captureStackTrace(): string | undefined {
  const error = new Error();
  Error.captureStackTrace?.(error, captureStackTrace);
  return error.stack;
}

/**
 * Generate unique ID with high entropy
 */
export function generateId(prefix: string = ""): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  const counter = (Math.random() * 1000).toString(36);
  return prefix
    ? `${prefix}_${timestamp}_${random}${counter}`
    : `${timestamp}_${random}${counter}`;
}

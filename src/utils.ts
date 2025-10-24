import type { ComponentType } from 'react'
import type { SerializedError, QuzzConfig } from './types'

const DEFAULT_SENSITIVE_KEYS = [
  'password',
  'passwd',
  'pwd',
  'token',
  'secret',
  'apikey',
  'api_key',
  'accesstoken',
  'access_token',
  'sessionid',
  'session_id',
  'authorization',
  'auth',
  'bearer',
  'credential',
  'privatekey',
  'private_key',
]

/**
 * Sanitize props with configurable depth and truncation
 */
export function sanitizeProps(
  props: Record<string, unknown>,
  config: Pick<QuzzConfig, 'maxPropDepth' | 'maxStringLength' | 'sensitiveKeys'>
): Record<string, unknown> {
  const maxDepth = config.maxPropDepth ?? 3
  const maxLength = config.maxStringLength ?? 200
  const sensitiveKeys = [...DEFAULT_SENSITIVE_KEYS, ...(config.sensitiveKeys || [])]

  const seen = new WeakSet()

  function sanitizeValue(value: unknown, key?: string, depth: number = 0): unknown {
    // Check sensitive keys
    if (key && sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
      return '[REDACTED]'
    }

    // Check depth limit
    if (depth > maxDepth) {
      return '[Max Depth Exceeded]'
    }

    // Handle primitives
    if (value === null || value === undefined) {
      return value
    }

    if (typeof value === 'string') {
      return value.length > maxLength ? `${value.substring(0, maxLength)}... [truncated]` : value
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return value
    }

    if (typeof value === 'bigint') {
      return `[BigInt: ${value.toString()}]`
    }

    if (typeof value === 'function') {
      const fnName = value.name || 'anonymous'
      return `[Function: ${fnName}]`
    }

    if (typeof value === 'symbol') {
      return `[Symbol: ${value.toString()}]`
    }

    // Handle special objects
    if (value instanceof Date) {
      return value.toISOString()
    }

    if (value instanceof Error) {
      return `[Error: ${value.message}]`
    }

    if (value instanceof RegExp) {
      return `[RegExp: ${value.toString()}]`
    }

    if (value instanceof Promise) {
      return '[Promise]'
    }

    // Handle objects and arrays
    if (typeof value === 'object') {
      // Circular reference check
      if (seen.has(value as object)) {
        return '[Circular Reference]'
      }
      seen.add(value as object)

      // Arrays
      if (Array.isArray(value)) {
        // Limit array length
        const maxItems = 10
        const items = value.slice(0, maxItems).map(item => sanitizeValue(item, undefined, depth + 1))
        if (value.length > maxItems) {
          items.push(`... [${value.length - maxItems} more items]`)
        }
        return items
      }

      // Plain objects
      const sanitizedObj: Record<string, unknown> = {}
      const entries = Object.entries(value)
      const maxProps = 20

      for (const [k, v] of entries.slice(0, maxProps)) {
        sanitizedObj[k] = sanitizeValue(v, k, depth + 1)
      }

      if (entries.length > maxProps) {
        sanitizedObj['...'] = `[${entries.length - maxProps} more properties]`
      }

      return sanitizedObj
    }

    return String(value)
  }

  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(props)) {
    sanitized[key] = sanitizeValue(value, key, 0)
  }

  return sanitized
}

/**
 * Serialize error with all available information
 */
export function serializeError(error: Error): SerializedError {
  const serialized: SerializedError = {
    message: error.message,
    name: error.name,
    stack: error.stack,
  }

  // Next.js error digest
  const digest = (error as any).digest
  if (digest) {
    serialized.digest = digest
  }

  // Error code
  const code = (error as any).code
  if (code) {
    serialized.code = code
  }

  // Error cause (ES2022)
  if ('cause' in error && error.cause) {
    serialized.cause = error.cause instanceof Error ? serializeError(error.cause) : String(error.cause)
  }

  // Component stack (React)
  const componentStack = (error as any).componentStack
  if (componentStack) {
    serialized.componentStack = componentStack
  }

  return serialized
}

/**
 * Format stack trace with smart filtering
 */
export function formatStackTrace(stack?: string, includeNodeModules: boolean = false): string {
  if (!stack) return ''

  const lines = stack.split('\n')
  let filtered = lines

  if (!includeNodeModules) {
    filtered = lines.filter(
      line =>
        !line.includes('node_modules') &&
        !line.includes('webpack-internal') &&
        !line.includes('node:internal')
    )
  }

  // Highlight application code
  const formatted = filtered.slice(0, 10).map(line => {
    // Extract file path and line number
    const match = line.match(/\((.+):(\d+):(\d+)\)/)
    if (match) {
      const [, path] = match
      const fileName = path.split('/').pop()
      return `  at ${line.split('at ')[1]?.replace(path, fileName || path) || line}`
    }
    return line
  })

  return formatted.join('\n')
}

/**
 * Get component name with fallback
 */
export function getComponentName(Component: ComponentType<unknown>): string {
  return Component.displayName || Component.name || 'AnonymousComponent'
}

/**
 * Check if code is running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development'
}

/**
 * Safely get stack trace from current location
 */
export function captureStackTrace(): string | undefined {
  const error = new Error()
  Error.captureStackTrace?.(error, captureStackTrace)
  return error.stack
}

/**
 * Generate unique ID with high entropy
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 9)
  const counter = (Math.random() * 1000).toString(36)
  return prefix ? `${prefix}_${timestamp}_${random}${counter}` : `${timestamp}_${random}${counter}`
}

import type { ComponentType } from 'react'
import type { RSCTraceOptions, TraceMetadata } from './types'
import { getComponentName, sanitizeProps, serializeError, generateId } from './utils'
import { ConfigManager } from './config'
import { TraceContext } from './context'
import { PerformanceMonitor } from './performance'
import { Logger } from './logger'

// Re-export types and configuration
export type {
  RSCTraceOptions,
  QuzzConfig,
  LogLevel,
  OutputFormat,
  SerializedError,
  TraceMetadata,
  LogEntry,
  PerformanceMetrics,
  TracePlugin,
  LogFormatter,
  LogTransport,
  PerformanceConfig,
} from './types'

export { configure, getConfig, resetConfig } from './config'
export { PerformanceMonitor } from './performance'

/**
 * Get performance metrics for specific component or all components
 * @param componentName - Optional component name to filter metrics
 * @returns Performance metrics object with render stats
 */
export function getMetrics(componentName?: string) {
  const monitor = PerformanceMonitor.getInstance()
  return componentName ? monitor.getMetrics(componentName) : monitor.getAllMetrics()
}

/**
 * Get aggregated performance summary across all components
 * @returns Summary with total renders, errors, and timing stats
 */
export function getPerformanceSummary() {
  return PerformanceMonitor.getInstance().getSummary()
}

/**
 * Export all performance metrics as JSON string
 * @returns Formatted JSON string with all metrics data
 */
export function exportMetrics() {
  return PerformanceMonitor.getInstance().exportMetrics()
}

/**
 * Clear all collected performance metrics
 */
export function clearMetrics() {
  PerformanceMonitor.getInstance().clear()
}

/**
 * Wraps a React Server Component with tracing capabilities
 * @param Component - The RSC to wrap
 * @param componentOptions - Optional configuration for this specific component
 * @returns Wrapped component with tracing enabled in development
 * @example
 * ```tsx
 * const TracedHeader = withRSCTrace(Header, { componentName: 'Header' })
 * ```
 */
export function withRSCTrace<P extends object>(
  Component: ComponentType<P>,
  componentOptions: RSCTraceOptions = {}
): ComponentType<P> {
  const configManager = ConfigManager.getInstance()

  // Check if tracing is enabled
  if (!configManager.isEnabled(componentOptions)) {
    return Component
  }

  // Merge configuration
  const config = configManager.mergeOptions(componentOptions)
  const componentName = componentOptions.componentName || getComponentName(Component as ComponentType<any>)
  const tags = componentOptions.tags

  // Check component filter
  if (config.componentFilter && !config.componentFilter.test(componentName)) {
    return Component
  }

  const TracedComponent = async (props: P) => {
    const logger = Logger.getInstance()
    const context = config.contextTracking ? TraceContext.getInstance() : null
    const perfMonitor = config.performance?.enabled ? PerformanceMonitor.getInstance() : null

    // Track render start time for duration calculation
    const renderStartTime = performance.now()

    // Generate trace ID
    const traceId = generateId('trace')
    const parentTraceId = context?.getCurrentParentId()

    // Initialize metadata
    const metadata: TraceMetadata = {
      componentName,
      tags,
      renderStart: Date.now(),
      traceId,
      parentTrace: parentTraceId,
    }

    // Start trace context
    if (context) {
      context.startTrace(metadata)
    }

    // Capture memory before (if enabled)
    if (config.performance?.trackMemory) {
      const memBefore = perfMonitor?.getMemoryUsage()
      if (memBefore) {
        metadata.memory = memBefore
      }
    }

    // Execute plugins: onTraceStart
    if (config.plugins) {
      await Promise.allSettled(
        config.plugins.map(plugin => plugin.onTraceStart?.(metadata))
      )
    }

    // Log trace start
    const shouldLogProps = config.logProps && !componentOptions.disable?.props

    await logger.info(componentName, `Rendering started`, metadata, tags)

    if (shouldLogProps) {
      // Execute plugins: onPropsCapture
      let capturedProps = { ...props } as Record<string, unknown>
      if (config.plugins) {
        for (const plugin of config.plugins) {
          if (plugin.onPropsCapture) {
            capturedProps = plugin.onPropsCapture(capturedProps)
          }
        }
      }

      const sanitized = sanitizeProps(capturedProps, config)
      metadata.props = sanitized
      await logger.debug(componentName, `Props captured`, { ...metadata, props: sanitized }, tags)
    }

    try {
      // Execute component
      const ComponentAny = Component as any
      const result = await Promise.resolve(ComponentAny(props))

      // Calculate duration
      const duration = performance.now() - renderStartTime
      metadata.renderEnd = Date.now()
      metadata.duration = duration

      // Update context
      if (context) {
        context.updateTrace(traceId, { duration, renderEnd: metadata.renderEnd })
      }

      // Record performance
      if (perfMonitor && !componentOptions.disable?.timing) {
        perfMonitor.recordRender(componentName, duration, false)

        // Warn if slow
        if (config.performance?.warnThreshold && perfMonitor.shouldWarn(duration, config.performance)) {
          await logger.warn(
            componentName,
            `Slow render detected: ${duration.toFixed(2)}ms`,
            metadata,
            undefined,
            tags
          )
        }
      }

      // Execute plugins: onTraceEnd
      if (config.plugins) {
        await Promise.allSettled(
          config.plugins.map(plugin => plugin.onTraceEnd?.(metadata))
        )
      }

      // Log success
      await logger.info(
        componentName,
        `Rendering completed in ${duration.toFixed(2)}ms`,
        metadata,
        tags
      )

      return result
    } catch (error) {
      const serializedError = serializeError(error as Error)
      metadata.error = serializedError

      // Record error in performance - FIX: Calculate actual duration
      if (perfMonitor && !componentOptions.disable?.timing) {
        const duration = performance.now() - renderStartTime
        metadata.duration = duration
        perfMonitor.recordRender(componentName, duration, true)
      }

      // Execute plugins: onError
      if (config.plugins) {
        await Promise.allSettled(
          config.plugins.map(plugin => plugin.onError?.(metadata, serializedError))
        )
      }

      // Log error
      if (!componentOptions.disable?.errors) {
        await logger.error(componentName, `Rendering failed: ${serializedError.message}`, metadata, serializedError, tags)
      }

      throw error
    } finally {
      // End trace context
      if (context) {
        context.endTrace(traceId)
      }
    }
  }

  TracedComponent.displayName = `withRSCTrace(${componentName})`

  return TracedComponent as any
}

export default withRSCTrace

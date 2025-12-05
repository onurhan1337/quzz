import type { ComponentType, ReactElement } from "react";
import type { RSCTraceOptions, TraceMetadata } from "./types";
import {
  getComponentName,
  sanitizeProps,
  sanitizePropsAsync,
  serializeError,
  generateId,
  processPropsWithPlugins,
} from "./utils";
import { ConfigManager } from "./config";
import { TraceContext } from "./context";
import { PerformanceMonitor } from "./performance";
import { Logger } from "./logger";
import { ContextManager } from "./storage/context-manager";

// Re-export types and configuration
export type {
  RSCTraceOptions,
  RSCBoundaryProps,
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
  PropsConfig,
  VisualizerConfig,
  PropSerializationStrategy,
  EnvConfig,
} from "./types";

export { VALID_LOG_LEVELS, VALID_OUTPUT_FORMATS } from "./types";

export type { SanitizePropsConfig } from "./utils";
export { safeStringify } from "./utils";

export {
  configure,
  getConfig,
  resetConfig,
  configurePreset,
  defineConfig,
  getPresets,
} from "./config";
export {
  hasConfigFile,
  getConfigFilePath,
  loadConfigFromFileAsync,
} from "./config-loader";
export { PerformanceMonitor } from "./performance";
export { TraceContext } from "./context";
export { RSCBoundary } from "./boundary";
export { TraceCollector } from "./visualizer/trace-collector";
export {
  createConsoleTransport,
  createFileTransport,
  createHttpTransport,
} from "./logger";
export type {
  CollectedTrace,
  TraceSession,
} from "./visualizer/trace-collector";

/**
 * Get performance metrics for specific component or all components
 * @param componentName - Optional component name to filter metrics
 * @returns Performance metrics object with render stats
 */
export function getMetrics(componentName?: string) {
  const monitor = PerformanceMonitor.getInstance();
  return componentName
    ? monitor.getMetrics(componentName)
    : monitor.getAllMetrics();
}

/**
 * Get aggregated performance summary across all components
 * @returns Summary with total renders, errors, and timing stats
 */
export function getPerformanceSummary() {
  return PerformanceMonitor.getInstance().getSummary();
}

/**
 * Export all performance metrics as JSON string
 * @returns Formatted JSON string with all metrics data
 */
export function exportMetrics() {
  return PerformanceMonitor.getInstance().exportMetrics();
}

/**
 * Clear all collected performance metrics
 */
export function clearMetrics() {
  PerformanceMonitor.getInstance().clear();
}

/**
 * Get context snapshots for debugging
 * @param storageName - Optional storage name to get snapshots from
 * @returns Array of context snapshots
 */
export function getContextSnapshots(storageName?: string) {
  const contextManager = ContextManager.getInstance();
  return contextManager.getSnapshots(storageName);
}

/**
 * Get the latest context snapshot
 * @param storageName - Optional storage name to get snapshot from
 * @returns Latest context snapshot or null
 */
export function getLatestSnapshot(storageName?: string) {
  const contextManager = ContextManager.getInstance();
  return contextManager.getLatestSnapshot(storageName);
}

/**
 * Clear all context snapshots
 * @param storageName - Optional storage name to clear snapshots from
 */
export function clearSnapshots(storageName?: string) {
  const contextManager = ContextManager.getInstance();
  contextManager.clearSnapshots(storageName);
}

/**
 * Check if context snapshot is supported
 * @returns true if AsyncLocalStorage.snapshot() is available
 */
export function isSnapshotSupported() {
  const contextManager = ContextManager.getInstance();
  return contextManager.isSnapshotSupported();
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
  const configManager = ConfigManager.getInstance();

  const isEnabled = configManager.isEnabled(componentOptions);

  if (!isEnabled) {
    return Component;
  }

  // Merge configuration
  const config = configManager.mergeOptions(componentOptions);
  const componentName =
    componentOptions.componentName ||
    getComponentName(Component as ComponentType<unknown>);
  const tags = componentOptions.tags;

  // Check component filter
  if (config.componentFilter && !config.componentFilter.test(componentName)) {
    return Component;
  }

  const TracedComponent = async (props: P) => {
    const logger = Logger.getInstance();
    const context = config.contextTracking ? TraceContext.getInstance() : null;
    const perfMonitor = config.performance?.enabled
      ? PerformanceMonitor.getInstance()
      : null;
    const contextManager = ContextManager.getInstance({
      enableSnapshots: config.enableSnapshots || config.verboseMode,
      debugMode: config.debugContext,
    });

    const traceId = generateId("trace");
    const parentTraceId = context?.getCurrentParentId();

    const metadata: TraceMetadata = {
      componentName,
      tags,
      renderStart: Date.now(),
      traceId,
      parentTrace: parentTraceId,
    };

    const executeComponent = async () => {
      if (context) {
        context.startTrace(metadata);
      }
      const renderStartTime = performance.now();

      if (config.debugContext) {
        const contextManager = ContextManager.getInstance();
        const traceStorage = contextManager.getStorage("trace");
        const currentStore = traceStorage?.getStore();
        const traceStack = contextManager.getTraceStack();
        console.debug(`[quzz:getParent] Component "${componentName}"`, {
          traceId,
          parentTraceId,
          hasStore: !!currentStore,
          traceStack,
        });
      }

      if (config.debugContext) {
        const contextInfo = context?.getCurrentContext();
        console.debug(
          `[quzz:component] Entering component "${componentName}"`,
          {
            traceId,
            parentTraceId,
            context: contextInfo,
          }
        );
      }

      if (config.verboseMode && contextManager) {
        const snapshot = contextManager.captureSnapshot({
          label: `component-enter:${componentName}`,
          maxSnapshots: 100,
        });
        if (snapshot && config.debugContext) {
          console.debug(
            `[quzz:snapshot] Captured context snapshot for component "${componentName}"`,
            {
              timestamp: new Date(snapshot.timestamp).toISOString(),
              stackDepth: snapshot.stackDepth,
            }
          );
        }
      }

      if (config.performance?.trackMemory) {
        const memBefore = perfMonitor?.getMemoryUsage();
        if (memBefore) {
          metadata.memory = memBefore;
        }
      }

      if (config.plugins) {
        await Promise.allSettled(
          config.plugins.map((plugin) => plugin.onTraceStart?.(metadata))
        );
      }

      const shouldLogProps =
        (config.logProps || config.props?.awaitProps) &&
        !componentOptions.disable?.props;

      await logger.info(componentName, `Rendering started`, metadata, tags);

      if (shouldLogProps) {
        const capturedProps = processPropsWithPlugins(
          props as Record<string, unknown>,
          config.plugins,
          config.maxPropDepth ?? 3
        );

        const sanitized = config.props?.awaitProps
          ? await sanitizePropsAsync(capturedProps, config)
          : sanitizeProps(capturedProps, config);

        metadata.props = sanitized;
        await logger.debug(
          componentName,
          `Props captured`,
          { ...metadata, props: sanitized },
          tags
        );
      }

      try {
        const ComponentFn = Component as (
          props: P
        ) => Promise<ReactElement> | ReactElement;
        const result = await Promise.resolve(ComponentFn(props));

        const duration = performance.now() - renderStartTime;
        metadata.renderEnd = Date.now();
        metadata.duration = duration;

        if (context) {
          context.updateTrace(traceId, {
            duration,
            renderEnd: metadata.renderEnd,
          });
        }

        if (perfMonitor && !componentOptions.disable?.timing) {
          perfMonitor.recordRender(componentName, duration, false);

          // Check render duration threshold
          if (
            config.performance?.warnThreshold &&
            perfMonitor.shouldWarn(duration, config.performance)
          ) {
            await logger.warn(
              componentName,
              `Slow render detected: ${duration.toFixed(2)}ms`,
              metadata,
              undefined,
              tags
            );
          }

          // Check memory threshold
          if (config.performance?.trackMemory && metadata.memory) {
            const memAfter = perfMonitor.getMemoryUsage();
            const memCheck = perfMonitor.shouldWarnMemory(
              metadata.memory,
              memAfter,
              config.performance
            );

            if (memCheck.exceeded) {
              const deltaMB = (memCheck.delta / 1024 / 1024).toFixed(2);
              await logger.warn(
                componentName,
                `High memory usage detected: +${deltaMB}MB`,
                metadata,
                undefined,
                tags
              );

              // Write heap snapshot if enabled
              if (config.performance?.enableHeapSnapshots) {
                const snapshotPath = perfMonitor.writeHeapSnapshot(
                  componentName,
                  config.performance
                );
                if (snapshotPath) {
                  await logger.info(
                    componentName,
                    `Heap snapshot saved to: ${snapshotPath}`,
                    metadata,
                    tags
                  );
                }
              }
            }
          }
        }

        if (config.plugins) {
          await Promise.allSettled(
            config.plugins.map((plugin) => plugin.onTraceEnd?.(metadata))
          );
        }

        await logger.info(
          componentName,
          `Rendering completed in ${duration.toFixed(2)}ms`,
          metadata,
          tags
        );

        if (config.debugContext) {
          console.debug(
            `[quzz:component] Exiting component "${componentName}"`,
            {
              traceId,
              duration: metadata.duration,
            }
          );
        }

        if (config.verboseMode && contextManager) {
          const snapshot = contextManager.captureSnapshot({
            label: `component-exit:${componentName}`,
            maxSnapshots: 100,
          });
          if (snapshot && config.debugContext) {
            console.debug(
              `[quzz:snapshot] Captured exit snapshot for component "${componentName}"`,
              {
                timestamp: new Date(snapshot.timestamp).toISOString(),
                duration: metadata.duration,
              }
            );
          }
        }

        return result;
      } catch (error) {
        const maxErrorDepth = config.props?.maxErrorDepth ?? 3;
        const serializedError = serializeError(error as Error, maxErrorDepth);
        metadata.error = serializedError;

        if (config.debugContext) {
          console.debug(
            `[quzz:component] Error in component "${componentName}"`,
            {
              traceId,
              error: serializedError,
              context: context?.getCurrentContext(),
            }
          );
        }

        if (config.verboseMode && contextManager) {
          const snapshot = contextManager.captureSnapshot({
            label: `component-error:${componentName}`,
            maxSnapshots: 100,
          });
          if (snapshot && config.debugContext) {
            console.debug(
              `[quzz:snapshot] Captured error snapshot for component "${componentName}"`,
              {
                timestamp: new Date(snapshot.timestamp).toISOString(),
                error: serializedError.message,
                stackDepth: snapshot.stackDepth,
              }
            );
          }
        }

        if (perfMonitor && !componentOptions.disable?.timing) {
          const duration = performance.now() - renderStartTime;
          metadata.duration = duration;
          perfMonitor.recordRender(componentName, duration, true);
        }

        if (config.plugins) {
          await Promise.allSettled(
            config.plugins.map((plugin) =>
              plugin.onError?.(metadata, serializedError)
            )
          );
        }

        if (!componentOptions.disable?.errors) {
          await logger.error(
            componentName,
            `Rendering failed: ${serializedError.message}`,
            metadata,
            serializedError,
            tags
          );
        }

        throw error;
      } finally {
        if (context) {
          context.endTrace(traceId);
        }
      }
    };

    return executeComponent();
  };

  TracedComponent.displayName = `withRSCTrace(${componentName})`;

  return TracedComponent as unknown as ComponentType<P>;
}

export default withRSCTrace;

import React from "react";
import type { RSCBoundaryProps, TraceMetadata } from "./types";
import {
  sanitizeProps,
  serializeError,
  processPropsWithPlugins,
} from "./utils";
import { ConfigManager } from "./config";
import { TraceContext } from "./context";
import { PerformanceMonitor } from "./performance";
import { Logger } from "./logger";
import { ContextManager } from "./storage/context-manager";
import { TraceIdGenerator, resolveRouteHint } from "./trace-id";

/**
 * RSCBoundary component for tracing React Server Components
 *
 * Use this as an alternative to withRSCTrace HOC when:
 * - Working with async components without default export
 * - Preferring declarative boundaries over HOCs
 * - Needing fine-grained control over trace regions
 *
 * @example
 * ```tsx
 * <RSCBoundary label="user-feed" tags={["critical", "feed"]}>
 *   <UserFeed userId={userId} />
 * </RSCBoundary>
 * ```
 */
export async function RSCBoundary({
  label,
  children,
  trackTotalLatency,
  logLevel,
  performance,
  tags,
  disable,
  ...traceOptions
}: RSCBoundaryProps) {
  const configManager = ConfigManager.getInstance();

  const componentOptions = {
    componentName: label,
    logLevel,
    performance,
    tags,
    disable,
    ...traceOptions,
  };

  if (!configManager.isEnabled(componentOptions)) {
    return <>{children}</>;
  }

  const config = configManager.mergeOptions(componentOptions);
  const shouldTrackTotalLatency = trackTotalLatency ?? config.trackTotalLatency;

  const logger = Logger.getInstance();
  const context = config.contextTracking ? TraceContext.getInstance() : null;
  const perfMonitor = config.performance?.enabled
    ? PerformanceMonitor.getInstance()
    : null;
  const contextManager = ContextManager.getInstance({
    enableSnapshots: config.enableSnapshots || config.verboseMode,
    debugMode: config.debugContext,
  });

  const routeSource = React.isValidElement(children)
    ? children.props
    : children;
  const routeHint = resolveRouteHint(routeSource, componentOptions, config);
  const traceIds = TraceIdGenerator.getInstance().generate({
    componentName: label,
    config,
    contextId: contextManager.getContextInfo()?.contextId,
    routeHint,
  });
  const traceId = traceIds.traceId;
  const parentTraceId = context?.getCurrentParentId();

  const metadata: TraceMetadata = {
    componentName: label,
    tags,
    renderStart: Date.now(),
    traceId,
    parentTrace: parentTraceId,
    routeHint: traceIds.routeHint,
    rootTraceId: traceIds.rootTraceId,
    sequence: traceIds.sequence,
  };

  const executeBoundary = async () => {
    if (context) {
      context.startTrace(metadata);
    }
    const wallClockStart = shouldTrackTotalLatency ? Date.now() : 0;
    const renderStartTime =
      typeof globalThis.performance !== "undefined"
        ? globalThis.performance.now()
        : Date.now();

    if (config.debugContext) {
      const contextInfo = context?.getCurrentContext();
      console.debug(`[quzz:boundary] Entering boundary "${label}"`, {
        traceId,
        parentTraceId,
        context: contextInfo,
      });
    }

    if (config.verboseMode && contextManager) {
      const snapshot = contextManager.captureSnapshot({
        label: `boundary-enter:${label}`,
        maxSnapshots: 100,
      });
      if (snapshot && config.debugContext) {
        console.debug(
          `[quzz:snapshot] Captured context snapshot for boundary "${label}"`,
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

    await logger.info(label, `Boundary rendering started`, metadata, tags);

    if (!disable?.props && React.isValidElement(children)) {
      const capturedProps = processPropsWithPlugins(
        children.props as Record<string, unknown>,
        config.plugins,
        config.maxPropDepth ?? 3
      );

      const sanitized = sanitizeProps(capturedProps, config);
      metadata.props = sanitized;
      await logger.debug(
        label,
        `Child props captured`,
        { ...metadata, props: sanitized },
        tags
      );
    }

    try {
      const renderPromise = Promise.resolve(children);
      const result = await renderPromise;

      const duration =
        (typeof globalThis.performance !== "undefined"
          ? globalThis.performance.now()
          : Date.now()) - renderStartTime;
      metadata.renderEnd = Date.now();
      metadata.duration = duration;

      if (shouldTrackTotalLatency && wallClockStart) {
        const wallClockTime = Date.now() - wallClockStart;
        metadata.wallClockTime = wallClockTime;
        metadata.waitTime = wallClockTime - duration;
      }

      if (context) {
        context.updateTrace(traceId, {
          duration,
          renderEnd: metadata.renderEnd,
          wallClockTime: metadata.wallClockTime,
          waitTime: metadata.waitTime,
        });
      }

      if (perfMonitor && !disable?.timing) {
        perfMonitor.recordRender(label, duration, false);

        if (
          config.performance?.warnThreshold &&
          perfMonitor.shouldWarn(duration, config.performance)
        ) {
          const warningMessage =
            shouldTrackTotalLatency && metadata.wallClockTime
              ? `Slow boundary detected: ${duration.toFixed(2)}ms compute, ${
                  metadata.wallClockTime
                }ms total (${metadata.waitTime?.toFixed(2)}ms wait)`
              : `Slow boundary detected: ${duration.toFixed(2)}ms`;

          await logger.warn(label, warningMessage, metadata, undefined, tags);
        }
      }

      if (config.plugins) {
        await Promise.allSettled(
          config.plugins.map((plugin) => plugin.onTraceEnd?.(metadata))
        );
      }

      const completionMessage =
        shouldTrackTotalLatency && metadata.wallClockTime
          ? `Boundary completed in ${duration.toFixed(2)}ms compute, ${
              metadata.wallClockTime
            }ms total`
          : `Boundary completed in ${duration.toFixed(2)}ms`;

      await logger.info(label, completionMessage, metadata, tags);

      if (config.debugContext) {
        console.debug(`[quzz:boundary] Exiting boundary "${label}"`, {
          traceId,
          duration: metadata.duration,
          wallClockTime: metadata.wallClockTime,
        });
      }

      if (config.verboseMode && contextManager) {
        const snapshot = contextManager.captureSnapshot({
          label: `boundary-exit:${label}`,
          maxSnapshots: 100,
        });
        if (snapshot && config.debugContext) {
          console.debug(
            `[quzz:snapshot] Captured exit snapshot for boundary "${label}"`,
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
      const serializedError = serializeError(error as Error, maxErrorDepth, 0, {
        mapStackTraces: config.mapStackTraces,
      });
      metadata.error = serializedError;

      if (config.debugContext) {
        console.debug(`[quzz:boundary] Error in boundary "${label}"`, {
          traceId,
          error: serializedError,
        });
      }

      if (config.verboseMode && contextManager) {
        const snapshot = contextManager.captureSnapshot({
          label: `boundary-error:${label}`,
          maxSnapshots: 100,
        });
        if (snapshot && config.debugContext) {
          console.debug(
            `[quzz:snapshot] Captured error snapshot for boundary "${label}"`,
            {
              timestamp: new Date(snapshot.timestamp).toISOString(),
              error: serializedError.message,
              stackDepth: snapshot.stackDepth,
            }
          );
        }
      }

      if (perfMonitor && !disable?.timing) {
        const duration =
          (typeof globalThis.performance !== "undefined"
            ? globalThis.performance.now()
            : Date.now()) - renderStartTime;
        metadata.duration = duration;

        if (shouldTrackTotalLatency && wallClockStart) {
          metadata.wallClockTime = Date.now() - wallClockStart;
          metadata.waitTime = metadata.wallClockTime - duration;
        }

        perfMonitor.recordRender(label, duration, true);
      }

      if (config.plugins) {
        await Promise.allSettled(
          config.plugins.map((plugin) =>
            plugin.onError?.(metadata, serializedError)
          )
        );
      }

      if (!disable?.errors) {
        await logger.error(
          label,
          `Boundary rendering failed: ${serializedError.message}`,
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

  return executeBoundary();
}

RSCBoundary.displayName = "RSCBoundary";

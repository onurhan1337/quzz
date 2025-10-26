import type { ComponentType } from "react";

export type LogLevel = "silent" | "error" | "warn" | "info" | "debug" | "trace";
export type OutputFormat = "pretty" | "json" | "compact" | "custom";

/**
 * Custom log formatter function
 */
export type LogFormatter = (entry: LogEntry) => string | void;

/**
 * Log transport handler for custom output destinations
 */
export type LogTransport = (
  entry: LogEntry,
  formatted: string
) => void | Promise<void>;

/**
 * Plugin hook for intercepting trace lifecycle
 */
export interface TracePlugin {
  name: string;
  onTraceStart?: (metadata: TraceMetadata) => void | Promise<void>;
  onTraceEnd?: (metadata: TraceMetadata) => void | Promise<void>;
  onError?: (
    metadata: TraceMetadata,
    error: SerializedError
  ) => void | Promise<void>;
  onPropsCapture?: (props: Record<string, unknown>) => Record<string, unknown>;
}

/**
 * Performance metrics configuration
 */
export interface PerformanceConfig {
  /**
   * Enable performance tracking
   * @default false
   */
  enabled?: boolean;
  /**
   * Warn if render time exceeds threshold (ms)
   * @default 1000
   */
  warnThreshold?: number;
  /**
   * Track memory usage (requires additional overhead)
   * @default false
   */
  trackMemory?: boolean;
  /**
   * Aggregate metrics over time
   * @default false
   */
  aggregate?: boolean;
}

/**
 * Props logging configuration
 */
export interface PropsConfig {
  /**
   * Await Promise props before logging (Next.js 15+ async props support)
   * WARNING: May trigger side effects (DB/network calls) or cause hangs
   * @default false
   */
  awaitProps?: boolean;
  /**
   * Timeout for awaiting Promise props in milliseconds
   * @default 5000
   */
  awaitTimeout?: number;
  /**
   * Show type hints for Promise props without awaiting them
   * @default true
   */
  showPromiseTypes?: boolean;
  /**
   * Maximum array items to include before truncation
   * @default 10
   */
  maxArrayItems?: number;
  /**
   * Maximum object properties to include before truncation
   * @default 20
   */
  maxObjectProps?: number;
  /**
   * Maximum depth for error cause chain serialization
   * @default 3
   */
  maxErrorDepth?: number;
}

/**
 * Visualizer configuration for trace collection
 */
export interface VisualizerConfig {
  /**
   * Enable trace collection for visualization
   * @default false
   */
  enabled?: boolean;
  /**
   * Output file path for collected traces
   * @default './traces.json'
   */
  output?: string;
}

/**
 * Global configuration options for quzz
 */
export interface QuzzConfig {
  /**
   * Logging verbosity level
   * @default 'error'
   */
  logLevel?: LogLevel;

  /**
   * Output format for logs
   * @default 'pretty'
   */
  outputFormat?: OutputFormat;

  /**
   * Custom log formatter
   */
  formatter?: LogFormatter;

  /**
   * Custom log transports
   */
  transports?: LogTransport[];

  /**
   * Performance monitoring configuration
   */
  performance?: PerformanceConfig;

  /**
   * Props logging configuration
   */
  props?: PropsConfig;

  /**
   * Whether to log component props (sanitized for security)
   * @default false
   * @deprecated Use props.awaitProps instead
   */
  logProps?: boolean;

  /**
   * Force enable tracing even in production (not recommended)
   * @default false
   */
  forceEnable?: boolean;

  /**
   * Maximum depth for prop serialization
   * @default 3
   */
  maxPropDepth?: number;

  /**
   * Maximum string length before truncation
   * @default 200
   */
  maxStringLength?: number;

  /**
   * Additional sensitive keys to redact (beyond defaults)
   */
  sensitiveKeys?: string[];

  /**
   * Enable context tracking for nested components
   * @default true
   */
  contextTracking?: boolean;

  /**
   * Include source location in traces (requires source maps)
   * @default false
   */
  includeSourceLocation?: boolean;

  /**
   * Custom plugins for extending functionality
   */
  plugins?: TracePlugin[];

  /**
   * Filter components by name pattern (regex)
   */
  componentFilter?: RegExp;

  /**
   * Throttle logs to prevent flooding (ms)
   * @default 0 (no throttling)
   */
  throttleMs?: number;

  /**
   * Track total latency (wall clock time vs compute time)
   * @default false
   */
  trackTotalLatency?: boolean;

  /**
   * Visualizer configuration for trace collection
   */
  visualizer?: VisualizerConfig;

  /**
   * Enable debug logging for context operations
   * @default false
   */
  debugContext?: boolean;

  /**
   * Enable context snapshots for debugging
   * @default false
   */
  enableSnapshots?: boolean;

  /**
   * Verbose mode for detailed debugging output including snapshots
   * @default false
   */
  verboseMode?: boolean;
}

/**
 * Per-component trace options (extends global config)
 */
export interface RSCTraceOptions extends Partial<QuzzConfig> {
  /**
   * Custom component name for logging (overrides automatic detection)
   */
  componentName?: string;

  /**
   * Tags for categorizing components
   */
  tags?: string[];

  /**
   * Disable specific features for this component
   */
  disable?: {
    props?: boolean;
    timing?: boolean;
    errors?: boolean;
  };
}

export interface SerializedError {
  message: string;
  name: string;
  stack?: string;
  componentStack?: string;
  digest?: string;
  cause?: unknown;
  code?: string | number;
}

export interface TraceMetadata {
  componentName: string;
  tags?: string[];
  renderStart: number;
  renderEnd?: number;
  duration?: number;
  wallClockTime?: number;
  waitTime?: number;
  props?: Record<string, unknown>;
  error?: SerializedError;
  parentTrace?: string;
  traceId: string;
  memory?: {
    heapUsed: number;
    heapTotal: number;
  };
}

export interface LogEntry {
  level: LogLevel;
  timestamp: number;
  componentName: string;
  message: string;
  metadata?: TraceMetadata;
  error?: SerializedError;
  tags?: string[];
}

export interface PerformanceMetrics {
  componentName: string;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  totalRenders: number;
  errorCount: number;
  lastRender: number;
}

export type WithRSCTrace = <P extends object>(
  Component: ComponentType<P>,
  options?: RSCTraceOptions
) => ComponentType<P>;

/**
 * Props for the RSCBoundary component
 */
export interface RSCBoundaryProps extends RSCTraceOptions {
  /**
   * Required label for the boundary
   */
  label: string;
  /**
   * Children to wrap and trace
   */
  children: React.ReactNode;
  /**
   * Track total latency (wall clock time vs compute time)
   * @default false
   */
  trackTotalLatency?: boolean;
}

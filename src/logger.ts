import type {
  LogEntry,
  LogLevel,
  QuzzConfig,
  TraceMetadata,
  SerializedError,
} from "./types";
import { ConfigManager } from "./config";
import { getFormatter } from "./formatters";

/**
 * Log level priorities for filtering
 */
const LOG_LEVELS: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5,
};

/**
 * Throttle map for preventing log flooding
 */
const throttleMap = new Map<string, number>();

/**
 * Logger with transport support and throttling
 */
class Logger {
  private static instance: Logger;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Check if log level should be output
   */
  private shouldLog(level: LogLevel, config: QuzzConfig): boolean {
    const configLevel = config.logLevel || "error";
    return LOG_LEVELS[level] <= LOG_LEVELS[configLevel];
  }

  /**
   * Check throttling
   */
  private isThrottled(key: string, throttleMs: number): boolean {
    if (throttleMs <= 0) return false;

    const now = Date.now();
    const lastLog = throttleMap.get(key);

    if (lastLog && now - lastLog < throttleMs) {
      return true;
    }

    throttleMap.set(key, now);
    return false;
  }

  /**
   * Create log entry
   */
  private createLogEntry(
    level: LogLevel,
    componentName: string,
    message: string,
    metadata?: TraceMetadata,
    error?: SerializedError,
    tags?: string[]
  ): LogEntry {
    return {
      level,
      timestamp: Date.now(),
      componentName,
      message,
      metadata,
      error,
      tags,
    };
  }

  /**
   * Output log entry
   */
  private async outputLog(entry: LogEntry, config: QuzzConfig): Promise<void> {
    // Get formatter
    const formatter =
      config.formatter || getFormatter(config.outputFormat || "pretty");
    const formatted = formatter(entry);

    // Skip if formatter returns void/undefined
    if (formatted === undefined) return;

    // Output to console
    const consoleMethod =
      entry.level === "error"
        ? console.error
        : entry.level === "warn"
          ? console.warn
          : console.log;
    consoleMethod(formatted);

    // Send to custom transports
    if (config.transports && config.transports.length > 0) {
      await Promise.allSettled(
        config.transports.map((transport) => transport(entry, formatted))
      );
    }
  }

  /**
   * Log a message
   */
  async log(
    level: LogLevel,
    componentName: string,
    message: string,
    metadata?: TraceMetadata,
    error?: SerializedError,
    tags?: string[]
  ): Promise<void> {
    const config = ConfigManager.getInstance().getConfig();

    // Check if should log based on level
    if (!this.shouldLog(level, config)) {
      return;
    }

    // Check throttling
    const throttleKey = `${componentName}:${level}:${message}`;
    if (this.isThrottled(throttleKey, config.throttleMs || 0)) {
      return;
    }

    // Create and output log entry
    const entry = this.createLogEntry(
      level,
      componentName,
      message,
      metadata,
      error,
      tags
    );
    await this.outputLog(entry, config);
  }

  /**
   * Convenience methods for different log levels
   */
  async error(
    componentName: string,
    message: string,
    metadata?: TraceMetadata,
    error?: SerializedError,
    tags?: string[]
  ): Promise<void> {
    await this.log("error", componentName, message, metadata, error, tags);
  }

  async warn(
    componentName: string,
    message: string,
    metadata?: TraceMetadata,
    error?: SerializedError,
    tags?: string[]
  ): Promise<void> {
    await this.log("warn", componentName, message, metadata, error, tags);
  }

  async info(
    componentName: string,
    message: string,
    metadata?: TraceMetadata,
    tags?: string[]
  ): Promise<void> {
    await this.log("info", componentName, message, metadata, undefined, tags);
  }

  async debug(
    componentName: string,
    message: string,
    metadata?: TraceMetadata,
    tags?: string[]
  ): Promise<void> {
    await this.log("debug", componentName, message, metadata, undefined, tags);
  }

  async trace(
    componentName: string,
    message: string,
    metadata?: TraceMetadata,
    tags?: string[]
  ): Promise<void> {
    await this.log("trace", componentName, message, metadata, undefined, tags);
  }

  /**
   * Clear throttle cache
   */
  clearThrottle(): void {
    throttleMap.clear();
  }
}

export { Logger };

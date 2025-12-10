import type {
  LogEntry,
  LogLevel,
  QuzzConfig,
  TraceMetadata,
  SerializedError,
  FileTransportOptions,
  HttpTransportOptions,
  LogTransport,
} from "./types";
import { ConfigManager } from "./config";
import { getFormatter } from "./formatters";
import { appendFile } from "fs";

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
  private pendingTransports = 0;
  private lastDropWarnAt = 0;
  private readonly dropWarnIntervalMs = 5000;

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
      const timeoutMs = config.transportTimeoutMs ?? 500;
      const maxPending = config.transportMaxPending ?? 100;

      await Promise.allSettled(
        config.transports.map((transport) =>
          this.runTransportWithGuards(
            transport,
            entry,
            formatted,
            timeoutMs,
            maxPending
          )
        )
      );
    }
  }

  private async runTransportWithGuards(
    transport: LogTransport,
    entry: LogEntry,
    formatted: string,
    timeoutMs: number,
    maxPending: number
  ): Promise<void> {
    if (maxPending > 0 && this.pendingTransports >= maxPending) {
      const now = Date.now();
      if (now - this.lastDropWarnAt > this.dropWarnIntervalMs) {
        console.warn(
          "[quzz:transport] Dropping log entry: transport queue is full"
        );
        this.lastDropWarnAt = now;
      }
      return;
    }

    this.pendingTransports += 1;

    try {
      const result = transport(entry, formatted);
      const maybePromise =
        result &&
        (typeof result === "object" || typeof result === "function") &&
        "then" in result &&
        typeof (result as { then?: unknown }).then === "function"
          ? Promise.resolve(result as Promise<void>)
          : null;

      if (maybePromise) {
        if (timeoutMs <= 0) {
          await maybePromise;
        } else {
          let timer: NodeJS.Timeout | undefined;
          await Promise.race([
            maybePromise.finally(() => {
              if (timer) {
                clearTimeout(timer);
              }
            }),
            new Promise<void>((resolve) => {
              timer = setTimeout(resolve, timeoutMs);
            }),
          ]);
        }
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "Unknown error";
      console.warn(`[quzz:transport] Transport failed: ${String(message)}`);
    } finally {
      this.pendingTransports = Math.max(0, this.pendingTransports - 1);
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

function createConsoleTransport(): LogTransport {
  return (entry, formatted) => {
    const method =
      entry.level === "error"
        ? console.error
        : entry.level === "warn"
          ? console.warn
          : console.log;
    method(formatted);
  };
}

function createFileTransport(options: FileTransportOptions): LogTransport {
  const buffer: string[] = [];
  let flushing = false;
  const flushInterval = options.flushIntervalMs ?? 500;
  const flush = () => {
    if (flushing || buffer.length === 0) return;
    flushing = true;
    const payload = buffer.splice(0, buffer.length).join("\n") + "\n";
    appendFile(options.path, payload, () => {
      flushing = false;
    });
  };
  setInterval(flush, flushInterval).unref();
  return (_, formatted) => {
    buffer.push(formatted);
    if (buffer.length >= 20) {
      flush();
    }
  };
}

function createHttpTransport(options: HttpTransportOptions): LogTransport {
  const queue: LogEntry[] = [];
  let flushing = false;
  const batchSize = options.batchSize ?? 10;
  const flushInterval = options.flushIntervalMs ?? 1000;
  const method = options.method ?? "POST";
  const flush = async () => {
    if (flushing || queue.length === 0) return;
    if (typeof fetch !== "function") return;
    flushing = true;
    const batch = queue.splice(0, batchSize);
    try {
      await fetch(options.url, {
        method,
        headers: {
          "content-type": "application/json",
          ...(options.headers || {}),
        },
        body: JSON.stringify(batch),
      });
    } finally {
      flushing = false;
    }
  };
  setInterval(flush, flushInterval).unref();
  return (entry) => {
    queue.push(entry);
    if (queue.length >= batchSize) {
      flush();
    }
  };
}

export {
  Logger,
  createConsoleTransport,
  createFileTransport,
  createHttpTransport,
};

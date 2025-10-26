import type { QuzzConfig, RSCTraceOptions, EnvConfig, LogLevel, OutputFormat } from "./types";
import { VALID_LOG_LEVELS, VALID_OUTPUT_FORMATS } from "./types";
import { ConfigValidator, validateEnvironment } from "./validators";
import { loadConfigFromFile } from "./config-loader";

/**
 * Parse environment variables for quzz configuration
 * Supports: QUZZ_ENABLED, QUZZ_LOG_LEVEL, QUZZ_OUTPUT_FORMAT, QUZZ_FORCE_ENABLE
 */
function parseEnvConfig(): EnvConfig {
  const envConfig: EnvConfig = {};

  // QUZZ_ENABLED: true/false or 1/0
  if (process.env.QUZZ_ENABLED !== undefined) {
    const value = process.env.QUZZ_ENABLED.toLowerCase();
    envConfig.enabled = value === "true" || value === "1";
  }

  // QUZZ_LOG_LEVEL: silent, error, warn, info, debug, trace
  if (process.env.QUZZ_LOG_LEVEL) {
    const level = process.env.QUZZ_LOG_LEVEL.toLowerCase() as LogLevel;
    if (VALID_LOG_LEVELS.includes(level)) {
      envConfig.logLevel = level;
    }
  }

  // QUZZ_OUTPUT_FORMAT: pretty, json, compact
  if (process.env.QUZZ_OUTPUT_FORMAT) {
    const format = process.env.QUZZ_OUTPUT_FORMAT.toLowerCase() as OutputFormat;
    if (VALID_OUTPUT_FORMATS.includes(format)) {
      envConfig.outputFormat = format;
    }
  }

  // QUZZ_FORCE_ENABLE: true/false or 1/0
  if (process.env.QUZZ_FORCE_ENABLE !== undefined) {
    const value = process.env.QUZZ_FORCE_ENABLE.toLowerCase();
    envConfig.forceEnable = value === "true" || value === "1";
  }

  return envConfig;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<
  Omit<
    QuzzConfig,
    "formatter" | "transports" | "plugins" | "componentFilter" | "sensitiveKeys"
  >
> = {
  logLevel: "error",
  outputFormat: "pretty",
  performance: {
    enabled: false,
    warnThreshold: 1000,
    trackMemory: false,
    memoryThreshold: 50 * 1024 * 1024, // 50MB
    aggregate: false,
    enableHeapSnapshots: false,
    heapSnapshotDir: "./heap-snapshots",
  },
  props: {
    awaitProps: false,
    awaitTimeout: 5000,
    showPromiseTypes: true,
    maxArrayItems: 10,
    maxObjectProps: 20,
    maxErrorDepth: 3,
    serializationStrategy: "standard",
  },
  logProps: false,
  forceEnable: false,
  maxPropDepth: 3,
  maxStringLength: 200,
  contextTracking: true,
  includeSourceLocation: false,
  throttleMs: 0,
  trackTotalLatency: false,
  visualizer: {
    enabled: false,
    output: "./traces.json",
  },
  debugContext: false,
  enableSnapshots: false,
  verboseMode: false,
  suppressConfigWarnings: false,
  enableHyperlinks: true,
};

/**
 * Singleton configuration manager
 */
class ConfigManager {
  private static instance: ConfigManager;
  private config: QuzzConfig;
  private warnedKeys = new Set<string>();

  private constructor() {
    // Priority order: defaults < quzz.config.js < env vars < programmatic configure()
    const fileConfig = loadConfigFromFile();
    const envConfig = parseEnvConfig();

    if (fileConfig) {
      this.config = {
        ...DEFAULT_CONFIG,
        ...fileConfig,
        ...envConfig,
        performance: {
          ...DEFAULT_CONFIG.performance,
          ...fileConfig.performance,
        },
        props: {
          ...DEFAULT_CONFIG.props,
          ...fileConfig.props,
        },
        visualizer: {
          ...DEFAULT_CONFIG.visualizer,
          ...fileConfig.visualizer,
        },
      };
    } else {
      // No file config, merge defaults with env vars
      this.config = {
        ...DEFAULT_CONFIG,
        ...envConfig,
      };
    }
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Configure quzz globally
   */
  configure(config: Partial<QuzzConfig>): void {
    // Validate configuration
    this.validateConfig(config);

    const validation = ConfigValidator.validate(config);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(", ")}`);
    }

    if (validation.warnings.length > 0 && config.logLevel !== "silent") {
      validation.warnings.forEach((warning) => {
        console.warn(`[quzz:config] Warning: ${warning}`);
      });
    }

    const envValidation = validateEnvironment();
    if (!envValidation.valid) {
      throw new Error(`Environment issues: ${envValidation.errors.join(", ")}`);
    }

    if (envValidation.warnings.length > 0 && config.logLevel !== "silent") {
      envValidation.warnings.forEach((warning) => {
        console.warn(`[quzz:env] Warning: ${warning}`);
      });
    }

    this.config = {
      ...this.config,
      ...config,
      performance: {
        ...DEFAULT_CONFIG.performance,
        ...config.performance,
      },
      props: {
        ...DEFAULT_CONFIG.props,
        ...config.props,
      },
      visualizer: {
        ...DEFAULT_CONFIG.visualizer,
        ...config.visualizer,
      },
    };
  }

  /**
   * Emit a warning only once per key
   */
  private warnOnce(key: string, message: string): void {
    if (this.warnedKeys.has(key)) {
      return;
    }
    this.warnedKeys.add(key);
    console.warn(message);
  }

  /**
   * Validate configuration options
   */
  private validateConfig(config: Partial<QuzzConfig>): void {
    const suppressWarnings = config.suppressConfigWarnings ?? false;

    // Validate log level
    if (config.logLevel && !VALID_LOG_LEVELS.includes(config.logLevel)) {
      this.warnOnce(
        "invalid-logLevel",
        `[quzz] Invalid logLevel "${config.logLevel}". Valid options: ${VALID_LOG_LEVELS.join(", ")}`
      );
    }

    // Validate output format
    if (
      config.outputFormat &&
      config.outputFormat !== "custom" &&
      !VALID_OUTPUT_FORMATS.includes(config.outputFormat)
    ) {
      this.warnOnce(
        "invalid-outputFormat",
        `[quzz] Invalid outputFormat "${config.outputFormat}". Valid options: ${VALID_OUTPUT_FORMATS.join(", ")}, custom`
      );
    }

    // Validate performance config
    if (config.performance) {
      if (
        config.performance.warnThreshold !== undefined &&
        config.performance.warnThreshold < 0
      ) {
        this.warnOnce(
          "invalid-warnThreshold",
          "[quzz] Performance warnThreshold must be positive"
        );
      }
    }

    // Validate props config
    if (config.props && !suppressWarnings) {
      if (config.props.awaitProps && config.logLevel !== "silent") {
        this.warnOnce(
          "awaitProps-enabled",
          "[quzz] Warning: awaitProps is enabled. This may trigger side effects (DB/network calls) or cause performance issues."
        );
      }
      if (
        config.props.awaitTimeout !== undefined &&
        config.props.awaitTimeout < 100
      ) {
        this.warnOnce(
          "awaitTimeout-too-low",
          "[quzz] Props awaitTimeout should be at least 100ms to avoid premature timeouts"
        );
      }
    }

    // Validate max depth
    if (
      config.maxPropDepth !== undefined &&
      (config.maxPropDepth < 0 || config.maxPropDepth > 10)
    ) {
      this.warnOnce(
        "maxPropDepth-out-of-range",
        "[quzz] maxPropDepth should be between 0 and 10 for optimal performance"
      );
    }

    // Validate component filter
    if (config.componentFilter) {
      try {
        // Test regex is valid
        "test".match(config.componentFilter);
      } catch (e) {
        console.error("[quzz] Invalid componentFilter regex:", e);
      }
    }

    // Warn about production usage
    if (config.forceEnable && process.env.NODE_ENV === "production") {
      this.warnOnce(
        "production-enabled",
        "[quzz] Warning: Tracing is force-enabled in production. This may impact performance."
      );
    }
  }

  /**
   * Get current global configuration
   */
  getConfig(): QuzzConfig {
    return { ...this.config };
  }

  /**
   * Merge component-level options with global config
   */
  mergeOptions(
    componentOptions: RSCTraceOptions = {}
  ): Required<
    Omit<
      QuzzConfig,
      | "formatter"
      | "transports"
      | "plugins"
      | "componentFilter"
      | "sensitiveKeys"
    >
  > &
    Pick<
      QuzzConfig,
      | "formatter"
      | "transports"
      | "plugins"
      | "componentFilter"
      | "sensitiveKeys"
    > {
    return {
      ...DEFAULT_CONFIG,
      ...this.config,
      ...componentOptions,
      performance: {
        ...DEFAULT_CONFIG.performance,
        ...this.config.performance,
        ...componentOptions.performance,
      },
      props: {
        ...DEFAULT_CONFIG.props,
        ...this.config.props,
        ...componentOptions.props,
      },
      visualizer: {
        ...DEFAULT_CONFIG.visualizer,
        ...(this.config.visualizer || {}),
      },
    };
  }

  /**
   * Reset to default configuration
   */
  reset(): void {
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Check if tracing is enabled based on environment and config
   */
  isEnabled(options?: RSCTraceOptions): boolean {
    // QUZZ_DISABLE takes precedence over everything
    if (process.env.QUZZ_DISABLE === "true") {
      return false;
    }

    // QUZZ_ENABLED explicitly enables tracing
    if (process.env.QUZZ_ENABLED !== undefined) {
      const value = process.env.QUZZ_ENABLED.toLowerCase();
      return value === "true" || value === "1";
    }

    const forceEnable = options?.forceEnable ?? this.config.forceEnable;
    if (forceEnable) {
      return true;
    }

    if (process.env.NODE_ENV === "production") {
      return false;
    }

    return (
      process.env.NODE_ENV === "development" ||
      process.env.NODE_ENV === undefined
    );
  }
}

/**
 * Configure quzz globally - affects all traced components
 * @param config - Partial configuration to merge with defaults
 * @example
 * ```ts
 * configure({ logLevel: 'debug', performance: { enabled: true } })
 * ```
 */
export function configure(config: Partial<QuzzConfig>): void {
  ConfigManager.getInstance().configure(config);
}

/**
 * Get current global configuration
 * @returns Complete configuration object
 */
export function getConfig(): QuzzConfig {
  return ConfigManager.getInstance().getConfig();
}

/**
 * Reset configuration to defaults
 */
export function resetConfig(): void {
  ConfigManager.getInstance().reset();
}

export { ConfigManager };

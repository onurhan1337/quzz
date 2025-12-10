import type { EnvConfig, LogLevel, OutputFormat, QuzzConfig } from "./types";
import { VALID_LOG_LEVELS, VALID_OUTPUT_FORMATS } from "./types";
import { ConfigValidator, validateEnvironment } from "./validators";

export type PartialQuzzConfig = Partial<QuzzConfig>;

export function mergeConfigLayers(
  base: QuzzConfig,
  overrides: PartialQuzzConfig | undefined,
  defaults: QuzzConfig
) {
  return {
    ...mergeShallow(defaults, base, overrides),
    performance: mergeShallow(
      defaults.performance,
      base.performance,
      overrides?.performance
    ),
    props: mergeShallow(defaults.props, base.props, overrides?.props),
    visualizer: mergeShallow(
      defaults.visualizer,
      base.visualizer,
      overrides?.visualizer
    ),
    traceId: mergeShallow(defaults.traceId, base.traceId, overrides?.traceId),
  };
}

function mergeShallow<T extends object | undefined>(
  defaults: T | undefined,
  base: T | undefined,
  overrides: T | undefined
): T | undefined {
  if (!defaults && !base && !overrides) return undefined;

  return {
    ...(defaults ?? {}),
    ...(base ?? {}),
    ...(overrides ?? {}),
  } as T;
}

export function parseEnvConfig(): EnvConfig {
  const envConfig: EnvConfig = {};

  if (process.env.QUZZ_ENABLED !== undefined) {
    const value = process.env.QUZZ_ENABLED.toLowerCase();
    envConfig.enabled = value === "true" || value === "1";
  }

  if (process.env.QUZZ_LOG_LEVEL) {
    const level = process.env.QUZZ_LOG_LEVEL.toLowerCase() as LogLevel;
    if (VALID_LOG_LEVELS.includes(level)) {
      envConfig.logLevel = level;
    }
  }

  if (process.env.QUZZ_OUTPUT_FORMAT) {
    const format = process.env.QUZZ_OUTPUT_FORMAT.toLowerCase() as OutputFormat;
    if (VALID_OUTPUT_FORMATS.includes(format)) {
      envConfig.outputFormat = format;
    }
  }

  if (process.env.QUZZ_FORCE_ENABLE !== undefined) {
    const value = process.env.QUZZ_FORCE_ENABLE.toLowerCase();
    envConfig.forceEnable = value === "true" || value === "1";
  }

  return envConfig;
}

export function resolveEnabled(
  current: QuzzConfig,
  options?: { traceOptions?: { forceEnable?: boolean } }
): boolean {
  if (typeof process === "undefined") return false;
  if (process.env.QUZZ_DISABLE === "true") return false;

  if (process.env.QUZZ_ENABLED !== undefined) {
    const value = process.env.QUZZ_ENABLED.toLowerCase();
    return value === "true" || value === "1";
  }

  const forceEnable = options?.traceOptions?.forceEnable ?? current.forceEnable;
  if (forceEnable) return true;

  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === "production") return false;
  return nodeEnv === "development" || nodeEnv === undefined;
}

export function validateConfigWarnings(
  config: Partial<QuzzConfig>,
  suppressWarnings: boolean
): void {
  if (config.logLevel && !VALID_LOG_LEVELS.includes(config.logLevel)) {
    console.warn(
      `[quzz] Invalid logLevel "${config.logLevel}". Valid options: ${VALID_LOG_LEVELS.join(", ")}`
    );
  }

  if (
    config.outputFormat &&
    config.outputFormat !== "custom" &&
    !VALID_OUTPUT_FORMATS.includes(config.outputFormat)
  ) {
    console.warn(
      `[quzz] Invalid outputFormat "${config.outputFormat}". Valid options: ${VALID_OUTPUT_FORMATS.join(
        ", "
      )}, custom`
    );
  }

  if (config.performance) {
    if (
      config.performance.warnThreshold !== undefined &&
      config.performance.warnThreshold < 0
    ) {
      console.warn("[quzz] Performance warnThreshold must be positive");
    }
  }

  if (config.props && !suppressWarnings) {
    if (config.props.awaitProps && config.logLevel !== "silent") {
      console.warn(
        "[quzz] Warning: awaitProps is enabled. This may trigger side effects (DB/network calls) or cause performance issues."
      );
    }
    if (
      config.props.awaitTimeout !== undefined &&
      config.props.awaitTimeout < 100
    ) {
      console.warn(
        "[quzz] Props awaitTimeout should be at least 100ms to avoid premature timeouts"
      );
    }
  }

  if (
    config.maxPropDepth !== undefined &&
    (config.maxPropDepth < 0 || config.maxPropDepth > 10)
  ) {
    console.warn(
      "[quzz] maxPropDepth should be between 0 and 10 for optimal performance"
    );
  }

  if (config.componentFilter) {
    try {
      "test".match(config.componentFilter);
    } catch (e) {
      console.error("[quzz] Invalid componentFilter regex:", e);
    }
  }

  if (config.forceEnable && process.env.NODE_ENV === "production") {
    console.warn(
      "[quzz] Warning: Tracing is force-enabled in production. This may impact performance."
    );
  }
}

export function validateConfigStrict(config: Partial<QuzzConfig>): void {
  const validation = ConfigValidator.validate(config);
  if (!validation.valid) {
    throw new Error(`Invalid configuration: ${validation.errors.join(", ")}`);
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
}

import type {
  QuzzConfig,
  RSCTraceOptions,
  EnvConfig,
  QuzzPresetName,
  QuzzPreset,
} from "./types";
import { loadConfigFromFileAsync } from "./config-loader";
import {
  mergeConfigLayers,
  parseEnvConfig,
  resolveEnabled,
  validateConfigStrict,
  validateConfigWarnings,
} from "./config-helpers";

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
  transportTimeoutMs: 500,
  transportMaxPending: 100,
  performance: {
    enabled: false,
    warnThreshold: 750,
    trackMemory: false,
    memoryThreshold: 30 * 1024 * 1024,
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
  mapStackTraces: false,
  throttleMs: 0,
  trackTotalLatency: false,
  autoLinkParent: true,
  visualizer: {
    enabled: false,
    output: "./traces.json",
  },
  debugContext: false,
  enableSnapshots: false,
  verboseMode: false,
  suppressConfigWarnings: false,
  enableHyperlinks: true,
  traceId: {
    mode: "structured",
    includeRouteHint: true,
    maxRouteLength: 120,
    maxSearchParamsLength: 80,
    maxIdLength: 180,
    maxPathLength: 120,
  },
};

const PRESETS: Record<QuzzPresetName, QuzzPreset> = {
  debug: {
    logLevel: "debug",
    outputFormat: "pretty",
    logProps: true,
    performance: {
      enabled: true,
      warnThreshold: 500,
      trackMemory: false,
      aggregate: false,
      enableHeapSnapshots: false,
    },
    props: {
      awaitProps: false,
      showPromiseTypes: true,
    },
    visualizer: {
      enabled: true,
    },
    debugContext: true,
    enableSnapshots: true,
    verboseMode: true,
    throttleMs: 0,
    enableHyperlinks: true,
    traceId: {
      mode: "structured",
      includeRouteHint: true,
      maxRouteLength: 120,
      maxSearchParamsLength: 80,
      maxIdLength: 180,
      maxPathLength: 120,
    },
  },
  perf: {
    logLevel: "info",
    outputFormat: "compact",
    logProps: false,
    performance: {
      enabled: true,
      warnThreshold: 600,
      trackMemory: true,
      memoryThreshold: 30 * 1024 * 1024,
      aggregate: true,
      enableHeapSnapshots: false,
    },
    props: {
      awaitProps: false,
      showPromiseTypes: false,
    },
    visualizer: {
      enabled: false,
    },
    debugContext: false,
    enableSnapshots: false,
    verboseMode: false,
    throttleMs: 50,
    enableHyperlinks: true,
    traceId: {
      mode: "structured",
      includeRouteHint: true,
      maxRouteLength: 120,
      maxSearchParamsLength: 80,
      maxIdLength: 180,
      maxPathLength: 120,
    },
  },
  minimal: {
    logLevel: "warn",
    outputFormat: "compact",
    logProps: false,
    performance: {
      enabled: false,
      warnThreshold: 750,
      trackMemory: false,
      aggregate: false,
      enableHeapSnapshots: false,
    },
    props: {
      awaitProps: false,
      showPromiseTypes: false,
    },
    visualizer: {
      enabled: false,
    },
    debugContext: false,
    enableSnapshots: false,
    verboseMode: false,
    throttleMs: 100,
    enableHyperlinks: true,
    traceId: {
      mode: "structured",
      includeRouteHint: true,
      maxRouteLength: 120,
      maxSearchParamsLength: 80,
      maxIdLength: 180,
      maxPathLength: 120,
    },
  },
};

const fileConfigPromise: Promise<QuzzConfig | null> =
  typeof process !== "undefined"
    ? loadConfigFromFileAsync()
    : Promise.resolve(null);

type ResetOptions = {
  applyEnv?: boolean;
  fileConfig?: QuzzConfig | null;
};

type ReloadOptions = ResetOptions & {
  reloadFile?: boolean;
};

/**
 * Singleton configuration manager
 */
class ConfigManager {
  private static instance: ConfigManager;
  private config: QuzzConfig;
  private userConfigured = false;
  private fileConfigApplied = false;

  private constructor() {
    // Priority order: defaults < quzz.config.* (async) < env vars < programmatic configure()
    const envConfig = parseEnvConfig();

    // Start with defaults + env
    this.config = mergeConfigLayers(DEFAULT_CONFIG, envConfig, DEFAULT_CONFIG);

    // Apply file config when ready, unless user already reconfigured
    fileConfigPromise
      .then((fileConfig) => {
        if (!fileConfig || this.userConfigured || this.fileConfigApplied) {
          return;
        }
        this.applyFileConfig(fileConfig, envConfig);
      })
      .catch(() => {
        /* noop: keep defaults+env */
      });
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private applyFileConfig(fileConfig: QuzzConfig, envConfig: EnvConfig): void {
    const withFile = mergeConfigLayers(
      DEFAULT_CONFIG,
      fileConfig,
      DEFAULT_CONFIG
    );
    this.config = mergeConfigLayers(withFile, envConfig, DEFAULT_CONFIG);
    this.fileConfigApplied = true;
  }

  /**
   * Configure quzz globally
   */
  configure(config: Partial<QuzzConfig>): void {
    this.userConfigured = true;
    validateConfigStrict(config);
    validateConfigWarnings(config, config.suppressConfigWarnings ?? false);

    this.config = mergeConfigLayers(this.config, config, DEFAULT_CONFIG);
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
      traceId: {
        ...DEFAULT_CONFIG.traceId,
        ...(this.config.traceId || {}),
        ...(componentOptions.traceId || {}),
      },
    };
  }

  /**
   * Reset to default configuration
   */
  reset(options: ResetOptions = {}): void {
    const applyEnv = options.applyEnv ?? true;
    const fileConfig = options.fileConfig;
    const fileMerged = fileConfig
      ? mergeConfigLayers(DEFAULT_CONFIG, fileConfig, DEFAULT_CONFIG)
      : { ...DEFAULT_CONFIG };
    const envConfig = applyEnv ? parseEnvConfig() : {};
    this.config = mergeConfigLayers(fileMerged, envConfig, DEFAULT_CONFIG);
    this.userConfigured = false;
    this.fileConfigApplied = Boolean(fileConfig);
  }

  /**
   * Check if tracing is enabled based on environment and config
   */
  isEnabled(options?: RSCTraceOptions): boolean {
    return resolveEnabled(this.config, { traceOptions: options });
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
export function resetConfig(options?: ResetOptions): void {
  ConfigManager.getInstance().reset(options);
}

export async function reloadConfig(options?: ReloadOptions): Promise<void> {
  const fileConfig =
    options?.reloadFile === false ? null : await loadConfigFromFileAsync();
  ConfigManager.getInstance().reset({
    applyEnv: options?.applyEnv,
    fileConfig,
  });
}

export function configurePreset(
  name: QuzzPresetName,
  overrides?: Partial<QuzzConfig>
): void {
  const preset = PRESETS[name];
  if (!preset) {
    throw new Error(`Unknown preset: ${name}`);
  }
  const merged: QuzzConfig = {
    ...preset,
    ...overrides,
    performance: {
      ...preset.performance,
      ...overrides?.performance,
    },
    props: {
      ...preset.props,
      ...overrides?.props,
    },
    visualizer: {
      ...preset.visualizer,
      ...overrides?.visualizer,
    },
    traceId: {
      ...preset.traceId,
      ...overrides?.traceId,
    },
  };
  ConfigManager.getInstance().configure(merged);
}

export function defineConfig(config: QuzzConfig): QuzzConfig {
  return config;
}

export function getPresets(): Record<QuzzPresetName, QuzzPreset> {
  return { ...PRESETS };
}

export { ConfigManager };

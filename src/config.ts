import type { QuzzConfig, RSCTraceOptions } from './types'

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<Omit<QuzzConfig, 'formatter' | 'transports' | 'plugins' | 'componentFilter' | 'sensitiveKeys'>> = {
  logLevel: 'error',
  outputFormat: 'pretty',
  performance: {
    enabled: false,
    warnThreshold: 1000,
    trackMemory: false,
    aggregate: false,
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
    output: './traces.json',
  },
}

/**
 * Singleton configuration manager
 */
class ConfigManager {
  private static instance: ConfigManager
  private config: QuzzConfig

  private constructor() {
    this.config = { ...DEFAULT_CONFIG }
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager()
    }
    return ConfigManager.instance
  }

  /**
   * Configure quzz globally
   */
  configure(config: Partial<QuzzConfig>): void {
    // Validate configuration
    this.validateConfig(config)

    this.config = {
      ...this.config,
      ...config,
      performance: {
        ...DEFAULT_CONFIG.performance,
        ...config.performance,
      },
      visualizer: {
        ...DEFAULT_CONFIG.visualizer,
        ...config.visualizer,
      },
    }
  }

  /**
   * Validate configuration options
   */
  private validateConfig(config: Partial<QuzzConfig>): void {
    // Validate log level
    if (config.logLevel) {
      const validLevels = ['silent', 'error', 'warn', 'info', 'debug', 'trace']
      if (!validLevels.includes(config.logLevel)) {
        console.warn(`[quzz] Invalid logLevel "${config.logLevel}". Valid options: ${validLevels.join(', ')}`)
      }
    }

    // Validate output format
    if (config.outputFormat) {
      const validFormats = ['pretty', 'json', 'compact']
      if (!validFormats.includes(config.outputFormat)) {
        console.warn(`[quzz] Invalid outputFormat "${config.outputFormat}". Valid options: ${validFormats.join(', ')}`)
      }
    }

    // Validate performance config
    if (config.performance) {
      if (config.performance.warnThreshold !== undefined && config.performance.warnThreshold < 0) {
        console.warn('[quzz] Performance warnThreshold must be positive')
      }
    }

    // Validate max depth
    if (config.maxPropDepth !== undefined && (config.maxPropDepth < 0 || config.maxPropDepth > 10)) {
      console.warn('[quzz] maxPropDepth should be between 0 and 10 for optimal performance')
    }

    // Validate component filter
    if (config.componentFilter) {
      try {
        // Test regex is valid
        'test'.match(config.componentFilter)
      } catch (e) {
        console.error('[quzz] Invalid componentFilter regex:', e)
      }
    }

    // Warn about production usage
    if (config.forceEnable && process.env.NODE_ENV === 'production') {
      console.warn('[quzz] Warning: Tracing is force-enabled in production. This may impact performance.')
    }
  }

  /**
   * Get current global configuration
   */
  getConfig(): QuzzConfig {
    return { ...this.config }
  }

  /**
   * Merge component-level options with global config
   */
  mergeOptions(componentOptions: RSCTraceOptions = {}): Required<
    Omit<QuzzConfig, 'formatter' | 'transports' | 'plugins' | 'componentFilter' | 'sensitiveKeys'>
  > & Pick<QuzzConfig, 'formatter' | 'transports' | 'plugins' | 'componentFilter' | 'sensitiveKeys'> {
    return {
      ...DEFAULT_CONFIG,
      ...this.config,
      ...componentOptions,
      performance: {
        ...DEFAULT_CONFIG.performance,
        ...this.config.performance,
        ...componentOptions.performance,
      },
      visualizer: {
        ...DEFAULT_CONFIG.visualizer,
        ...(this.config.visualizer || {}),
      },
    }
  }

  /**
   * Reset to default configuration
   */
  reset(): void {
    this.config = { ...DEFAULT_CONFIG }
  }

  /**
   * Check if tracing is enabled based on environment and config
   */
  isEnabled(options?: RSCTraceOptions): boolean {
    // Never enable in production unless explicitly forced
    if (process.env.NODE_ENV === 'production') {
      const forceEnable = options?.forceEnable ?? this.config.forceEnable
      if (!forceEnable) return false
    }

    // Check for explicit disable via environment variable
    if (process.env.QUZZ_DISABLE === 'true') {
      return false
    }

    const forceEnable = options?.forceEnable ?? this.config.forceEnable
    if (forceEnable) return true

    return process.env.NODE_ENV === 'development'
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
  ConfigManager.getInstance().configure(config)
}

/**
 * Get current global configuration
 * @returns Complete configuration object
 */
export function getConfig(): QuzzConfig {
  return ConfigManager.getInstance().getConfig()
}

/**
 * Reset configuration to defaults
 */
export function resetConfig(): void {
  ConfigManager.getInstance().reset()
}

export { ConfigManager }

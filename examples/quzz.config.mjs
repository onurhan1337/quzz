/**
 * Quzz Configuration File (ESM)
 *
 * This file is automatically loaded when quzz is initialized.
 * Priority: defaults < quzz.config.mjs < env vars < programmatic configure()
 *
 * @type {import('quzz').QuzzConfig}
 */
export default {
  // Basic settings
  logLevel: "info",
  outputFormat: "compact",
  enableHyperlinks: true,

  // Performance monitoring
  performance: {
    enabled: true,
    warnThreshold: 1000, // Warn if render > 1s
    trackMemory: true,
    memoryThreshold: 50 * 1024 * 1024, // 50MB
    enableHeapSnapshots: false, // Enable for memory debugging
    heapSnapshotDir: "./heap-snapshots",
  },

  // Props configuration
  props: {
    showPromiseTypes: true, // Show Promise type hints (Next.js 15+)
    awaitProps: false, // Don't await Promises by default
    awaitTimeout: 5000, // 5s timeout if awaiting
    maxArrayItems: 10,
    maxObjectProps: 20,
    maxErrorDepth: 3,
    serializationStrategy: "standard",
  },

  // Component filtering with regex
  // componentFilter: /^(Blog|Product|Work)/, // Only trace these components

  // Security - sensitive keys to redact
  sensitiveKeys: ["apiKey", "secretToken", "privateData"],

  // Other settings
  maxPropDepth: 3,
  maxStringLength: 200,
  contextTracking: true,
  throttleMs: 0, // No throttling

  // Advanced features
  visualizer: {
    enabled: false,
    output: "./traces.json",
  },

  debugContext: false,
  verboseMode: false,
  suppressConfigWarnings: false,
};

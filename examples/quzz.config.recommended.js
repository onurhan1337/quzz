/**
 * Recommended quzz configuration using CommonJS for immediate loading
 * This file will be loaded synchronously at startup
 *
 * @type {import('quzz').QuzzConfig}
 */
module.exports = {
  logLevel: "info",
  outputFormat: "compact",

  performance: {
    enabled: true,
    warnThreshold: 500,
    trackMemory: true,
    memoryThreshold: 50 * 1024 * 1024,
    enableHeapSnapshots: false,
    heapSnapshotDir: "./heap-snapshots",
  },

  props: {
    showPromiseTypes: true,
    awaitProps: false,
    awaitTimeout: 5000,
    maxArrayItems: 10,
    maxObjectProps: 20,
  },

  componentFilter: /^(Blog|Product|Work|Dashboard)/,

  sensitiveKeys: ["apiKey", "secretToken", "authToken"],

  enableHyperlinks: true,

  visualizer: {
    enabled: true,
    output: "./traces.json",
  },

  trackTotalLatency: true,

  contextTracking: true,
};

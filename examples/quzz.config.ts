import { defineConfig } from "quzz";

export default defineConfig({
  logLevel: "debug",
  outputFormat: "grouped",
  performance: {
    enabled: true,
    warnThreshold: 500,
    trackMemory: true,
  },
  visualizer: {
    enabled: true,
  },
  props: {
    awaitProps: false,
    showPromiseTypes: true,
  },
});


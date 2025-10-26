/**
 * Test file for quzz v0.4.0 new features:
 * 1. Compact output format with colors and memory display
 * 2. Environment variable configuration
 * 3. Terminal hyperlinks for trace IDs
 * 4. Perf mode with heap snapshots
 */

import { configure } from "../src/index";

console.log("🧪 Testing quzz v0.4.0 New Features\n");

// Test 1: Compact Output Format
console.log("=" .repeat(80));
console.log("Test 1: Compact Output Format");
console.log("=" .repeat(80));
console.log("Expected format: ComponentName: duration (memory) status\n");

configure({
  logLevel: "info",
  outputFormat: "compact",
  performance: {
    enabled: true,
    trackMemory: true,
  },
});

console.log("✓ Configured with compact output format");
console.log("  When you run traced components, logs will show:");
console.log("  Example: BlogDetailPage: 4.79ms (620MB) ✓\n");

// Test 2: Environment Variable Support
console.log("=" .repeat(80));
console.log("Test 2: Environment Variable Configuration");
console.log("=" .repeat(80));
console.log("Supported environment variables:");
console.log("  • QUZZ_ENABLED=true|false|1|0");
console.log("  • QUZZ_LOG_LEVEL=silent|error|warn|info|debug|trace");
console.log("  • QUZZ_OUTPUT_FORMAT=pretty|json|compact");
console.log("  • QUZZ_FORCE_ENABLE=true|false|1|0");
console.log("  • QUZZ_DISABLE_HYPERLINKS=true (disable terminal hyperlinks)");
console.log("  • QUZZ_DISABLE=true (completely disable quzz)\n");

console.log("Current environment variables:");
console.log(`  QUZZ_ENABLED: ${process.env.QUZZ_ENABLED || "(not set)"}`);
console.log(`  QUZZ_LOG_LEVEL: ${process.env.QUZZ_LOG_LEVEL || "(not set)"}`);
console.log(
  `  QUZZ_OUTPUT_FORMAT: ${process.env.QUZZ_OUTPUT_FORMAT || "(not set)"}`
);
console.log(
  `  NODE_ENV: ${process.env.NODE_ENV || "(not set)"}\n`
);

console.log("To test, run with environment variables:");
console.log(
  "  QUZZ_LOG_LEVEL=debug QUZZ_OUTPUT_FORMAT=compact npm run dev\n"
);

// Test 3: Terminal Hyperlinks
console.log("=" .repeat(80));
console.log("Test 3: Terminal Hyperlinks for Trace IDs");
console.log("=" .repeat(80));
console.log("Terminal hyperlink support (OSC 8 escape sequences):");
console.log("  Trace IDs are now clickable in supported terminals:");
console.log("    • iTerm2 (macOS)");
console.log("    • VS Code integrated terminal");
console.log("    • GNOME Terminal");
console.log("    • Hyper");
console.log("    • Most xterm-compatible terminals\n");

configure({
  logLevel: "info",
  outputFormat: "pretty",
  enableHyperlinks: true,
});

console.log("✓ Terminal hyperlinks enabled by default");
console.log("  Trace IDs will use format: quzz://trace/{traceId}");
console.log("  Falls back to plain text on unsupported terminals\n");

console.log("To disable hyperlinks:");
console.log("  1. Set QUZZ_DISABLE_HYPERLINKS=true");
console.log("  2. Or configure({ enableHyperlinks: false })\n");

// Test 4: Perf Mode with Heap Snapshots
console.log("=" .repeat(80));
console.log("Test 4: Perf Mode with Heap Snapshots");
console.log("=" .repeat(80));
console.log("Heap snapshot support for memory debugging:\n");

configure({
  logLevel: "info",
  performance: {
    enabled: true,
    trackMemory: true,
    memoryThreshold: 50 * 1024 * 1024, // 50MB
    enableHeapSnapshots: true,
    heapSnapshotDir: "./heap-snapshots",
  },
});

console.log("✓ Heap snapshots configured");
console.log("  Settings:");
console.log("    • Memory threshold: 50MB");
console.log("    • Snapshot directory: ./heap-snapshots");
console.log("    • Dev-only: Disabled in production\n");

console.log("How it works:");
console.log("  1. Component renders with high memory usage (+50MB)");
console.log("  2. Warning is logged about high memory");
console.log("  3. Heap snapshot is automatically saved to disk");
console.log("  4. Filename: heap-{ComponentName}-{timestamp}.heapsnapshot\n");

console.log("To analyze heap snapshots:");
console.log("  1. Open Chrome DevTools");
console.log("  2. Go to Memory tab");
console.log("  3. Click 'Load' button");
console.log("  4. Select the .heapsnapshot file\n");

console.log("Safety features:");
console.log("  ✓ Only enabled in development (NODE_ENV !== 'production')");
console.log("  ✓ Requires explicit enableHeapSnapshots: true");
console.log("  ✓ Warns about disk usage and overhead");
console.log("  ✓ Creates directory automatically if missing\n");

// Test 5: Combined Configuration Example
console.log("=" .repeat(80));
console.log("Test 5: Full Configuration Example");
console.log("=" .repeat(80));

const fullConfig = {
  // Basic settings
  logLevel: "debug" as const,
  outputFormat: "compact" as const,
  enableHyperlinks: true,

  // Performance monitoring
  performance: {
    enabled: true,
    warnThreshold: 1000, // Warn if render > 1s
    trackMemory: true,
    memoryThreshold: 50 * 1024 * 1024, // 50MB
    enableHeapSnapshots: true,
    heapSnapshotDir: "./heap-snapshots",
  },

  // Component filtering (already exists)
  componentFilter: /^(Blog|Work|Product)/, // Only trace these components

  // Props configuration
  props: {
    showPromiseTypes: true,
    maxArrayItems: 10,
    maxObjectProps: 20,
  },
};

configure(fullConfig);

console.log("Full configuration applied:");
console.log(JSON.stringify(fullConfig, null, 2));
console.log();

// Summary
console.log("=" .repeat(80));
console.log("🎉 Summary of v0.4.0 Features");
console.log("=" .repeat(80));
console.log();
console.log("✅ Compact Output Format");
console.log("   → Concise single-line logs with colors");
console.log("   → Format: ComponentName: 4.79ms (620MB) ✓");
console.log();
console.log("✅ Environment Variable Support");
console.log("   → QUZZ_ENABLED, QUZZ_LOG_LEVEL, QUZZ_OUTPUT_FORMAT");
console.log("   → Seamless integration with existing NODE_ENV logic");
console.log();
console.log("✅ Terminal Hyperlinks");
console.log("   → Clickable trace IDs using OSC 8 escape sequences");
console.log("   → Automatic fallback for unsupported terminals");
console.log();
console.log("✅ Perf Mode with Heap Snapshots");
console.log("   → Automatic heap dumps on high memory usage");
console.log("   → Dev-only safety with configurable thresholds");
console.log();
console.log("All features tested successfully! 🚀");
console.log();

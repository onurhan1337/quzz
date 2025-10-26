/**
 * Demonstration of the new modular storage architecture in quzz
 *
 * This example shows how the modular storage instances work independently
 * for different concerns (tracing and memory metrics), making debugging
 * and feature toggling much easier.
 */

import { TraceContext, configure } from "../src";
import { ContextManager } from "../src/storage/context-manager";
import { TraceStorage } from "../src/storage/trace-storage";
import { MemoryMetricsStorage } from "../src/storage/memory-metrics-storage";

async function demonstrateModularStorage() {
  console.log("🚀 Quzz Modular Storage Architecture Demo\n");

  configure({
    logLevel: "debug",
    contextTracking: true,
    debugContext: true,
    performance: {
      enabled: true,
      trackMemory: true,
      aggregate: true,
    },
  });

  const context = TraceContext.getInstance();
  const manager = ContextManager.getInstance();

  console.log("1️⃣  Demonstrating Independent Trace Storage");
  console.log("=" .repeat(50));

  await context.runInNewContext(() => {
    const parentId = context.generateTraceId();
    context.startTrace({
      componentName: "ParentComponent",
      traceId: parentId,
      renderStart: Date.now(),
    });

    console.log(`✅ Started parent trace: ${parentId}`);

    const childId = context.generateTraceId();
    context.startTrace({
      componentName: "ChildComponent",
      traceId: childId,
      renderStart: Date.now(),
      parentTrace: parentId,
    });

    console.log(`✅ Started child trace: ${childId}`);
    console.log(`📊 Current hierarchy: ${context.getTraceHierarchy().join(" -> ")}`);

    context.endTrace(childId);
    context.endTrace(parentId);

    console.log("✅ All traces completed\n");
  });

  console.log("2️⃣  Demonstrating Memory Metrics Storage");
  console.log("=" .repeat(50));

  const memoryStorage = new MemoryMetricsStorage({
    name: "demo-memory",
    debugMode: true,
    maxSnapshots: 10,
    autoSnapshot: true,
    snapshotInterval: 1000,
  });

  manager.registerStorage("demo-memory", memoryStorage);

  await memoryStorage.runWithMemoryTracking(() => {
    console.log("📊 Capturing memory baseline...");

    const largeArray = new Array(1000000).fill("data");
    console.log("📈 Allocated large array");

    const stats = memoryStorage.getMemoryStats();
    if (stats) {
      console.log(`💾 Memory growth: ${(stats.growth / 1024 / 1024).toFixed(2)} MB`);
      console.log(`📊 Peak memory: ${((stats.peak?.heapUsed || 0) / 1024 / 1024).toFixed(2)} MB`);
    }

    const trend = memoryStorage.getMemoryTrend();
    if (trend) {
      console.log(`📈 Memory trend: ${trend.trend}`);
      console.log(`📊 Average growth: ${(trend.averageGrowth / 1024).toFixed(2)} KB/sample\n`);
    }

    largeArray.length = 0;
  });

  console.log("3️⃣  Demonstrating Storage Independence");
  console.log("=" .repeat(50));

  console.log("🔧 Disabling trace storage...");
  manager.disableStorage("trace");

  context.runInNewContext(() => {
    context.startTrace({
      componentName: "TestComponent",
      traceId: "test-1",
      renderStart: Date.now(),
    });

    console.log("📊 Trace storage disabled - operations are no-ops");
    console.log(`📊 Current parent: ${context.getCurrentParentId() || "none"}`);
  });

  console.log("\n🔧 Re-enabling trace storage...");
  manager.enableStorage("trace");

  context.runInNewContext(() => {
    context.startTrace({
      componentName: "TestComponent2",
      traceId: "test-2",
      renderStart: Date.now(),
    });

    console.log("✅ Trace storage re-enabled");
    console.log(`📊 Current parent: ${context.getCurrentParentId()}\n`);
    context.endTrace("test-2");
  });

  console.log("4️⃣  Runtime Information");
  console.log("=" .repeat(50));

  const runtimeInfo = context.getRuntimeInfo();
  console.log("🖥️  Runtime Environment:");
  console.log(`  Node Version: ${runtimeInfo.nodeVersion}`);
  console.log(`  AsyncLocalStorage Available: ${runtimeInfo.asyncLocalStorageAvailable}`);
  console.log(`  Using Fallback: ${runtimeInfo.usingFallback}`);
  console.log(`  Stable Version: ${runtimeInfo.isStableVersion}`);

  console.log("\n📊 Storage Statistics:");
  const stats = manager.getAllStats();
  for (const [name, storage] of Object.entries(stats)) {
    console.log(`\n  ${name}:`);
    console.log(`    Enabled: ${storage.enabled}`);
    if (storage.enabled) {
      console.log(`    Using Fallback: ${storage.isUsingFallback}`);
      console.log(`    Available: ${storage.isAvailable}`);
      if (storage.metrics) {
        console.log(`    Hits: ${storage.metrics.hits}`);
        console.log(`    Misses: ${storage.metrics.misses}`);
        console.log(`    Errors: ${storage.metrics.errors}`);
      }
    }
  }

  console.log("\n5️⃣  Custom Storage Registration");
  console.log("=" .repeat(50));

  class CustomStorage extends (await import("../src/storage/base")).BaseAsyncStorage<{ custom: string }> {
    protected createDefaultStore() {
      return { custom: "value" };
    }
    protected validateStore(store: unknown): store is { custom: string } {
      return typeof store === "object" && store !== null && "custom" in store;
    }
  }

  const customStorage = new CustomStorage({
    name: "custom-storage",
    debugMode: true,
  });

  manager.registerStorage("custom", customStorage);
  console.log("✅ Registered custom storage");

  customStorage.run({ custom: "test-value" }, () => {
    const store = customStorage.getStore();
    console.log(`📊 Custom storage value: ${store?.custom}`);
  });

  console.log("\n✨ Demo Complete!");
  console.log("=" .repeat(50));
  console.log("\n🎯 Key Benefits of Modular Storage:");
  console.log("  ✅ Independent storage instances for different concerns");
  console.log("  ✅ Easy to enable/disable features without affecting others");
  console.log("  ✅ Better debugging with isolated storage metrics");
  console.log("  ✅ Extensible architecture for custom storage needs");
  console.log("  ✅ Type-safe storage implementations");
  console.log("  ✅ Reduced coupling between features");

  memoryStorage.dispose();
}

if (require.main === module) {
  demonstrateModularStorage().catch(console.error);
}

export { demonstrateModularStorage };
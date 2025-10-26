/**
 * Demonstration of improved Developer Experience (DX) with type-safe,
 * fast, and clean storage architecture
 */

import { storage, StorageFactory, ScopedStorageAPI } from "../src/storage";
import { configure } from "../src";

async function demonstrateImprovedDX() {
  console.log("🚀 Quzz Improved DX Demo - Type-Safe, Fast, Clean\n");

  configure({
    logLevel: "info",
    contextTracking: true,
    performance: {
      enabled: true,
      trackMemory: true,
    },
  });

  console.log("1️⃣  Type-Safe Storage with No 'any' Types");
  console.log("=".repeat(50));

  // Everything is fully typed - no 'any' types
  const traceStorage = StorageFactory.createTraceStorage({
    debugMode: false,
    maxStackDepth: 50,
  });

  const memoryStorage = StorageFactory.createMemoryStorage({
    leakThreshold: 10 * 1024 * 1024, // 10MB - type-safe number
  });

  console.log("✅ All storage instances are fully type-safe");
  console.log("✅ IntelliSense works perfectly with all APIs\n");

  console.log("2️⃣  Clean & Fluent Developer API");
  console.log("=".repeat(50));

  // Clean, intuitive API with automatic resource management
  await storage.withTrace(
    {
      componentName: "UserDashboard",
      tags: ["critical", "user-facing"],
    },
    async (traceId) => {
      console.log(`📊 Started trace: ${traceId}`);

      // Automatic performance checkpoints
      const done = storage.checkpoint("data-fetch");
      await simulateDataFetch();
      done();

      // Nested traces with automatic cleanup
      await storage.withTrace(
        {
          componentName: "UserProfile",
          parentTrace: traceId,
        },
        async () => {
          console.log("  📦 Rendering user profile");
          await simulateWork(50);
        }
      );

      console.log("✅ Automatic cleanup on completion");
    }
  );

  console.log("\n3️⃣  Scoped APIs for Feature Teams");
  console.log("=".repeat(50));

  // Each feature team can have their own scoped API
  const authAPI = storage.scope("auth");
  const paymentAPI = storage.scope("payment");

  authAPI.trace("login", () => {
    authAPI.measure("validate-credentials", () => {
      simulateWork(20);
    });
    console.log("🔐 Auth: User logged in");
  });

  paymentAPI.trace("process-payment", () => {
    paymentAPI.measure("validate-card", () => {
      simulateWork(30);
    });
    console.log("💳 Payment: Transaction processed");
  });

  console.log("\n4️⃣  Performance Optimizations");
  console.log("=".repeat(50));

  // Batch operations for better performance
  const operations = [
    () => storage.withContext(() => simulateWork(10)),
    () => storage.withContext(() => simulateWork(15)),
    () => storage.withContext(() => simulateWork(20)),
  ];

  console.time("Batch operations");
  await storage.batch(operations);
  console.timeEnd("Batch operations");
  console.log("✅ Batched operations completed efficiently");

  console.log("\n5️⃣  Memory Tracking with Clean API");
  console.log("=".repeat(50));

  storage.withMemoryTracking("large-operation", () => {
    const data = new Array(1000000).fill("test");
    console.log("📈 Allocated large array");
    data.length = 0; // Cleanup
  });

  console.log("\n6️⃣  Easy Feature Toggling");
  console.log("=".repeat(50));

  // Disable memory tracking for performance
  storage.disable("memory");
  console.log("🔧 Disabled memory tracking");

  storage.withContext(() => {
    console.log("⚡ Running without memory overhead");
  });

  // Re-enable when needed
  storage.enable("memory");
  console.log("🔧 Re-enabled memory tracking");

  console.log("\n7️⃣  Real-Time Statistics");
  console.log("=".repeat(50));

  const stats = storage.getStats();
  for (const [name, stat] of Object.entries(stats)) {
    if (stat.enabled) {
      console.log(`\n📊 ${name}:`);
      console.log(
        `  Cache hit rate: ${(
          ((stat.metrics?.hits || 0) /
            ((stat.metrics?.hits || 0) + (stat.metrics?.misses || 1))) *
          100
        ).toFixed(1)}%`
      );
      console.log(`  Errors: ${stat.metrics?.errors || 0}`);
    }
  }

  console.log("\n✨ Demo Complete!");
  console.log("=".repeat(50));
  console.log("\n🎯 Key Improvements:");
  console.log("  ✅ Zero 'any' types - fully type-safe");
  console.log("  ✅ Clean, intuitive API");
  console.log("  ✅ Automatic resource management");
  console.log("  ✅ Scoped APIs for teams");
  console.log("  ✅ Performance optimizations built-in");
  console.log("  ✅ Easy feature toggling");
  console.log("  ✅ Real-time metrics");
}

// Helper functions
function simulateWork(ms: number): void {
  const start = Date.now();
  while (Date.now() - start < ms) {
    // Simulate CPU work
  }
}

async function simulateDataFetch(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 100));
}

if (require.main === module) {
  demonstrateImprovedDX().catch(console.error);
}

export { demonstrateImprovedDX };

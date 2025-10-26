import React from "react";
import {
  withRSCTrace,
  configure,
  RSCBoundary,
  getPerformanceSummary,
} from "../src";
import { ContextManager, BaseAsyncStorage } from "../src/storage";
import type { StorageOptions } from "../src/storage/types";

// Configure quzz with all new features enabled
configure({
  logLevel: "debug",
  debugContext: true,
  enableSnapshots: true,
  verboseMode: true,
  performance: {
    enabled: true,
    warnThreshold: 100,
    trackMemory: true, // Enable memory tracking
  },
});

// Custom storage implementation for user context
interface UserContext {
  userId: string | null;
  role: string | null;
  permissions: string[];
  requestId: string;
}

class UserContextStorage extends BaseAsyncStorage<UserContext> {
  constructor(options: StorageOptions) {
    super(options);
  }

  protected createDefaultStore(): UserContext {
    return {
      userId: null,
      role: null,
      permissions: [],
      requestId: "",
    };
  }

  protected validateStore(store: unknown): store is UserContext {
    return (
      typeof store === "object" &&
      store !== null &&
      "userId" in store &&
      "permissions" in store &&
      Array.isArray((store as UserContext).permissions)
    );
  }

  setUser(userId: string, role: string, permissions: string[]): void {
    const currentStore = this.getStore();
    if (currentStore) {
      this.enterWith({
        ...currentStore,
        userId,
        role,
        permissions,
      });
    }
  }

  getCurrentUser(): { userId: string | null; role: string | null } | null {
    const store = this.getStore();
    return store ? { userId: store.userId, role: store.role } : null;
  }
}

// Initialize context manager with custom storage
const contextManager = ContextManager.getInstance({
  enableTracing: true,
  enableMemoryMetrics: true,
  enableSnapshots: true,
  debugMode: true,
});

// Register custom user storage
const userStorage = new UserContextStorage({
  name: "user-context",
  debugMode: true,
});
contextManager.registerStorage("user", userStorage, true);

// Components using the storage
async function UserDashboard({ userId }: { userId: string }) {
  // Simulate database fetch
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Access user context
  const user = userStorage.getCurrentUser();
  console.log("Current user in dashboard:", user);

  return (
    <div>
      <h2>User Dashboard</h2>
      <p>User ID: {userId}</p>
      <p>Role: {user?.role || "N/A"}</p>
    </div>
  );
}

async function AdminPanel() {
  // Check memory stats
  const memoryStats = contextManager.getMemoryStats();
  if (memoryStats) {
    console.log("Memory usage:", {
      current: memoryStats.current,
      growth: memoryStats.growth,
      leakDetected: memoryStats.leakDetected,
    });
  }

  return (
    <div>
      <h3>Admin Panel</h3>
      <p>Memory monitoring active</p>
      {memoryStats?.leakDetected && (
        <div style={{ color: "red" }}>
          Warning: Potential memory leak detected!
        </div>
      )}
    </div>
  );
}

// Wrap components with tracing
const TracedDashboard = withRSCTrace(UserDashboard, {
  componentName: "UserDashboard",
  tags: ["user", "dashboard"],
});

const TracedAdminPanel = withRSCTrace(AdminPanel, {
  componentName: "AdminPanel",
  tags: ["admin", "monitoring"],
});

// Main application component
export async function ModularStorageExample() {
  const requestId = `req-${Date.now()}`;

  // Run with user context
  return contextManager.runWithStorage(
    "user",
    {
      userId: "user-123",
      role: "admin",
      permissions: ["read", "write", "delete"],
      requestId,
    },
    async () => {
      // Capture initial snapshot
      const initialSnapshot = contextManager.captureSnapshot({
        label: "app-start",
      });
      console.log("Initial snapshot:", initialSnapshot);

      return (
        <div>
          <h1>Modular Storage Architecture Demo</h1>

          <RSCBoundary label="user-section" tags={["critical"]}>
            <TracedDashboard userId="user-123" />
          </RSCBoundary>

          <RSCBoundary
            label="admin-section"
            performance={{ warnThreshold: 50 }}
          >
            <TracedAdminPanel />
          </RSCBoundary>

          <div>
            <h2>Storage Statistics</h2>
            <button
              onClick={() => {
                const stats = contextManager.getAllStats();
                console.log("All storage stats:", stats);

                const perfSummary = getPerformanceSummary();
                console.log("Performance summary:", perfSummary);

                // Check memory trend
                const memoryTrend = contextManager.getMemoryTrend(5);
                console.log("Memory trend (last 5 snapshots):", memoryTrend);

                // Get all snapshots
                const snapshots = contextManager.getSnapshots();
                console.log("Context snapshots:", snapshots);
              }}
            >
              Log All Statistics
            </button>

            <button
              onClick={() => {
                contextManager.clearSnapshots();
                console.log("Snapshots cleared");
              }}
            >
              Clear Snapshots
            </button>
          </div>

          <div>
            <h2>Features Demonstrated</h2>
            <ul>
              <li>
                ✅ Modular storage architecture with custom UserContextStorage
              </li>
              <li>✅ Context isolation across async boundaries</li>
              <li>✅ Memory leak detection and monitoring</li>
              <li>✅ Context snapshots for debugging</li>
              <li>✅ Performance tracking with thresholds</li>
              <li>✅ Component hierarchy tracking</li>
              <li>✅ Integration with RSCBoundary and withRSCTrace</li>
            </ul>
          </div>
        </div>
      );
    }
  );
}

export default ModularStorageExample;

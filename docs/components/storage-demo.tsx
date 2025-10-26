"use client";

import { useState } from "react";
import { CodeBlock } from "./code-block";
import { Button } from "./ui";

const storageExample = `// Advanced: Custom methods and validation
import { BaseAsyncStorage } from 'quzz/storage';

interface UserState {
  userId: string;
  role: string;
  permissions: string[];
  lastAccess: number;
}

class UserStorage extends BaseAsyncStorage<UserState> {
  protected createDefaultStore(): UserState {
    return {
      userId: '',
      role: 'guest',
      permissions: [],
      lastAccess: Date.now()
    };
  }

  protected validateStore(store: unknown): store is UserState {
    return (
      typeof store === 'object' &&
      store !== null &&
      'userId' in store &&
      'permissions' in store &&
      Array.isArray((store as UserState).permissions)
    );
  }

  // Custom helper methods
  hasPermission(permission: string): boolean {
    const state = this.getStore();
    return state?.permissions.includes(permission) ?? false;
  }

  isAdmin(): boolean {
    const state = this.getStore();
    return state?.role === 'admin';
  }

  // Custom metrics
  getSessionDuration(): number {
    const state = this.getStore();
    return state ? Date.now() - state.lastAccess : 0;
  }
}

const userStorage = new UserStorage({ name: 'user', debugMode: true });

// Use in request handler
async function handleAdminRequest(userId: string) {
  return userStorage.run(
    { userId, role: 'admin', permissions: ['read', 'write'], lastAccess: Date.now() },
    async () => {
      if (userStorage.isAdmin()) {
        return <AdminDashboard />;
      }
      return <AccessDenied />;
    }
  );
}`;

const snapshotExample = `// Context Snapshots for Debugging
import { configure, getContextSnapshots, isSnapshotSupported } from 'quzz';

// Enable verbose mode with snapshots
configure({
  debugContext: true,
  enableSnapshots: true,
  verboseMode: true // Auto-capture at key points
});

// In your component
const MyComponent = withRSCTrace(
  async function MyComponent({ data }) {
    // Snapshot captured: "component-enter:MyComponent"

    try {
      const result = await processData(data);
      // Snapshot captured: "component-exit:MyComponent"
      return <Result data={result} />;
    } catch (error) {
      // Snapshot captured: "component-error:MyComponent"
      throw error;
    }
  }
);

// Analyze snapshots for debugging
if (isSnapshotSupported()) {
  const snapshots = getContextSnapshots();

  snapshots.forEach(snapshot => {
    console.log(\`Snapshot \${snapshot.label}:\`, {
      timestamp: new Date(snapshot.timestamp).toISOString(),
      stackDepth: snapshot.stackDepth,
      context: snapshot.store
    });
  });
}`;

const memoryExample = `// Memory Leak Detection
import { ContextManager } from 'quzz/storage';

// Configure with memory tracking
configure({
  performance: {
    enabled: true,
    trackMemory: true
  }
});

const contextManager = ContextManager.getInstance({
  enableMemoryMetrics: true,
  memoryOptions: {
    leakThreshold: 50 * 1024 * 1024, // 50MB
    maxSnapshots: 100
  }
});

// Monitor memory in your components
async function AdminPanel() {
  const memoryStats = contextManager.getMemoryStats();

  if (memoryStats?.leakDetected) {
    console.warn('Memory leak detected!', {
      growth: memoryStats.growth,
      baseline: memoryStats.baseline,
      current: memoryStats.current
    });
  }

  // Get memory trend over time
  const trend = contextManager.getMemoryTrend(10);
  console.log('Memory trend:', trend);

  return (
    <div>
      {memoryStats?.leakDetected && (
        <Alert>Potential memory leak detected!</Alert>
      )}
    </div>
  );
}`;

const simpleStorageExample = `// Simple request-scoped state for RSCs
import { BaseAsyncStorage } from 'quzz/storage';

// Define your state interface
interface UserState {
  userId: string | null;
  role: string | null;
}

// Create storage
class UserStorage extends BaseAsyncStorage<UserState> {
  protected createDefaultStore(): UserState {
    return { userId: null, role: null };
  }

  protected validateStore(store: unknown): store is UserState {
    return typeof store === 'object' && store !== null;
  }
}

const userStorage = new UserStorage({ name: 'user' });

// Use with run() for request isolation
async function handleRequest(userId: string) {
  return userStorage.run({ userId, role: 'admin' }, async () => {
    // All async operations within this callback share the same state
    const state = userStorage.getStore();

    return <div>Welcome {state?.userId}</div>;
  });
}

// ✨ Request-isolated, type-safe, no context bleeding.`;

export function StorageDemo() {
  const [activeTab, setActiveTab] = useState<
    "simple" | "storage" | "snapshots" | "memory"
  >("simple");

  const examples = {
    simple: {
      title: "Quick Start",
      code: simpleStorageExample,
      description:
        "Request-scoped state with run(). Safe, isolated, no context bleeding.",
    },
    storage: {
      title: "Advanced",
      code: storageExample,
      description:
        "Full control with BaseAsyncStorage. Custom methods, validation, and lifecycle hooks.",
    },
    snapshots: {
      title: "Context Snapshots",
      code: snapshotExample,
      description:
        "Capture context state at key points for debugging async flows",
    },
    memory: {
      title: "Memory Detection",
      code: memoryExample,
      description:
        "Monitor memory usage and detect potential leaks in real-time",
    },
  };

  const currentExample = examples[activeTab];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex gap-2 p-1 bg-muted rounded-none">
        {Object.entries(examples).map(([key, value]) => (
          <Button
            key={key}
            variant={activeTab === key ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab(key as typeof activeTab)}
            className="flex-1 rounded-none"
          >
            {value.title}
          </Button>
        ))}
      </div>

      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {currentExample.description}
        </p>

        <CodeBlock
          code={currentExample.code}
          language="typescript"
          lightTheme="github-light"
          darkTheme="vesper"
        />
      </div>
    </div>
  );
}

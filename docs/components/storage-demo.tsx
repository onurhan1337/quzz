"use client";

import { useState } from "react";
import { CodeBlock } from "./code-block";
import { Button } from "./ui";

const storageExample = `// Advanced: Batch operations & custom scopes
import { storage } from 'quzz/storage';

// Create feature-specific scopes
const userScope = storage.scope('user');
const analyticsScope = storage.scope('analytics');

async function UserDashboard({ userId }: { userId: string }) {
  // Batch multiple operations efficiently
  await storage.batch([
    () => userScope.measureAsync('load-profile', () => loadUserProfile(userId)),
    () => userScope.measureAsync('load-preferences', () => loadPreferences(userId)),
    () => analyticsScope.measureAsync('track-visit', () => trackPageView(userId))
  ]);

  // Use scoped tracing for better organization
  return userScope.trace('render-dashboard', async (traceId) => {
    const end = storage.checkpoint('fetch-data');
    const data = await Promise.all([
      fetchUserData(userId),
      fetchUserPosts(userId)
    ]);
    end();

    console.log('Dashboard trace:', traceId);

    return <div>Dashboard for {data[0].name}</div>;
  });
}

// Get detailed stats
async function DebugPage() {
  const stats = storage.getStats();

  return (
    <div>
      <pre>{JSON.stringify(stats, null, 2)}</pre>
    </div>
  );
}`;

const snapshotExample = `// Context Snapshots for Debugging
import { configure, getContextSnapshots, isSnapshotSupported } from 'quzz';

// Enable snapshots in your config
configure({
  debugContext: true,
  enableSnapshots: true,
  verboseMode: true // Auto-capture at entry, exit, and errors
});

// Use in any component - snapshots captured automatically
async function DataProcessor({ id }: { id: string }) {
  // Snapshot: "component-enter:DataProcessor"

  const data = await fetchComplexData(id);
  const processed = await processData(data);

  // Snapshot: "component-exit:DataProcessor"
  return <DataView data={processed} />;
}

export default DataProcessor;

// Debug snapshots in another route or API
export async function GET() {
  if (!isSnapshotSupported()) {
    return Response.json({ error: 'Snapshots not supported' });
  }

  const snapshots = getContextSnapshots();

  return Response.json({
    count: snapshots.length,
    snapshots: snapshots.map(s => ({
      label: s.label,
      time: new Date(s.timestamp).toISOString(),
      depth: s.stackDepth
    }))
  });
}`;

const memoryExample = `// Memory Leak Detection
import { configure } from 'quzz';
import { storage } from 'quzz/storage';

// Enable memory tracking
configure({
  performance: {
    enabled: true,
    trackMemory: true
  }
});

// Track memory for specific operations
async function DataProcessor({ items }: { items: any[] }) {
  return storage.withContext(async () => {
    // Automatic memory tracking
    const processedData = storage.withMemoryTracking('process-items', () => {
      return items.map(item => heavyProcessing(item));
    });

    return <ResultView data={processedData} />;
  }, { trackMemory: true });
}

// Create API endpoint to monitor memory
export async function GET() {
  const stats = storage.getStats();

  // Check memory metrics from storage stats
  const memoryMetrics = stats.memory?.memoryStats;

  if (memoryMetrics?.leakDetected) {
    return Response.json({
      warning: 'Memory leak detected',
      growth: \`\${(memoryMetrics.growth / 1024 / 1024).toFixed(2)}MB\`,
      recommendation: 'Check for unbounded caches or event listeners'
    });
  }

  return Response.json({
    status: 'healthy',
    currentMemory: memoryMetrics?.current
  });
}`;

const simpleStorageExample = `// Simple functional API - no classes needed!
import { storage } from 'quzz/storage';

// Create an isolated context for your request
async function UserProfile({ userId }: { userId: string }) {
  return storage.withContext(async () => {
    // Track performance automatically
    const end = storage.checkpoint('db-query');
    const user = await db.user.findUnique({ where: { id: userId } });
    end();

    // Track memory for heavy operations
    const data = storage.withMemoryTracking('process-data', () => {
      return processLargeDataset(user.data);
    });

    return <div>Welcome {user.name}</div>;
  }, { trackMemory: true });
}

// Scoped API for feature-specific tracking
const authAPI = storage.scope('auth');

async function LoginForm() {
  return authAPI.trace('login-attempt', async (traceId) => {
    const result = await validateCredentials();
    console.log('Trace ID:', traceId);
    return <LoginResult result={result} />;
  });
}

// ✨ Simple functions, no classes, full isolation.`;

export function StorageDemo() {
  const [activeTab, setActiveTab] = useState<
    "simple" | "storage" | "snapshots" | "memory"
  >("simple");

  const examples = {
    simple: {
      title: "Quick Start",
      code: simpleStorageExample,
      description:
        "Modern functional API. Just import 'storage' and use - no classes, no setup.",
    },
    storage: {
      title: "Advanced",
      code: storageExample,
      description:
        "Batch operations, custom scopes, and detailed stats - all functional.",
    },
    snapshots: {
      title: "Snapshots",
      code: snapshotExample,
      description:
        "Auto-capture context at key points. Debug with API routes.",
    },
    memory: {
      title: "Memory",
      code: memoryExample,
      description:
        "Track memory with withMemoryTracking(). Monitor via API endpoints.",
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

import React from "react";
import {
  withRSCTrace,
  configure,
  getContextSnapshots,
  getLatestSnapshot,
  isSnapshotSupported,
  RSCBoundary,
} from "../src";

// Configure quzz with snapshots enabled
configure({
  logLevel: "debug",
  debugContext: true,
  enableSnapshots: true,
  verboseMode: true,
  performance: {
    enabled: true,
    warnThreshold: 100,
  },
});

// Example async component
async function SlowDataFetcher({ id }: { id: string }) {
  // Simulate async data fetching
  await new Promise((resolve) => setTimeout(resolve, 50));

  const data = {
    id,
    timestamp: Date.now(),
    content: `Data for item ${id}`,
  };

  return (
    <div>
      <h3>Fetched Data</h3>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

// Wrap component with tracing
const TracedDataFetcher = withRSCTrace(SlowDataFetcher, {
  componentName: "SlowDataFetcher",
  tags: ["data-fetch", "async"],
});

// Parent component using boundary
export async function SnapshotDemo() {
  console.log("Snapshot support available:", isSnapshotSupported());

  return (
    <div>
      <h1>Context Snapshot Demo</h1>

      <RSCBoundary label="data-section" tags={["critical"]}>
        <div>
          <h2>Data Section</h2>
          <TracedDataFetcher id="item-1" />
          <TracedDataFetcher id="item-2" />
        </div>
      </RSCBoundary>

      <div>
        <h2>Snapshot Information</h2>
        <button
          onClick={() => {
            const snapshots = getContextSnapshots();
            console.log("All snapshots:", snapshots);

            const latest = getLatestSnapshot();
            if (latest) {
              console.log("Latest snapshot:", {
                label: latest.label,
                timestamp: new Date(latest.timestamp).toISOString(),
                stackDepth: latest.stackDepth,
              });
            }
          }}
        >
          Log Snapshots
        </button>
      </div>
    </div>
  );
}

export default SnapshotDemo;

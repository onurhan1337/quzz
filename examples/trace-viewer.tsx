import React from "react";
import { TraceCollector } from "quzz/visualizer/trace-collector";

export default function TraceViewer() {
  const [traces, setTraces] = React.useState<
    ReturnType<TraceCollector["getTraceTree"]>
  >([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const collector = TraceCollector.getInstance();
    collector
      .load("./traces.json")
      .then(() => {
        setTraces(collector.getTraceTree());
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading traces...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <pre style={{ whiteSpace: "pre-wrap" }}>
      {JSON.stringify(traces, null, 2)}
    </pre>
  );
}

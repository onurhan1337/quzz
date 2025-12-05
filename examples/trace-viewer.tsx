import React from "react";
import { TraceCollector } from "quzz/visualizer/trace-collector";

export default function TraceViewer() {
  const [traces, setTraces] = React.useState<
    ReturnType<TraceCollector["getTraceTree"]>
  >([]);

  React.useEffect(() => {
    const collector = TraceCollector.getInstance();
    collector.load("./traces.json").then(() => {
      setTraces(collector.getTraceTree());
    });
  }, []);

  return (
    <pre style={{ whiteSpace: "pre-wrap" }}>
      {JSON.stringify(traces, null, 2)}
    </pre>
  );
}

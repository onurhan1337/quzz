"use client";

import { useMemo, useState } from "react";
import { CodeBlock } from "@/components/code-block";

type LogLevel = "error" | "warn" | "info" | "debug" | "trace";
type OutputFormat = "pretty" | "compact" | "json" | "grouped";
type Preset = "debug" | "perf" | "minimal" | "custom";

export function ConfigDemo() {
  const [preset, setPreset] = useState<Preset>("debug");
  const [logLevel, setLogLevel] = useState<LogLevel>("debug");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("grouped");
  const [performanceEnabled, setPerformanceEnabled] = useState(true);
  const [trackMemory, setTrackMemory] = useState(false);
  const [transport, setTransport] = useState<"console" | "file" | "http">(
    "console"
  );

  const code = useMemo(() => {
    if (preset !== "custom") {
      return `import { configurePreset } from 'quzz'

configurePreset('${preset}', {
  outputFormat: '${outputFormat}',
  performance: { enabled: ${performanceEnabled}, trackMemory: ${trackMemory} },
})`;
    }

    return `import { configure, ${
      transport === "console"
        ? "createConsoleTransport"
        : transport === "file"
          ? "createFileTransport"
          : "createHttpTransport"
    } } from 'quzz'

configure({
  logLevel: '${logLevel}',
  outputFormat: '${outputFormat}',
  performance: { enabled: ${performanceEnabled}, trackMemory: ${trackMemory} },
  transports: [${
    transport === "console"
      ? "createConsoleTransport()"
      : transport === "file"
        ? "createFileTransport({ path: './quzz.log' })"
        : "createHttpTransport({ url: 'https://logs.example.com/ingest' })"
  }],
})`;
  }, [
    preset,
    logLevel,
    outputFormat,
    performanceEnabled,
    trackMemory,
    transport,
  ]);

  const preview = useMemo(() => {
    if (outputFormat === "json") {
      return `{
  "level": "${logLevel}",
  "component": "UserProfile",
  "duration": 142,
  "memory": ${performanceEnabled && trackMemory ? '"45.2 MB"' : null},
  "traceId": "trace_x1y2z3"
}`;
    }

    if (outputFormat === "grouped") {
      return `INFO UserProfile Rendering completed in 142ms
trace: trace_x1y2z3
duration: 142.00ms
${performanceEnabled && trackMemory ? "memory: 45.2MB\n" : ""}props: {"userId":"user_123"}`;
    }

    const badge =
      outputFormat === "compact" ? "✓" : logLevel === "debug" ? "🔍" : "ℹ️";
    const memory =
      performanceEnabled && trackMemory ? " (45MB) High memory usage" : "";
    return `${badge} [quzz] UserProfile rendered in 142ms${memory}`;
  }, [logLevel, outputFormat, performanceEnabled, trackMemory]);

  const pill = (active: boolean) =>
    `rounded-full border px-3 py-2 text-[13px] font-medium transition ${
      active
        ? "border-slate-300 bg-white text-slate-900 shadow-sm"
        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
    }`;

  const card =
    "rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60";

  return (
    <div className="grid lg:grid-cols-2 gap-12 items-start">
      <div className="space-y-8">
        <div className={`${card} overflow-hidden text-slate-900`}>
          <div className="p-4 border-b border-slate-200 bg-slate-50 text-sm font-medium text-muted-foreground flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
                Configurator
              </span>
              <span className="text-base text-slate-900 font-semibold leading-snug">
                Preset or custom
              </span>
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded-full border border-slate-200 bg-white text-slate-700 uppercase tracking-wide font-medium">
              Live
            </span>
          </div>

          <div className="p-6 grid sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-600">
                Preset
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(["debug", "perf", "minimal", "custom"] as Preset[]).map(
                  (p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setPreset(p);
                        if (p !== "custom") {
                          setLogLevel(p === "minimal" ? "warn" : "debug");
                          setOutputFormat(p === "perf" ? "compact" : "grouped");
                          setPerformanceEnabled(p !== "minimal");
                          setTrackMemory(p === "perf");
                          setTransport("console");
                        }
                      }}
                      title={
                        p === "debug"
                          ? "Verbose logging with snapshots/visualizer"
                          : p === "perf"
                            ? "Performance focus with memory tracking"
                            : p === "minimal"
                              ? "Minimal overhead, warnings only"
                              : "Define your own mix"
                      }
                      className={pill(preset === p)}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-600">
                Format
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  ["pretty", "compact", "json", "grouped"] as OutputFormat[]
                ).map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setOutputFormat(f);
                      setPreset("custom");
                    }}
                    title={
                      f === "pretty"
                        ? "Readable multi-line output"
                        : f === "compact"
                          ? "Single-line summaries"
                          : f === "json"
                            ? "Structured JSON for piping"
                            : "Grouped multi-line without ANSI"
                    }
                    className={pill(outputFormat === f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-600">
                Log level
              </div>
              <div className="flex flex-wrap gap-2">
                {(
                  ["error", "warn", "info", "debug", "trace"] as LogLevel[]
                ).map((level) => (
                  <button
                    key={level}
                    onClick={() => {
                      setLogLevel(level);
                      setPreset("custom");
                    }}
                    title={`Minimum log level: ${level}`}
                    className={pill(logLevel === level)}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-600">
                Performance
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={performanceEnabled}
                  onChange={() => {
                    setPerformanceEnabled(!performanceEnabled);
                    setPreset("custom");
                  }}
                  className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                  title="Enable timing metrics and render duration warnings"
                />
                <span className="text-sm text-slate-800">
                  {performanceEnabled ? "On" : "Off"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={trackMemory}
                  onChange={() => {
                    setTrackMemory(!trackMemory);
                    setPreset("custom");
                  }}
                  className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                  title="Track heap deltas and warn on high memory usage"
                />
                <span className="text-sm text-slate-800">Memory tracking</span>
              </div>
            </div>

            <div className="space-y-3 sm:col-span-2">
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-600">
                Transport
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(["console", "file", "http"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTransport(t);
                      setPreset("custom");
                    }}
                    title={
                      t === "console"
                        ? "Print to stdout"
                        : t === "file"
                          ? "Append logs to a file"
                          : "Send batched logs to an HTTP endpoint"
                    }
                    className={pill(transport === t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 self-start w-full">
        <div className={`${card} overflow-hidden`}>
          <div className="p-4 border-b border-slate-200 bg-slate-50 text-sm font-medium text-muted-foreground">
            Generated code
          </div>
          <CodeBlock
            code={code}
            language="typescript"
            lightTheme="github-light"
            darkTheme="github-dark"
            className="rounded-none border-0 bg-transparent [&>pre]:!m-0 [&>pre]:!rounded-none [&>pre]:!border-0 [&>pre]:p-4 [&>pre]:text-sm"
          />
        </div>

        <div className={`${card} overflow-hidden`}>
          <div className="p-4 border-b border-slate-200 bg-slate-50 text-sm font-medium text-muted-foreground flex items-center justify-between">
            <span>Live output</span>
            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
              {outputFormat}
            </span>
          </div>
          <pre className="p-6 text-sm leading-6 whitespace-pre-wrap font-mono text-slate-900">
            {preview}
          </pre>
        </div>
      </div>
    </div>
  );
}

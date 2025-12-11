"use client";

import { useMemo, useState } from "react";
import { Info } from "lucide-react";

type LogLevel = "info" | "debug" | "warn" | "error";
type OutputFormat = "pretty" | "compact" | "grouped";

interface Log {
  level: LogLevel;
  component: string;
  message: string;
  data?: Record<string, unknown>;
}

const DEMO_SCENARIOS: Record<string, Log[]> = {
  basic: [
    {
      level: "info",
      component: "UserProfile",
      message: "Component mounted",
      data: { userId: "user_123" },
    },
    {
      level: "info",
      component: "UserProfile",
      message: "Data fetched successfully",
      data: { loadTime: "142ms" },
    },
  ],
  performance: [
    {
      level: "info",
      component: "Dashboard",
      message: "Component rendered",
      data: { duration: "89ms" },
    },
    {
      level: "warn",
      component: "UserProfile",
      message: "Slow render detected",
      data: { duration: "523ms", threshold: "500ms" },
    },
    {
      level: "debug",
      component: "ProfileStats",
      message: "Component updated",
      data: { renderTime: "18ms" },
    },
  ],
  error: [
    { level: "info", component: "UserProfile", message: "Fetching user data" },
    {
      level: "error",
      component: "UserProfile",
      message: "Failed to fetch user",
      data: { error: "Network timeout", code: "ERR_TIMEOUT" },
    },
    {
      level: "debug",
      component: "UserProfile",
      message: "Falling back to cache",
    },
  ],
  nested: [
    {
      level: "info",
      component: "Dashboard",
      message: "Rendering tree started",
    },
    {
      level: "debug",
      component: "Dashboard → UserProfile",
      message: "Child component rendered",
      data: { depth: 1 },
    },
    {
      level: "debug",
      component: "Dashboard → UserProfile → Avatar",
      message: "Nested component rendered",
      data: { depth: 2 },
    },
    {
      level: "info",
      component: "Dashboard",
      message: "Tree render complete",
      data: { totalComponents: 3, totalTime: "142ms" },
    },
  ],
};

const LOG_ICONS: Record<LogLevel, string> = {
  info: "ℹ",
  debug: "⚙",
  warn: "⚠",
  error: "✕",
};

const LOG_COLORS: Record<LogLevel, string> = {
  info: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950",
  debug: "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950",
  warn: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950",
  error: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950",
};

const logToConsole = (log: Log) => {
  const styles: Record<LogLevel, string> = {
    info: "color: #1e40af; background: #dbeafe; padding: 2px 6px; border-radius: 4px; font-weight: bold;",
    debug:
      "color: #6d28d9; background: #ede9fe; padding: 2px 6px; border-radius: 4px; font-weight: bold;",
    warn: "color: #d97706; background: #fef3c7; padding: 2px 6px; border-radius: 4px; font-weight: bold;",
    error:
      "color: #dc2626; background: #fee2e2; padding: 2px 6px; border-radius: 4px; font-weight: bold;",
  };

  console.log(
    `%c[quzz] %c${log.component}%c ${log.message}`,
    styles[log.level],
    `font-weight: 600; color: ${
      log.level === "error"
        ? "#dc2626"
        : log.level === "warn"
          ? "#d97706"
          : "#374151"
    };`,
    "color: #374151;"
  );

  if (log.data) {
    console.table(log.data);
  }
};

const PlayIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
    <path d="M5 3.5v9l7-4.5-7-4.5z" />
  </svg>
);

export function QuzzDemo() {
  const [scenario, setScenario] =
    useState<keyof typeof DEMO_SCENARIOS>("basic");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showData, setShowData] = useState(true);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("pretty");

  const runDemo = () => {
    setIsRunning(true);
    setCurrentIndex(0);

    const logs = DEMO_SCENARIOS[scenario];
    let i = 0;
    const interval = setInterval(() => {
      if (i < logs.length) {
        logToConsole(logs[i]);
        setCurrentIndex(i + 1);
        i++;
      } else {
        clearInterval(interval);
        setIsRunning(false);
      }
    }, 800);
  };

  const displayedLogs = DEMO_SCENARIOS[scenario].slice(0, currentIndex);

  const formattedLogs = useMemo(
    () =>
      displayedLogs.map((log) => {
        if (outputFormat === "compact") {
          return `${log.component}: ${log.message} [${log.level.toUpperCase()}]`;
        }
        if (outputFormat === "grouped") {
          const rows = [
            `${log.level.toUpperCase()} ${log.component} ${log.message}`,
          ];
          if (log.data) {
            rows.push(`data: ${JSON.stringify(log.data)}`);
          }
          return rows.join("\n");
        }
        return `${LOG_ICONS[log.level]} [${log.component}] ${log.message}`;
      }),
    [displayedLogs, outputFormat]
  );

  return (
    <div className="space-y-6">
      <div className="rounded-none border border-slate-200 bg-white shadow-inner p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Scenario</div>
            <select
              value={scenario}
              onChange={(e) => {
                setScenario(e.target.value as keyof typeof DEMO_SCENARIOS);
                setCurrentIndex(0);
              }}
              disabled={isRunning}
              className="w-56 h-10 px-3 py-2 border border-slate-200 bg-white text-slate-900 rounded-md text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-slate-200 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="basic">Basic Logging</option>
              <option value="performance">Performance Tracking</option>
              <option value="error">Error Handling</option>
              <option value="nested">Nested Components</option>
            </select>
          </div>

          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Format</div>
            <div className="flex gap-2">
              {(["pretty", "compact", "grouped"] as OutputFormat[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setOutputFormat(f)}
                  className={`px-3 py-2 rounded-lg border text-sm transition ${
                    outputFormat === f
                      ? "border-neutral-900 bg-neutral-900 text-neutral-100"
                      : "border-neutral-200 bg-neutral-100 text-neutral-700 hover:border-neutral-300"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showData}
                onChange={(e) => setShowData(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              Show data
            </label>
            <button
              onClick={runDemo}
              disabled={isRunning}
              className="flex items-center rounded-none gap-2 px-4 py-2 h-10 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm tracking-tight"
            >
              <PlayIcon />
              {isRunning ? "Running..." : "Run demo"}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm tracking-tight text-slate-700">
          <Info className="w-4 h-4 text-neutral-500" />
          <span>
            Logs render here and in the console; format selection mirrors real
            transport behavior.
          </span>
        </div>
      </div>

      <div className="grid gap-3">
        {displayedLogs.length === 0 && (
          <div className="text-sm text-muted-foreground">
            Start a scenario to see the logs here.
          </div>
        )}

        {displayedLogs.map((log, index) => (
          <div
            key={`${log.component}-${index}`}
            className={`p-4 rounded-xl border shadow-sm ${LOG_COLORS[log.level]} border-slate-200 bg-white`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-semibold flex items-center gap-2">
                  <span className="font-bold">{LOG_ICONS[log.level]}</span>
                  {log.component}
                </div>
                <div className="text-sm whitespace-pre-wrap">
                  {formattedLogs[index]}
                </div>
              </div>
              <span className="text-[11px] px-2 py-1 rounded-full bg-black/5 dark:bg-white/10">
                {log.level}
              </span>
            </div>

            {showData && log.data && (
              <pre className="text-xs bg-white/50 dark:bg-black/20 rounded p-2 mt-3 overflow-x-auto">
                {JSON.stringify(log.data, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg p-3 shadow-md">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-500" />
        <div>
          This block is a client-side simulation. In real usage quzz logs during
          RSC render to the Node.js terminal and any transports you configure.
        </div>
      </div>
    </div>
  );
}

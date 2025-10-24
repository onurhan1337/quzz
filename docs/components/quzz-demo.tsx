"use client";

import { useState } from "react";
import { Info } from "lucide-react";

type LogLevel = "info" | "debug" | "warn" | "error";

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-[280px]">
          <label className="block text-sm font-medium mb-2">Scenario</label>
          <select
            value={scenario}
            onChange={(e) => {
              setScenario(e.target.value as keyof typeof DEMO_SCENARIOS);
              setCurrentIndex(0);
            }}
            disabled={isRunning}
            className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="basic">Basic Logging</option>
            <option value="performance">Performance Tracking</option>
            <option value="error">Error Handling</option>
            <option value="nested">Nested Components</option>
          </select>
          <label className="mt-2 flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showData}
              onChange={(e) => setShowData(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            Show data
          </label>
        </div>

        <button
          onClick={runDemo}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 h-10 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <PlayIcon />
          {isRunning ? "Running..." : "Run Demo"}
        </button>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm min-h-[240px] max-h-[400px] overflow-y-auto border">
        {displayedLogs.length === 0 ? (
          <div className="text-muted-foreground text-center py-16">
            Select a scenario and click &quot;Run Demo&quot; to see quzz logging
          </div>
        ) : (
          <div className="space-y-3">
            {displayedLogs.map((log, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-start gap-2">
                  <span
                    className={`inline-flex items-center justify-center w-5 h-5 rounded flex-shrink-0 ${
                      LOG_COLORS[log.level]
                    } font-bold text-xs`}
                  >
                    {LOG_ICONS[log.level]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold">{log.component}</span>
                    <span className="text-muted-foreground"> → </span>
                    <span>{log.message}</span>
                  </div>
                </div>
                {showData && log.data && (
                  <div className="ml-7 text-xs bg-background/50 rounded p-2 border">
                    {Object.entries(log.data).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <span className="text-muted-foreground">{key}:</span>
                        <span className="font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
        <div>
          <strong className="text-blue-900 dark:text-blue-100">Note:</strong>{" "}
          This is a client-side simulation for demonstration. The actual quzz
          package is designed for <strong>React Server Components</strong> and
          logs to your <strong>Node.js terminal</strong> during server-side
          rendering.
        </div>
      </div>
    </div>
  );
}

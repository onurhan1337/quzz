"use client";

import { useState } from "react";
import { Play, RefreshCw, Info } from "lucide-react";

type LogLevel = "info" | "debug" | "warn";

interface Log {
  level: LogLevel;
  label: string;
  message: string;
  duration?: string;
  computeTime?: string;
  totalTime?: string;
  waitTime?: string;
  indent: number;
}

const DEMO_SCENARIOS: Record<string, Log[]> = {
  basic: [
    {
      level: "info",
      label: "user-profile",
      message: "Boundary rendering started",
      indent: 0,
    },
    {
      level: "info",
      label: "user-profile",
      message: "Boundary completed",
      duration: "142ms",
      indent: 0,
    },
  ],
  nested: [
    {
      level: "info",
      label: "dashboard",
      message: "Boundary rendering started [tags: page, critical]",
      indent: 0,
    },
    {
      level: "info",
      label: "user-section",
      message: "Boundary rendering started [tags: user]",
      indent: 1,
    },
    {
      level: "debug",
      label: "user-avatar",
      message: "Boundary rendering started [logProps: true]",
      indent: 2,
    },
    {
      level: "debug",
      label: "user-avatar",
      message: "Boundary completed • Props: { userId: 'user_123' }",
      duration: "52ms",
      indent: 2,
    },
    {
      level: "info",
      label: "user-details",
      message: "Boundary rendering started",
      indent: 2,
    },
    {
      level: "info",
      label: "user-details",
      message: "Boundary completed",
      duration: "89ms",
      indent: 2,
    },
    {
      level: "info",
      label: "user-section",
      message: "Boundary completed",
      duration: "145ms",
      indent: 1,
    },
    {
      level: "info",
      label: "sidebar",
      message: "Boundary rendering started [tags: secondary]",
      indent: 1,
    },
    {
      level: "info",
      label: "sidebar",
      message: "Boundary completed",
      duration: "23ms",
      indent: 1,
    },
    {
      level: "info",
      label: "dashboard",
      message: "Boundary completed",
      duration: "172ms",
      indent: 0,
    },
  ],
  latency: [
    {
      level: "info",
      label: "data-fetcher",
      message: "Boundary rendering started [trackTotalLatency: true]",
      indent: 0,
    },
    {
      level: "info",
      label: "data-fetcher",
      message: "Boundary completed",
      computeTime: "45ms",
      totalTime: "234ms",
      waitTime: "189ms",
      indent: 0,
    },
  ],
  performance: [
    {
      level: "info",
      label: "page-header",
      message: "Boundary completed [warnThreshold: 200ms]",
      duration: "12ms",
      indent: 0,
    },
    {
      level: "warn",
      label: "slow-component",
      message:
        "Slow render detected! Exceeded threshold [warnThreshold: 200ms]",
      duration: "523ms",
      indent: 0,
    },
    {
      level: "info",
      label: "page-footer",
      message: "Boundary completed [trackMemory: true] • Memory: 45.2 MB",
      duration: "8ms",
      indent: 0,
    },
  ],
  advanced: [
    {
      level: "debug",
      label: "api-section",
      message:
        "Boundary rendering started [logLevel: debug, logProps: true, tags: api, critical]",
      indent: 0,
    },
    {
      level: "debug",
      label: "api-section",
      message:
        "Boundary completed • Props: { endpoint: '/api/data', method: 'GET' }",
      duration: "156ms",
      indent: 0,
    },
    {
      level: "info",
      label: "disabled-props",
      message: "Boundary rendering started [disable.props: true]",
      indent: 0,
    },
    {
      level: "info",
      label: "disabled-props",
      message: "Boundary completed (props not logged)",
      duration: "89ms",
      indent: 0,
    },
  ],
};

const LOG_ICONS: Record<LogLevel, string> = {
  info: "ℹ",
  debug: "⚙",
  warn: "⚠",
};

const LOG_COLORS: Record<LogLevel, string> = {
  info: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950",
  debug: "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950",
  warn: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950",
};

export function RSCBoundaryDemo() {
  const [scenario, setScenario] =
    useState<keyof typeof DEMO_SCENARIOS>("basic");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const runDemo = () => {
    setIsRunning(true);
    setCurrentIndex(0);

    const logs = DEMO_SCENARIOS[scenario];
    let i = 0;
    const interval = setInterval(() => {
      if (i < logs.length) {
        setCurrentIndex(i + 1);
        i++;
      } else {
        clearInterval(interval);
        setIsRunning(false);
      }
    }, 600);
  };

  const resetDemo = () => {
    setCurrentIndex(0);
    setIsRunning(false);
  };

  const displayedLogs = DEMO_SCENARIOS[scenario].slice(0, currentIndex);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-[280px]">
          <label className="block text-sm font-medium mb-2">
            RSCBoundary Scenario
          </label>
          <select
            value={scenario}
            onChange={(e) => {
              setScenario(e.target.value as keyof typeof DEMO_SCENARIOS);
              setCurrentIndex(0);
            }}
            disabled={isRunning}
            className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="basic">Basic Boundary</option>
            <option value="nested">Nested with Tags & Props</option>
            <option value="latency">Total Latency Tracking</option>
            <option value="performance">Performance Config</option>
            <option value="advanced">Advanced Options</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={resetDemo}
            disabled={isRunning}
            className="flex items-center rounded-none gap-2 px-4 py-2 h-10 border border-input bg-background hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Reset"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={runDemo}
            disabled={isRunning}
            className="flex items-center rounded-none gap-2 px-4 py-2 h-10 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Play className="w-4 h-4" />
            {isRunning ? "Running..." : "Run Demo"}
          </button>
        </div>
      </div>

      {/* Code Preview */}
      <div className="bg-muted/30 border rounded-lg p-4">
        <div className="text-xs font-semibold text-muted-foreground mb-2">
          Example Code:
        </div>
        <pre className="text-sm overflow-x-auto">
          <code className="language-tsx">
            {scenario === "basic" && (
              <span className="text-foreground/90">{`<RSCBoundary label="user-profile">
  <UserProfile userId={userId} />
</RSCBoundary>`}</span>
            )}
            {scenario === "nested" && (
              <span className="text-foreground/90">{`<RSCBoundary
  label="dashboard"
  tags={["page", "critical"]}
>
  <RSCBoundary
    label="user-section"
    tags={["user"]}
  >
    <RSCBoundary
      label="user-avatar"
      logLevel="debug"
      logProps={true}
    >
      <UserAvatar userId={userId} />
    </RSCBoundary>
    <RSCBoundary label="user-details">
      <UserDetails />
    </RSCBoundary>
  </RSCBoundary>
  <RSCBoundary
    label="sidebar"
    tags={["secondary"]}
  >
    <Sidebar />
  </RSCBoundary>
</RSCBoundary>`}</span>
            )}
            {scenario === "latency" && (
              <span className="text-foreground/90">{`<RSCBoundary
  label="data-fetcher"
  trackTotalLatency={true}
>
  <DataFetcher />
</RSCBoundary>`}</span>
            )}
            {scenario === "performance" && (
              <span className="text-foreground/90">{`<RSCBoundary
  label="page-header"
  performance={{ warnThreshold: 200 }}
>
  <Header />
</RSCBoundary>

<RSCBoundary
  label="slow-component"
  performance={{ warnThreshold: 200 }}
>
  <SlowComponent />
</RSCBoundary>

<RSCBoundary
  label="page-footer"
  performance={{
    warnThreshold: 200,
    trackMemory: true
  }}
>
  <Footer />
</RSCBoundary>`}</span>
            )}
            {scenario === "advanced" && (
              <span className="text-foreground/90">{`<RSCBoundary
  label="api-section"
  logLevel="debug"
  logProps={true}
  tags={["api", "critical"]}
>
  <ApiCalls endpoint="/api/data" />
</RSCBoundary>

<RSCBoundary
  label="disabled-props"
  disable={{ props: true }}
>
  <SensitiveData />
</RSCBoundary>`}</span>
            )}
          </code>
        </pre>
      </div>

      {/* Terminal Output */}
      <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm min-h-[280px] max-h-[400px] overflow-y-auto border">
        {displayedLogs.length === 0 ? (
          <div className="text-muted-foreground text-center py-20">
            Select a scenario and click &quot;Run Demo&quot; to see RSCBoundary
            tracing
          </div>
        ) : (
          <div className="space-y-2">
            {displayedLogs.map((log, index) => {
              const indentStyle = { paddingLeft: `${log.indent * 24}px` };

              return (
                <div
                  key={index}
                  className="flex items-start gap-2 animate-in fade-in slide-in-from-top-2 duration-300"
                  style={indentStyle}
                >
                  <span
                    className={`inline-flex items-center justify-center w-5 h-5 rounded flex-shrink-0 ${
                      LOG_COLORS[log.level]
                    } font-bold text-xs`}
                  >
                    {LOG_ICONS[log.level]}
                  </span>
                  <div className="flex-1 min-w-0 flex items-baseline gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">
                      {log.label}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {log.message}
                    </span>
                    {log.duration && (
                      <span className="text-green-600 dark:text-green-400 text-xs font-medium">
                        {log.duration}
                      </span>
                    )}
                    {log.computeTime && (
                      <span className="text-xs">
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          {log.computeTime} compute
                        </span>
                        <span className="text-muted-foreground">, </span>
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                          {log.totalTime} total
                        </span>
                        <span className="text-muted-foreground">, </span>
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          {log.waitTime} wait
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Props Reference */}
      <div className="border rounded-lg p-4 bg-card">
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          Available Props
        </h3>
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <div>
            <code className="text-xs font-bold text-primary">label</code>
            <span className="text-muted-foreground"> (required)</span>
            <p className="text-xs text-muted-foreground mt-1">
              Unique identifier for the boundary
            </p>
          </div>
          <div>
            <code className="text-xs font-bold text-primary">tags</code>
            <span className="text-muted-foreground"> string[]</span>
            <p className="text-xs text-muted-foreground mt-1">
              Categorize boundaries (e.g., ["critical", "api"])
            </p>
          </div>
          <div>
            <code className="text-xs font-bold text-primary">
              trackTotalLatency
            </code>
            <span className="text-muted-foreground"> boolean</span>
            <p className="text-xs text-muted-foreground mt-1">
              Track compute vs I/O time separately
            </p>
          </div>
          <div>
            <code className="text-xs font-bold text-primary">logLevel</code>
            <span className="text-muted-foreground">
              {" "}
              "debug" | "info" | "warn"
            </span>
            <p className="text-xs text-muted-foreground mt-1">
              Control logging verbosity
            </p>
          </div>
          <div>
            <code className="text-xs font-bold text-primary">logProps</code>
            <span className="text-muted-foreground"> boolean</span>
            <p className="text-xs text-muted-foreground mt-1">
              Log component props (auto-sanitized)
            </p>
          </div>
          <div>
            <code className="text-xs font-bold text-primary">performance</code>
            <span className="text-muted-foreground"> object</span>
            <p className="text-xs text-muted-foreground mt-1">
              warnThreshold, trackMemory, enabled
            </p>
          </div>
          <div>
            <code className="text-xs font-bold text-primary">disable</code>
            <span className="text-muted-foreground"> object</span>
            <p className="text-xs text-muted-foreground mt-1">
              Disable props, timing, or errors logging
            </p>
          </div>
          <div>
            <code className="text-xs font-bold text-primary">forceEnable</code>
            <span className="text-muted-foreground"> boolean</span>
            <p className="text-xs text-muted-foreground mt-1">
              Enable in production (not recommended)
            </p>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="flex gap-2 text-sm text-muted-foreground bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 rounded-lg p-3">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-purple-600 dark:text-purple-400" />
        <div>
          <strong className="text-purple-900 dark:text-purple-100">
            When to use RSCBoundary:
          </strong>{" "}
          Perfect for async components without default exports, fine-grained
          tracing of specific regions, or when you need total latency tracking
          (compute vs I/O time). Use{" "}
          <code className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-xs">
            withRSCTrace
          </code>{" "}
          HOC for simpler cases.
        </div>
      </div>
    </div>
  );
}

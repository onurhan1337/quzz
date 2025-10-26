"use client";

import { useState, useMemo } from "react";

type LogLevel = "info" | "debug" | "warn";
type OutputFormat = "pretty" | "json";

export function ConfigDemo() {
  const [logLevel, setLogLevel] = useState<LogLevel>("info");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("pretty");
  const [performanceEnabled, setPerformanceEnabled] = useState(true);
  const [enableSnapshots, setEnableSnapshots] = useState(false);
  const [verboseMode, setVerboseMode] = useState(false);

  // Track which parts of the code have changed
  const codeLines = useMemo(
    () => [
      {
        text: "import { configure } from 'quzz'",
        key: "import",
        dynamic: false,
      },
      { text: "", key: "blank1", dynamic: false },
      { text: "configure({", key: "config-start", dynamic: false },
      { text: `  logLevel: '${logLevel}',`, key: "logLevel", dynamic: true },
      {
        text: `  outputFormat: '${outputFormat}',`,
        key: "outputFormat",
        dynamic: true,
      },
      { text: "  performance: {", key: "perf-start", dynamic: false },
      {
        text: `    enabled: ${performanceEnabled},`,
        key: "performanceEnabled",
        dynamic: true,
      },
      { text: "    warnThreshold: 500,", key: "warn", dynamic: false },
      { text: "    trackMemory: true,", key: "memory", dynamic: false },
      { text: "  },", key: "perf-end", dynamic: false },
      { text: "  logProps: true,", key: "logProps", dynamic: false },
      {
        text: "  contextTracking: true,",
        key: "contextTracking",
        dynamic: false,
      },
      {
        text: `  enableSnapshots: ${enableSnapshots},`,
        key: "enableSnapshots",
        dynamic: true,
      },
      {
        text: `  verboseMode: ${verboseMode},`,
        key: "verboseMode",
        dynamic: true,
      },
      { text: "})", key: "config-end", dynamic: false },
    ],
    [logLevel, outputFormat, performanceEnabled, enableSnapshots, verboseMode]
  );

  const generateOutputPreview = () => {
    if (outputFormat === "json") {
      return `{
  "level": "${logLevel}",
  "component": "UserProfile",
  "duration": 142,${performanceEnabled ? '\n  "memory": "45.2 MB",' : ""}
  "props": { "userId": "user_123" }
}`;
    }

    // Pretty format
    const levelEmoji =
      logLevel === "info" ? "ℹ️" : logLevel === "debug" ? "🐛" : "⚠️";
    let output = `${levelEmoji} [quzz] UserProfile rendered in 142ms`;

    if (logLevel === "debug") {
      output += `\nProps: { userId: "user_123" }`;
    }

    if (performanceEnabled) {
      output += `\nMemory: 45.2 MB`;
    }

    if (verboseMode && enableSnapshots) {
      output += `\n[quzz:snapshot] Captured context snapshot "component-enter:UserProfile"`;
    }

    return output;
  };

  return (
    <div className="grid lg:grid-cols-2 gap-12">
      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-medium mb-6">Configuration</h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-3">
                Log Level
              </label>
              <div className="space-y-2">
                {(["error", "warn", "info", "debug"] as LogLevel[]).map(
                  (level) => (
                    <label
                      key={level}
                      className="flex items-center space-x-3 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="logLevel"
                        value={level}
                        checked={logLevel === level}
                        onChange={() => setLogLevel(level)}
                        className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700">{level}</span>
                    </label>
                  )
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">
                Output Format
              </label>
              <div className="space-y-2">
                {(["pretty", "json"] as OutputFormat[]).map((format) => (
                  <label
                    key={format}
                    className="flex items-center space-x-3 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="outputFormat"
                      value={format}
                      checked={outputFormat === format}
                      onChange={() => setOutputFormat(format)}
                      className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">{format}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">
                Performance Tracking
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={performanceEnabled}
                  onChange={() => setPerformanceEnabled(!performanceEnabled)}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span className="text-sm text-gray-700">
                  {performanceEnabled ? "Enabled" : "Disabled"}
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">
                Context Snapshots{" "}
                <span className="text-xs text-muted-foreground">(v0.3.0)</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableSnapshots}
                  onChange={() => setEnableSnapshots(!enableSnapshots)}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span className="text-sm text-gray-700">
                  {enableSnapshots ? "Enabled" : "Disabled"}
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">
                Verbose Mode{" "}
                <span className="text-xs text-muted-foreground">(v0.3.0)</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={verboseMode}
                  onChange={() => setVerboseMode(!verboseMode)}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span className="text-sm text-gray-700">
                  {verboseMode ? "Enabled" : "Disabled"}
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-medium mb-6">Preview</h3>
          <div className="space-y-6">
            <div>
              <div className="text-sm text-muted-foreground mb-3">
                Configuration
              </div>
              <div className="bg-muted rounded p-4 font-mono text-sm">
                <pre>
                  {codeLines.map((line, index) => (
                    <div key={line.key} className="leading-relaxed">
                      <span className="text-muted-foreground select-none mr-4">
                        {String(index + 1).padStart(2, " ")}
                      </span>
                      <code>
                        {line.text
                          .split(/('.*?'|\btrue\b|\bfalse\b|\b\d+\b)/g)
                          .map((part, i) => {
                            if (part.match(/^'.*?'$/)) {
                              return (
                                <span key={i} className="text-blue-600">
                                  {part}
                                </span>
                              );
                            }
                            if (part.match(/\btrue\b|\bfalse\b/)) {
                              return (
                                <span key={i} className="text-green-600">
                                  {part}
                                </span>
                              );
                            }
                            if (part.match(/\b\d+\b/)) {
                              return (
                                <span key={i} className="text-green-600">
                                  {part}
                                </span>
                              );
                            }
                            if (part.match(/\bimport\b|\bfrom\b|\bconst\b/)) {
                              return (
                                <span key={i} className="text-red-600">
                                  {part}
                                </span>
                              );
                            }
                            return <span key={i}>{part}</span>;
                          })}
                      </code>
                    </div>
                  ))}
                </pre>
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground mb-3">Output</div>
              <div className="bg-muted rounded p-4 font-mono text-sm">
                <pre>
                  {generateOutputPreview()
                    .split("\n")
                    .map((line, i) => (
                      <div key={i} className="leading-relaxed">
                        {line || "\u00A0"}
                      </div>
                    ))}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

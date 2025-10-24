"use client"

import { useState } from "react"
import { CodeBlock } from "@/components/code-block"
import { Settings, Zap, Terminal } from "lucide-react"

type LogLevel = "info" | "debug" | "warn"
type OutputFormat = "pretty" | "json"

export function ConfigDemo() {
  const [logLevel, setLogLevel] = useState<LogLevel>("info")
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("pretty")
  const [performanceEnabled, setPerformanceEnabled] = useState(true)

  const generateCode = () => {
    return `import { configure } from 'quzz'

configure({
  logLevel: '${logLevel}',
  outputFormat: '${outputFormat}',
  performance: {
    enabled: ${performanceEnabled},
    warnThreshold: 500,
    trackMemory: true,
  },
  logProps: true,
  contextTracking: true,
})`
  }

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div>
          <label className="text-sm font-bold mb-3 flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            Log Level
          </label>
          <div className="flex gap-2 mt-2">
            {(["info", "debug", "warn"] as LogLevel[]).map((level) => (
              <button
                key={level}
                onClick={() => setLogLevel(level)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  logLevel === level
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-bold mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Output Format
          </label>
          <div className="flex gap-2 mt-2">
            {(["pretty", "json"] as OutputFormat[]).map((format) => (
              <button
                key={format}
                onClick={() => setOutputFormat(format)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  outputFormat === format
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                {format}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-bold mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Performance Tracking
          </label>
          <button
            onClick={() => setPerformanceEnabled(!performanceEnabled)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              performanceEnabled
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            {performanceEnabled ? "Enabled" : "Disabled"}
          </button>
        </div>
      </div>

      <div>
        <div className="text-sm font-bold mb-3">Generated Configuration</div>
        <CodeBlock code={generateCode()} language="typescript" />
      </div>
    </div>
  )
}

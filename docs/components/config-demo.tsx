"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Settings, Zap, Terminal, Eye } from "lucide-react"

type LogLevel = "info" | "debug" | "warn"
type OutputFormat = "pretty" | "json"

export function ConfigDemo() {
  const [logLevel, setLogLevel] = useState<LogLevel>("info")
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("pretty")
  const [performanceEnabled, setPerformanceEnabled] = useState(true)

  // Track which parts of the code have changed
  const codeLines = useMemo(() => [
    { text: "import { configure } from 'quzz'", key: "import", dynamic: false },
    { text: "", key: "blank1", dynamic: false },
    { text: "configure({", key: "config-start", dynamic: false },
    { text: `  logLevel: '${logLevel}',`, key: "logLevel", dynamic: true },
    { text: `  outputFormat: '${outputFormat}',`, key: "outputFormat", dynamic: true },
    { text: "  performance: {", key: "perf-start", dynamic: false },
    { text: `    enabled: ${performanceEnabled},`, key: "performanceEnabled", dynamic: true },
    { text: "    warnThreshold: 500,", key: "warn", dynamic: false },
    { text: "    trackMemory: true,", key: "memory", dynamic: false },
    { text: "  },", key: "perf-end", dynamic: false },
    { text: "  logProps: true,", key: "logProps", dynamic: false },
    { text: "  contextTracking: true,", key: "contextTracking", dynamic: false },
    { text: "})", key: "config-end", dynamic: false },
  ], [logLevel, outputFormat, performanceEnabled])

  const generateOutputPreview = () => {
    if (outputFormat === "json") {
      return `{
  "level": "${logLevel}",
  "component": "UserProfile",
  "duration": 142,${performanceEnabled ? '\n  "memory": "45.2 MB",' : ''}
  "props": { "userId": "user_123" }
}`
    }

    // Pretty format
    const levelEmoji = logLevel === "info" ? "ℹ️" : logLevel === "debug" ? "🐛" : "⚠️"
    let output = `${levelEmoji} [quzz] UserProfile rendered in 142ms`

    if (logLevel === "debug") {
      output += `\nProps: { userId: "user_123" }`
    }

    if (performanceEnabled) {
      output += `\nMemory: 45.2 MB`
    }

    return output
  }

  const springTransition = {
    type: "spring" as const,
    stiffness: 300,
    damping: 30,
  }

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <label className="text-sm font-bold mb-3 flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            Log Level
          </label>
          <div className="flex gap-2 mt-2">
            {(["info", "debug", "warn"] as LogLevel[]).map((level, index) => (
              <motion.button
                key={level}
                onClick={() => setLogLevel(level)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  logLevel === level
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {level}
              </motion.button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-bold mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Output Format
          </label>
          <div className="flex gap-2 mt-2">
            {(["pretty", "json"] as OutputFormat[]).map((format, index) => (
              <motion.button
                key={format}
                onClick={() => setOutputFormat(format)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  outputFormat === format
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                {format}
              </motion.button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-bold mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Performance Tracking
          </label>
          <motion.button
            onClick={() => setPerformanceEnabled(!performanceEnabled)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              performanceEnabled
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {performanceEnabled ? "Enabled" : "Disabled"}
          </motion.button>
        </div>
      </motion.div>

      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div>
          <div className="text-sm font-bold mb-3">Generated Configuration</div>
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="bg-[#0d1117] p-4">
              <pre className="font-mono text-sm">
                {codeLines.map((line, index) => (
                  <motion.div
                    key={line.key}
                    layout
                    className="leading-relaxed"
                    animate={line.dynamic ? {
                      backgroundColor: ["rgba(88, 166, 255, 0.15)", "rgba(88, 166, 255, 0)"],
                    } : {}}
                    transition={line.dynamic ? {
                      ...springTransition,
                      backgroundColor: { duration: 0.6, ease: "easeOut" }
                    } : springTransition}
                  >
                    <span className="text-gray-500 select-none mr-4">{String(index + 1).padStart(2, ' ')}</span>
                    <code className="text-gray-300">
                      {line.text.split(/('.*?'|\btrue\b|\bfalse\b|\b\d+\b)/g).map((part, i) => {
                        if (part.match(/^'.*?'$/)) {
                          return <span key={i} className="text-[#a5d6ff]">{part}</span>
                        }
                        if (part.match(/\btrue\b|\bfalse\b/)) {
                          return <span key={i} className="text-[#79c0ff]">{part}</span>
                        }
                        if (part.match(/\b\d+\b/)) {
                          return <span key={i} className="text-[#79c0ff]">{part}</span>
                        }
                        if (part.match(/\bimport\b|\bfrom\b|\bconst\b/)) {
                          return <span key={i} className="text-[#ff7b72]">{part}</span>
                        }
                        return <span key={i}>{part}</span>
                      })}
                    </code>
                  </motion.div>
                ))}
              </pre>
            </div>
          </div>
        </div>

        <div>
          <div className="text-sm font-bold mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Output Preview
          </div>
          <motion.div
            layout
            className="rounded-lg border bg-card overflow-hidden"
            transition={springTransition}
          >
            <div className="bg-[#0d1117] p-4">
              <motion.div layout transition={springTransition}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${logLevel}-${outputFormat}-${performanceEnabled}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="font-mono text-sm"
                  >
                    {generateOutputPreview().split('\n').map((line, i) => (
                      <motion.div
                        key={i}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ ...springTransition, delay: i * 0.03 }}
                        className="leading-relaxed text-gray-300"
                      >
                        {line || '\u00A0'}
                      </motion.div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

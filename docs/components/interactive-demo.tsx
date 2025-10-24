"use client"

import { useState } from "react"
import { Button } from "@/components/ui"
import { Play, RotateCcw } from "lucide-react"

interface DemoLog {
  id: number
  message: string
  type: "info" | "warning" | "error"
}

export function InteractiveDemo() {
  const [logs, setLogs] = useState<DemoLog[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const runDemo = async () => {
    setIsRunning(true)
    setLogs([])

    const demoLogs: DemoLog[] = [
      { id: 1, message: "⚡ [quzz] UserProfile rendered in 142ms", type: "info" },
      { id: 2, message: "Props: { userId: \"user_123\" }", type: "info" },
      { id: 3, message: "Memory: 45.2 MB", type: "info" },
    ]

    for (const log of demoLogs) {
      await new Promise(resolve => setTimeout(resolve, 400))
      setLogs(prev => [...prev, log])
    }

    await new Promise(resolve => setTimeout(resolve, 600))
    setLogs(prev => [
      ...prev,
      { id: 4, message: "", type: "info" },
      { id: 5, message: "📦 [quzz] Dashboard (89ms)", type: "info" },
    ])

    await new Promise(resolve => setTimeout(resolve, 400))
    setLogs(prev => [
      ...prev,
      { id: 6, message: "  ├─ UserProfile (142ms)", type: "info" },
    ])

    await new Promise(resolve => setTimeout(resolve, 400))
    setLogs(prev => [
      ...prev,
      { id: 7, message: "  │  ├─ ProfileHeader (23ms)", type: "info" },
      { id: 8, message: "  │  └─ ProfileStats (18ms)", type: "info" },
    ])

    await new Promise(resolve => setTimeout(resolve, 400))
    setLogs(prev => [
      ...prev,
      { id: 9, message: "  └─ ActivityFeed (67ms)", type: "info" },
    ])

    await new Promise(resolve => setTimeout(resolve, 400))
    setLogs(prev => [
      ...prev,
      { id: 10, message: "", type: "info" },
      { id: 11, message: "Aggregate: 5 components, 339ms total", type: "info" },
    ])

    setIsRunning(false)
  }

  const reset = () => {
    setLogs([])
    setIsRunning(false)
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="ml-4 text-sm text-muted-foreground font-mono">terminal</span>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={runDemo}
            disabled={isRunning}
          >
            <Play className="w-4 h-4 mr-2" />
            Run
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={reset}
            disabled={isRunning}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>
      <div className="p-4 font-mono text-sm min-h-[300px] bg-muted/30">
        {logs.length === 0 && !isRunning && (
          <div className="text-muted-foreground text-center py-16">
            Click "Run" to see quzz in action
          </div>
        )}
        {logs.map((log) => (
          <div
            key={log.id}
            className={`leading-relaxed ${
              log.message === "" ? "h-4" : ""
            } ${
              log.type === "warning"
                ? "text-yellow-600 dark:text-yellow-400"
                : log.type === "error"
                ? "text-red-600 dark:text-red-400"
                : "text-foreground"
            }`}
          >
            {log.message}
          </div>
        ))}
      </div>
    </div>
  )
}

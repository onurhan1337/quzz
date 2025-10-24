"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
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
    <motion.div
      className="rounded-lg border bg-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="border-b p-4 flex items-center justify-between">
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            className="w-3 h-3 rounded-full bg-red-500"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          />
          <motion.div
            className="w-3 h-3 rounded-full bg-yellow-500"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, delay: 0.2 }}
          />
          <motion.div
            className="w-3 h-3 rounded-full bg-green-500"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, delay: 0.4 }}
          />
          <span className="ml-4 text-sm text-muted-foreground font-mono">terminal</span>
        </motion.div>
        <motion.div
          className="flex gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              size="sm"
              variant="ghost"
              onClick={runDemo}
              disabled={isRunning}
            >
              <Play className="w-4 h-4 mr-2" />
              Run
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              size="sm"
              variant="ghost"
              onClick={reset}
              disabled={isRunning}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </motion.div>
        </motion.div>
      </div>
      <div className="p-4 font-mono text-sm min-h-[300px] bg-muted/30 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {logs.length === 0 && !isRunning && (
            <motion.div
              className="text-muted-foreground text-center py-16"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              Click "Run" to see quzz in action
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {logs.map((log, index) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -20, filter: "blur(4px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{
                duration: 0.4,
                ease: "easeOut"
              }}
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
            </motion.div>
          ))}
        </AnimatePresence>
        {isRunning && logs.length > 0 && (
          <motion.div
            className="inline-block w-2 h-4 bg-primary ml-1"
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
      </div>
    </motion.div>
  )
}

/**
 * Performance Monitoring Examples
 */

import {
  configure,
  withRSCTrace,
  getMetrics,
  getPerformanceSummary,
  exportMetrics,
  clearMetrics,
} from 'quzz'

// ============================================
// Example 1: Enable Performance Monitoring
// ============================================

configure({
  performance: {
    enabled: true,
    warnThreshold: 500, // Warn if > 500ms
    trackMemory: true,
    aggregate: true,
  },
  logLevel: 'info',
})

async function SlowComponent() {
  // Simulate slow operation
  await new Promise(resolve => setTimeout(resolve, 600))
  return <div>Slow Component</div>
}

export const TracedSlow = withRSCTrace(SlowComponent, {
  tags: ['slow', 'needs-optimization'],
})

// ============================================
// Example 2: Get Metrics Programmatically
// ============================================

async function DashboardWithMetrics() {
  const metrics = getMetrics('SlowComponent')

  console.log('Component Metrics:', {
    avgDuration: metrics?.avgDuration,
    minDuration: metrics?.minDuration,
    maxDuration: metrics?.maxDuration,
    totalRenders: metrics?.totalRenders,
    errorCount: metrics?.errorCount,
  })

  return <div>Dashboard</div>
}

// ============================================
// Example 3: Performance Summary Endpoint
// ============================================

// In your Next.js API route: app/api/metrics/route.ts
export async function GET() {
  const summary = getPerformanceSummary()

  return Response.json({
    summary,
    metrics: exportMetrics(),
  })
}

// ============================================
// Example 4: Export Metrics for Analysis
// ============================================

async function ExportMetricsExample() {
  // Export as JSON string
  const metricsJson = exportMetrics()

  // Save to file or send to analytics
  await fetch('/api/save-metrics', {
    method: 'POST',
    body: metricsJson,
  })

  return <div>Metrics exported</div>
}

// ============================================
// Example 5: Clear Metrics Periodically
// ============================================

// Clear metrics every hour to prevent memory buildup
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      const summary = getPerformanceSummary()
      console.log('Hourly metrics:', summary)

      // Clear after logging
      clearMetrics()
    },
    60 * 60 * 1000
  )
}

// ============================================
// Example 6: Get All Component Metrics
// ============================================

async function PerformanceDashboard() {
  const allMetrics = getMetrics() // Returns Map of all components

  const sortedByAvgDuration = Array.from(allMetrics.values()).sort(
    (a, b) => b.avgDuration - a.avgDuration
  )

  return (
    <div>
      <h2>Slowest Components</h2>
      <ul>
        {sortedByAvgDuration.slice(0, 10).map(metric => (
          <li key={metric.componentName}>
            {metric.componentName}: {metric.avgDuration.toFixed(2)}ms (avg) | {metric.totalRenders} renders
          </li>
        ))}
      </ul>
    </div>
  )
}

export const TracedPerformanceDashboard = withRSCTrace(PerformanceDashboard)

// ============================================
// Example 7: Memory Tracking
// ============================================

configure({
  performance: {
    enabled: true,
    trackMemory: true, // Enable memory tracking
  },
})

async function MemoryIntensiveComponent({ data }: { data: any[] }) {
  // Process large data
  const processed = data.map(item => ({ ...item, processed: true }))

  return <div>{processed.length} items</div>
}

export const TracedMemoryIntensive = withRSCTrace(MemoryIntensiveComponent, {
  tags: ['memory-intensive'],
})

// Logs will include memory usage:
// Memory: 45.23MB / 512.00MB

// ============================================
// Example 8: Performance Budgets
// ============================================

configure({
  performance: {
    enabled: true,
    warnThreshold: 300, // Strict budget
    aggregate: true,
  },
  plugins: [
    {
      name: 'performance-budget',
      onTraceEnd: async metadata => {
        if (metadata.duration && metadata.duration > 300) {
          // Alert or fail CI/CD
          console.error(`⚠️  Performance budget exceeded: ${metadata.componentName} took ${metadata.duration}ms`)

          // Could throw in test environment
          if (process.env.NODE_ENV === 'test') {
            throw new Error(`Performance budget exceeded for ${metadata.componentName}`)
          }
        }
      },
    },
  ],
})

// ============================================
// Example 9: Real-time Performance Monitoring
// ============================================

const performanceMonitoringPlugin = {
  name: 'realtime-perf',
  onTraceEnd: async metadata => {
    if (metadata.duration) {
      // Send to real-time monitoring dashboard
      await fetch('/api/metrics/realtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          component: metadata.componentName,
          duration: metadata.duration,
          timestamp: metadata.renderEnd,
          tags: metadata.tags,
        }),
      })
    }
  },
}

configure({
  performance: {
    enabled: true,
    aggregate: true,
  },
  plugins: [performanceMonitoringPlugin],
})

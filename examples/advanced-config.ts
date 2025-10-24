/**
 * Advanced Configuration Examples
 */

import { configure, withRSCTrace, type LogEntry, type TracePlugin } from 'quzz'

// ============================================
// Example 1: Custom Formatter
// ============================================

configure({
  logLevel: 'debug',
  outputFormat: 'custom',
  formatter: (entry: LogEntry) => {
    // Custom format for your logging system
    return `[${entry.level}] ${entry.componentName}: ${entry.message} (${entry.metadata?.duration}ms)`
  },
})

// ============================================
// Example 2: Custom Transport (Send to External Service)
// ============================================

configure({
  transports: [
    // Send errors to monitoring service
    async (entry, formatted) => {
      if (entry.level === 'error' && entry.error) {
        await fetch('https://your-logging-service.com/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            component: entry.componentName,
            error: entry.error,
            timestamp: entry.timestamp,
            metadata: entry.metadata,
          }),
        })
      }
    },
    // Also log to file in development
    async (entry, formatted) => {
      if (process.env.LOG_TO_FILE) {
        const fs = await import('fs/promises')
        await fs.appendFile('./logs/rsc-trace.log', formatted + '\n')
      }
    },
  ],
})

// ============================================
// Example 3: Plugin System
// ============================================

// Create a plugin that tracks render times to a database
const analyticsPlugin: TracePlugin = {
  name: 'analytics',
  onTraceEnd: async (metadata) => {
    if (metadata.duration && metadata.duration > 100) {
      // Send to analytics
      await fetch('/api/analytics/slow-render', {
        method: 'POST',
        body: JSON.stringify({
          component: metadata.componentName,
          duration: metadata.duration,
          timestamp: metadata.renderStart,
        }),
      })
    }
  },
  onError: async (metadata, error) => {
    // Track errors
    await fetch('/api/analytics/error', {
      method: 'POST',
      body: JSON.stringify({
        component: metadata.componentName,
        error: error.message,
        stack: error.stack,
      }),
    })
  },
}

// Create a plugin that adds request context
const requestContextPlugin: TracePlugin = {
  name: 'request-context',
  onPropsCapture: (props) => {
    // Add request information to props
    return {
      ...props,
      __requestId: globalThis.__requestId, // Assuming you set this in middleware
      __userId: globalThis.__userId,
    }
  },
}

configure({
  plugins: [analyticsPlugin, requestContextPlugin],
})

// ============================================
// Example 4: Environment-Specific Configuration
// ============================================

const isDev = process.env.NODE_ENV === 'development'
const isStaging = process.env.NODE_ENV === 'staging'

configure({
  logLevel: isDev ? 'debug' : isStaging ? 'info' : 'error',
  outputFormat: isDev ? 'pretty' : 'json',
  performance: {
    enabled: true,
    warnThreshold: isDev ? 1000 : 500,
    trackMemory: isDev,
    aggregate: true,
  },
  logProps: isDev,
  throttleMs: isDev ? 0 : 1000, // Throttle in production
  sensitiveKeys: ['ssn', 'creditCard', 'bankAccount'],
})

// ============================================
// Example 5: Component Filtering
// ============================================

configure({
  // Only trace components matching this pattern
  componentFilter: /^(User|Product|Order)/,
  logLevel: 'info',
})

async function UserDashboard() {
  return <div>User Dashboard</div>
}

async function AdminPanel() {
  return <div>Admin</div>
}

// UserDashboard will be traced (matches filter)
export const TracedUserDashboard = withRSCTrace(UserDashboard)

// AdminPanel won't be traced (doesn't match filter)
export const TracedAdminPanel = withRSCTrace(AdminPanel)

// ============================================
// Example 6: JSON Output for Structured Logging
// ============================================

configure({
  outputFormat: 'json',
  logLevel: 'info',
  performance: {
    enabled: true,
    aggregate: true,
  },
})

// Output will be JSON objects that can be parsed by log aggregators like:
// - Datadog
// - CloudWatch
// - Splunk
// - ELK Stack

// ============================================
// Example 7: Selective Prop Logging
// ============================================

async function SensitiveComponent({
  userId,
  apiToken,
  data,
}: {
  userId: string
  apiToken: string
  data: any
}) {
  return <div>{data}</div>
}

export const TracedSensitive = withRSCTrace(SensitiveComponent, {
  logProps: true, // Will log props but redact 'apiToken'
  sensitiveKeys: ['apiToken'], // Additional sensitive keys
  maxPropDepth: 2, // Limit depth
})

// ============================================
// Example 8: Disable Specific Features
// ============================================

export const TracedLightweight = withRSCTrace(SomeComponent, {
  logLevel: 'error', // Only log errors
  disable: {
    props: true, // Don't log props for this component
    timing: true, // Don't track timing
  },
})

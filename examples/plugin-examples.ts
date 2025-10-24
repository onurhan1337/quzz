/**
 * Plugin System Examples
 */

import { configure, type TracePlugin, type TraceMetadata, type SerializedError } from 'quzz'

// ============================================
// Example 1: Error Reporting Plugin
// ============================================

const sentryPlugin: TracePlugin = {
  name: 'sentry-integration',
  onError: async (metadata: TraceMetadata, error: SerializedError) => {
    // Send to Sentry
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      ;(window as any).Sentry.captureException(error, {
        tags: {
          component: metadata.componentName,
          ...metadata.tags?.reduce((acc, tag) => ({ ...acc, [tag]: true }), {}),
        },
        contexts: {
          trace: {
            traceId: metadata.traceId,
            parentTrace: metadata.parentTrace,
            duration: metadata.duration,
          },
        },
      })
    }
  },
}

// ============================================
// Example 2: Request Context Plugin
// ============================================

const requestContextPlugin: TracePlugin = {
  name: 'request-context',
  onTraceStart: async (metadata: TraceMetadata) => {
    // Add request context (assuming AsyncLocalStorage)
    const requestId = (globalThis as any).__requestId
    const userId = (globalThis as any).__userId

    console.log(`[${requestId}] Starting render: ${metadata.componentName}`, {
      userId,
      traceId: metadata.traceId,
    })
  },
  onPropsCapture: props => {
    // Inject request context into props for logging
    return {
      ...props,
      __context: {
        requestId: (globalThis as any).__requestId,
        userId: (globalThis as any).__userId,
        userAgent: (globalThis as any).__userAgent,
      },
    }
  },
}

// ============================================
// Example 3: Datadog APM Plugin
// ============================================

const datadogPlugin: TracePlugin = {
  name: 'datadog-apm',
  onTraceStart: async (metadata: TraceMetadata) => {
    // Start Datadog span
    const tracer = (globalThis as any).datadogTracer
    if (tracer) {
      const span = tracer.startSpan('rsc.render', {
        resource: metadata.componentName,
        tags: metadata.tags,
      })
      ;(metadata as any).__ddSpan = span
    }
  },
  onTraceEnd: async (metadata: TraceMetadata) => {
    // Finish Datadog span
    const span = (metadata as any).__ddSpan
    if (span) {
      span.setTag('duration', metadata.duration)
      span.finish()
    }
  },
  onError: async (metadata: TraceMetadata, error: SerializedError) => {
    // Mark span as error
    const span = (metadata as any).__ddSpan
    if (span) {
      span.setTag('error', true)
      span.setTag('error.message', error.message)
      span.setTag('error.type', error.name)
      span.finish()
    }
  },
}

// ============================================
// Example 4: Rate Limiting Plugin
// ============================================

const rateLimitMap = new Map<string, number[]>()

const rateLimitPlugin: TracePlugin = {
  name: 'rate-limit-detector',
  onTraceStart: async (metadata: TraceMetadata) => {
    const now = Date.now()
    const renders = rateLimitMap.get(metadata.componentName) || []

    // Keep only renders from last 10 seconds
    const recent = renders.filter(time => now - time < 10000)
    recent.push(now)

    rateLimitMap.set(metadata.componentName, recent)

    // Warn if too many renders
    if (recent.length > 50) {
      console.warn(
        `⚠️  Possible infinite render loop: ${metadata.componentName} rendered ${recent.length} times in 10s`
      )
    }
  },
}

// ============================================
// Example 5: Feature Flag Plugin
// ============================================

const featureFlagPlugin: TracePlugin = {
  name: 'feature-flags',
  onPropsCapture: props => {
    // Check feature flags and add to props
    const flags = {
      newUI: process.env.FEATURE_NEW_UI === 'true',
      betaFeatures: process.env.FEATURE_BETA === 'true',
    }

    return {
      ...props,
      __featureFlags: flags,
    }
  },
}

// ============================================
// Example 6: Performance Budget Plugin
// ============================================

const performanceBudgetPlugin: TracePlugin = {
  name: 'performance-budget',
  onTraceEnd: async (metadata: TraceMetadata) => {
    const budgets: Record<string, number> = {
      UserProfile: 100,
      ProductList: 200,
      Dashboard: 300,
      default: 500,
    }

    const budget = budgets[metadata.componentName] || budgets.default

    if (metadata.duration && metadata.duration > budget) {
      console.error(`❌ Performance budget exceeded!
Component: ${metadata.componentName}
Budget: ${budget}ms
Actual: ${metadata.duration.toFixed(2)}ms
Exceeded by: ${(metadata.duration - budget).toFixed(2)}ms`)

      // Send alert
      await fetch('/api/alerts/performance-budget', {
        method: 'POST',
        body: JSON.stringify({
          component: metadata.componentName,
          budget,
          actual: metadata.duration,
          exceeded: metadata.duration - budget,
        }),
      })
    }
  },
}

// ============================================
// Example 7: Cache Hit/Miss Tracking Plugin
// ============================================

const cacheTrackingPlugin: TracePlugin = {
  name: 'cache-tracking',
  onPropsCapture: props => {
    // Track if data came from cache
    const cacheHit = (props as any).__cacheHit || false

    return {
      ...props,
      __cacheMetadata: {
        hit: cacheHit,
        source: cacheHit ? 'cache' : 'database',
      },
    }
  },
  onTraceEnd: async (metadata: TraceMetadata) => {
    const cacheHit = (metadata.props as any)?.__cacheMetadata?.hit

    // Log cache performance
    console.log(`[Cache] ${metadata.componentName}: ${cacheHit ? 'HIT' : 'MISS'} (${metadata.duration}ms)`)
  },
}

// ============================================
// Example 8: A/B Testing Plugin
// ============================================

const abTestingPlugin: TracePlugin = {
  name: 'ab-testing',
  onTraceStart: async (metadata: TraceMetadata) => {
    // Track component renders by variant
    const variant = (globalThis as any).__abTestVariant || 'control'

    await fetch('/api/analytics/ab-test', {
      method: 'POST',
      body: JSON.stringify({
        component: metadata.componentName,
        variant,
        timestamp: metadata.renderStart,
      }),
    })
  },
}

// ============================================
// Configure with Multiple Plugins
// ============================================

configure({
  plugins: [
    sentryPlugin,
    requestContextPlugin,
    datadogPlugin,
    rateLimitPlugin,
    featureFlagPlugin,
    performanceBudgetPlugin,
    cacheTrackingPlugin,
    abTestingPlugin,
  ],
  logLevel: 'info',
  performance: {
    enabled: true,
    aggregate: true,
  },
})

// ============================================
// Example 9: Custom Analytics Plugin
// ============================================

const analyticsPlugin: TracePlugin = {
  name: 'custom-analytics',
  onTraceStart: async metadata => {
    // Track page views / component renders
    if (typeof window !== 'undefined' && (window as any).gtag) {
      ;(window as any).gtag('event', 'component_render_start', {
        component_name: metadata.componentName,
        trace_id: metadata.traceId,
      })
    }
  },
  onTraceEnd: async metadata => {
    // Track successful renders with duration
    if (typeof window !== 'undefined' && (window as any).gtag) {
      ;(window as any).gtag('event', 'component_render_complete', {
        component_name: metadata.componentName,
        duration: metadata.duration,
        trace_id: metadata.traceId,
      })
    }
  },
  onError: async (metadata, error) => {
    // Track errors
    if (typeof window !== 'undefined' && (window as any).gtag) {
      ;(window as any).gtag('event', 'component_error', {
        component_name: metadata.componentName,
        error_message: error.message,
        error_name: error.name,
      })
    }
  },
}

// ============================================
// Example 10: Development Helper Plugin
// ============================================

const devHelperPlugin: TracePlugin = {
  name: 'dev-helper',
  onTraceEnd: async metadata => {
    // Only in development
    if (process.env.NODE_ENV === 'development') {
      // Warn about common issues
      if (metadata.duration && metadata.duration > 1000) {
        console.warn(`🐌 Slow component detected: ${metadata.componentName}
Consider:
- Adding loading states
- Implementing pagination
- Using React.lazy for code splitting
- Caching data requests`)
      }

      if (metadata.props && Object.keys(metadata.props).length > 20) {
        console.warn(`📦 Component has many props: ${metadata.componentName}
Consider:
- Grouping related props into objects
- Using composition instead of prop drilling`)
      }
    }
  },
}

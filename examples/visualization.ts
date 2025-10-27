/**
 * Trace collection and analysis examples
 *
 * Learn how to collect traces for performance analysis
 * using the built-in TraceCollector.
 */

import { configure, RSCBoundary, withRSCTrace, TraceContext } from 'quzz'

// Step 1: Enable trace collection in your configuration
configure({
  logLevel: 'info',
  outputFormat: 'pretty',
  performance: {
    enabled: true,
    warnThreshold: 500,
  },
  // Enable visualization to collect traces
  visualizer: {
    enabled: true,
    output: './traces.json',  // Where to save traces
  },
  // Track total latency for better insights
  trackTotalLatency: true,
})

// Step 2: Your components will now automatically collect trace data
export async function ApplicationRoot() {
  return (
    <RSCBoundary label="app-root" tags={["root"]}>
      <Header />
      <MainContent />
      <Footer />
    </RSCBoundary>
  )
}

const TracedHeader = withRSCTrace(
  async function Header() {
    // Simulate some async work
    await new Promise(resolve => setTimeout(resolve, 50))
    return <header>App Header</header>
  },
  { componentName: 'Header', tags: ['navigation'] }
)

async function MainContent() {
  return (
    <RSCBoundary label="main-content" tags={["content"]}>
      <div>
        <RSCBoundary label="article-list">
          <ArticleList />
        </RSCBoundary>

        <RSCBoundary label="sidebar-widgets">
          <SidebarWidgets />
        </RSCBoundary>
      </div>
    </RSCBoundary>
  )
}

// Step 3: Export traces programmatically if needed
export async function exportTracesManually() {
  const context = TraceContext.getInstance()

  // Get current trace session
  const traceData = context.exportTraceTree()

  // Save to file
  await context.saveTraces('./custom-traces.json')

  return traceData
}

// Step 4: Create a development endpoint to view traces
export async function GET(request: Request) {
  const context = TraceContext.getInstance()
  const traces = context.exportTraceTree()

  return new Response(JSON.stringify(traces, null, 2), {
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

// Step 5: Access and analyze collected traces
/*
 * After running your application with visualization enabled:
 *
 * 1. Traces will be automatically saved to ./traces.json
 *
 * 2. Access traces programmatically:
 */

import { TraceCollector } from 'quzz/visualizer/trace-collector'

export async function analyzeTraces() {
  const collector = TraceCollector.getInstance()

  const session = collector.getSession()
  console.log('Session Summary:', {
    totalTraces: session?.totalTraces,
    totalErrors: session?.totalErrors,
    slowestComponent: session?.slowestComponent,
  })

  const stats = collector.getStatistics()
  console.log('Detailed Statistics:', {
    avgDuration: stats.avgDuration,
    maxDuration: stats.maxDuration,
    componentStats: Array.from(stats.componentStats.entries()),
  })

  const errorTraces = collector.getErrorTraces()
  console.log('Error Traces:', errorTraces)

  await collector.save('./analyzed-traces.json')
}

// Example: Complex nested structure for visualization
export async function ComplexPage({ userId }: { userId: string }) {
  return (
    <RSCBoundary
      label="complex-page"
      tags={["page"]}
      trackTotalLatency={true}
    >
      <div>
        {/* Header Section */}
        <RSCBoundary label="header-section">
          <UserHeader userId={userId} />
          <NavigationMenu />
        </RSCBoundary>

        {/* Main Content */}
        <RSCBoundary label="main-section" tags={["critical"]}>
          <div className="grid">
            <RSCBoundary label="feed">
              <UserFeed userId={userId} />
            </RSCBoundary>

            <RSCBoundary label="recommendations">
              <Recommendations userId={userId} />
            </RSCBoundary>

            <RSCBoundary label="trending">
              <TrendingContent />
            </RSCBoundary>
          </div>
        </RSCBoundary>

        {/* Footer */}
        <RSCBoundary label="footer-section">
          <Footer />
        </RSCBoundary>
      </div>
    </RSCBoundary>
  )
}

// Example: Filtering traces for visualization
export async function FilteredVisualization() {
  // Configure to only collect specific components
  configure({
    visualizer: {
      enabled: true,
      output: './filtered-traces.json',
    },
    // Only trace components matching this pattern
    componentFilter: /^(Header|Footer|.*Critical)$/,
  })

  return <ApplicationRoot />
}

// Example: Performance analysis workflow
export async function PerformanceAnalysis() {
  // 1. Enable detailed performance tracking
  configure({
    performance: {
      enabled: true,
      warnThreshold: 100,
      trackMemory: true,
      aggregate: true,
    },
    visualizer: {
      enabled: true,
      output: './performance-traces.json',
    },
    trackTotalLatency: true,
  })

  // 2. Run your application under load
  // 3. Analyze programmatically or export for further analysis
  // 4. Identify bottlenecks:
  //    - Components with high wait time (I/O bound)
  //    - Components with high compute time (CPU bound)
  //    - Components with many re-renders
  //    - Error-prone components

  return (
    <RSCBoundary label="perf-test" tags={["benchmark"]}>
      <LoadTest />
    </RSCBoundary>
  )
}

// Example: Custom trace collection for specific scenarios
export async function CustomTraceCollection() {
  const startTime = Date.now()

  return (
    <RSCBoundary
      label="custom-traced"
      tags={["custom", `start-${startTime}`]}
      // Add custom metadata through tags
      performance={{
        enabled: true,
        warnThreshold: 50,
      }}
    >
      <CustomComponent />
    </RSCBoundary>
  )
}

// Helper components (mock implementations)
async function Header() { return <header>Header</header> }
async function Footer() { return <footer>Footer</footer> }
async function ArticleList() { return <div>Articles</div> }
async function SidebarWidgets() { return <aside>Widgets</aside> }
async function UserHeader({ userId }: { userId: string }) { return <div>User Header</div> }
async function NavigationMenu() { return <nav>Menu</nav> }
async function UserFeed({ userId }: { userId: string }) { return <div>Feed</div> }
async function Recommendations({ userId }: { userId: string }) { return <div>Recommendations</div> }
async function TrendingContent() { return <div>Trending</div> }
async function LoadTest() { return <div>Load Test</div> }
async function CustomComponent() { return <div>Custom</div> }

// Types for reference
interface Item {
  id: string
  type: string
  category: string
}
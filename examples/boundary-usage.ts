/**
 * RSCBoundary usage examples
 *
 * RSCBoundary provides a declarative approach to tracing React Server Components.
 * Use it when HOCs don't work well with your component structure or when you need
 * fine-grained control over trace regions.
 */

import { RSCBoundary } from 'quzz'
import { db, cache } from './your-data-layer'

// Example 1: Basic RSCBoundary usage
export async function UserProfile({ userId }: { userId: string }) {
  return (
    <RSCBoundary label="user-profile" tags={["user", "profile"]}>
      <div className="profile">
        <h1>User Profile</h1>
        {/* Component content */}
      </div>
    </RSCBoundary>
  )
}

// Example 2: Nested boundaries for granular tracing
export async function Dashboard({ userId }: { userId: string }) {
  return (
    <RSCBoundary
      label="dashboard"
      tags={["page", "dashboard"]}
      performance={{ enabled: true, warnThreshold: 1000 }}
    >
      <div className="dashboard">
        <RSCBoundary label="header" tags={["navigation"]}>
          <Header userId={userId} />
        </RSCBoundary>

        <RSCBoundary
          label="main-content"
          tags={["content", "critical"]}
          performance={{ warnThreshold: 500 }}
        >
          <div className="content">
            <RSCBoundary label="user-stats">
              <UserStats userId={userId} />
            </RSCBoundary>

            <RSCBoundary label="activity-feed">
              <ActivityFeed userId={userId} />
            </RSCBoundary>
          </div>
        </RSCBoundary>

        <RSCBoundary label="sidebar" tags={["secondary"]}>
          <Sidebar />
        </RSCBoundary>
      </div>
    </RSCBoundary>
  )
}

// Example 3: Total latency tracking
export async function DataIntensiveComponent({ dataIds }: { dataIds: string[] }) {
  return (
    <RSCBoundary
      label="data-intensive"
      trackTotalLatency={true}
      performance={{ enabled: true }}
    >
      {/* This will track both compute time and total wall clock time */}
      {/* Useful for identifying I/O bottlenecks vs compute bottlenecks */}
      <div>
        {await Promise.all(dataIds.map(id => fetchData(id)))}
      </div>
    </RSCBoundary>
  )
}

// Example 4: Error tracking with boundaries
export async function ErrorProneComponent({ id }: { id: string }) {
  return (
    <RSCBoundary
      label="error-prone"
      tags={["risky"]}
      logLevel="debug"
    >
      <div>
        {/* Errors will be captured and logged with full context */}
        <DataComponent id={id} />
      </div>
    </RSCBoundary>
  )
}

// Example 5: Conditional tracing based on environment
export async function ConditionalComponent({ data }: { data: any }) {
  const shouldTrace = process.env.NODE_ENV === 'development' || data.debug

  if (!shouldTrace) {
    return <ActualComponent data={data} />
  }

  return (
    <RSCBoundary
      label="conditional"
      logLevel="trace"
      logProps={true}
    >
      <ActualComponent data={data} />
    </RSCBoundary>
  )
}

// Example 6: Dynamic boundaries in loops
export async function ListComponent({ items }: { items: Item[] }) {
  return (
    <RSCBoundary label="list-container">
      <div className="list">
        {items.map(item => (
          <RSCBoundary
            key={item.id}
            label={`item-${item.type}`}
            tags={[item.category]}
          >
            <ItemComponent item={item} />
          </RSCBoundary>
        ))}
      </div>
    </RSCBoundary>
  )
}

// Example 7: Using RSCBoundary with Suspense
export async function SuspenseExample({ userId }: { userId: string }) {
  return (
    <RSCBoundary label="suspense-container">
      <Suspense fallback={<Loading />}>
        <RSCBoundary label="async-content">
          <AsyncUserContent userId={userId} />
        </RSCBoundary>
      </Suspense>
    </RSCBoundary>
  )
}

// Example 8: Performance monitoring with custom thresholds
export async function PerformanceCritical({ data }: { data: any }) {
  return (
    <RSCBoundary
      label="performance-critical"
      tags={["critical", "sla"]}
      performance={{
        enabled: true,
        warnThreshold: 100,  // Warn if takes more than 100ms
        trackMemory: true     // Also track memory usage
      }}
      trackTotalLatency={true}  // Track both compute and wait time
    >
      <CriticalComponent data={data} />
    </RSCBoundary>
  )
}

// Example 9: Combining with HOC for flexibility
import { withRSCTrace } from 'quzz'

const TracedInnerComponent = withRSCTrace(
  async function InnerComponent({ data }: { data: any }) {
    // Component logic
    return <div>{data.content}</div>
  },
  { componentName: 'InnerComponent' }
)

export async function HybridApproach({ data }: { data: any }) {
  return (
    <RSCBoundary label="outer-boundary">
      <div>
        {/* Using HOC inside boundary for double tracing */}
        <TracedInnerComponent data={data} />
      </div>
    </RSCBoundary>
  )
}

// Example 10: RSCBoundary with async component without default export
// This is where RSCBoundary shines vs HOC
async function AsyncDataFetcher({ query }: { query: string }) {
  const results = await db.search(query)
  return <SearchResults results={results} />
}

export async function SearchPage({ query }: { query: string }) {
  return (
    <RSCBoundary
      label="search-page"
      tags={["search"]}
    >
      <div className="search">
        <RSCBoundary label="search-fetcher">
          {/* Can't use HOC here easily since AsyncDataFetcher isn't exported */}
          <AsyncDataFetcher query={query} />
        </RSCBoundary>
      </div>
    </RSCBoundary>
  )
}
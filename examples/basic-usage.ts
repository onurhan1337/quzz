/**
 * Basic Usage Examples for quzz
 */

import { withRSCTrace, configure } from 'quzz'

// ============================================
// Example 1: Basic Zero-Config Usage
// ============================================

async function UserProfile({ userId }: { userId: string }) {
  const user = await fetchUser(userId)
  return <div>{user.name}</div>
}

export const TracedUserProfile = withRSCTrace(UserProfile)

// ============================================
// Example 2: With Component Options
// ============================================

async function ProductList({ categoryId }: { categoryId: string }) {
  const products = await fetchProducts(categoryId)
  return <ul>{products.map(p => <li key={p.id}>{p.name}</li>)}</ul>
}

export const TracedProductList = withRSCTrace(ProductList, {
  logLevel: 'info',
  logProps: true,
  tags: ['product', 'list'],
})

// ============================================
// Example 3: Global Configuration
// ============================================

// Configure once in your app root or middleware
configure({
  logLevel: 'info',
  outputFormat: 'pretty',
  performance: {
    enabled: true,
    warnThreshold: 500, // Warn if render takes > 500ms
    aggregate: true,
  },
  maxPropDepth: 2,
  maxStringLength: 100,
})

// Now all traced components use this config by default
async function Dashboard() {
  const data = await fetchDashboard()
  return <div>{data.title}</div>
}

export const TracedDashboard = withRSCTrace(Dashboard)

// ============================================
// Example 4: Custom Component Name
// ============================================

const MyComplexComponent = async ({ data }: any) => {
  return <div>{data}</div>
}

export default withRSCTrace(MyComplexComponent, {
  componentName: 'MyFeatureComponent',
  tags: ['feature', 'experimental'],
})

// ============================================
// Helper: Mock fetch functions
// ============================================

async function fetchUser(id: string) {
  return { id, name: 'John Doe' }
}

async function fetchProducts(categoryId: string) {
  return [{ id: '1', name: 'Product 1' }]
}

async function fetchDashboard() {
  return { title: 'Dashboard' }
}

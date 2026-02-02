import { RouterProvider, createRouter, createRootRoute, createRoute } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DashboardPage } from './pages/Dashboard'
import { SourcesPage } from './pages/Sources'
import { SourceDetailPage } from './pages/SourceDetail'
import { ItemsPage } from './pages/Items'
import { QueuePage } from './pages/Queue'
import { ReviewPage } from './pages/Review'

// Create query client
const queryClient = new QueryClient()

// Create root route
const rootRoute = createRootRoute()

// Create routes
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage,
})

const sourcesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sources',
  component: SourcesPage,
})

const sourceDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sources/$sourceId',
  component: SourceDetailPage,
})

const itemsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/items',
  component: ItemsPage,
})

const queueRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/queue',
  component: QueuePage,
})

const reviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/review',
  component: ReviewPage,
})

// Build route tree
const routeTree = rootRoute.addChildren([indexRoute, sourcesRoute, sourceDetailRoute, itemsRoute, queueRoute, reviewRoute])

// Create router
const router = createRouter({ routeTree })

// App wrapper (auth disabled for local development)
function AuthenticatedApp() {
  return <RouterProvider router={router} />
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthenticatedApp />
    </QueryClientProvider>
  )
}

export default App

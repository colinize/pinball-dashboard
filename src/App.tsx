import { RouterProvider, createRouter, createRootRoute, createRoute } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './lib/auth'
import { LoginPage } from './pages/Login'
import { DashboardPage } from './pages/Dashboard'
import { SourcesPage } from './pages/Sources'
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
const routeTree = rootRoute.addChildren([indexRoute, sourcesRoute, itemsRoute, queueRoute, reviewRoute])

// Create router
const router = createRouter({ routeTree })

// Auth-protected app wrapper
function AuthenticatedApp() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  return <RouterProvider router={router} />
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App

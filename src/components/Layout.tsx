import { useEffect, useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { workerApi, type WorkerState, type WorkerStatusResult } from '../api/worker'

const navItems = [
  { path: '/', label: 'Dashboard' },
  { path: '/sources', label: 'Sources' },
  { path: '/items', label: 'Items' },
  { path: '/review', label: 'Review' },
  { path: '/queue', label: 'Queue' },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [workerStatus, setWorkerStatus] = useState<WorkerStatusResult>({
    state: 'unknown',
    lastSeen: null,
    worker: null,
  })

  useEffect(() => {
    async function fetchWorkerStatus() {
      try {
        const status = await workerApi.getStatus()
        setWorkerStatus(status)
      } catch (err) {
        console.error('Failed to fetch worker status:', err)
        setWorkerStatus({ state: 'unknown', lastSeen: null, worker: null })
      }
    }

    fetchWorkerStatus()
    // Refresh every minute
    const interval = setInterval(fetchWorkerStatus, 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  Content Monitor
                </span>
              </div>
              <nav className="hidden sm:ml-8 sm:flex sm:space-x-4">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      location.pathname === item.path
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <WorkerStatusBadge status={workerStatus} />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}

function WorkerStatusBadge({ status }: { status: WorkerStatusResult }) {
  const [showTooltip, setShowTooltip] = useState(false)

  const statusConfig: Record<WorkerState, {
    color: string
    textColor: string
    bgColor: string
    label: string
    description: string
  }> = {
    online: {
      color: 'bg-green-500',
      textColor: 'text-green-700 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
      label: 'Worker Online',
      description: 'Processing feeds and downloads',
    },
    idle: {
      color: 'bg-yellow-500',
      textColor: 'text-yellow-700 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
      label: 'Worker Idle',
      description: 'Last seen recently, may be sleeping',
    },
    offline: {
      color: 'bg-gray-400',
      textColor: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-100 dark:bg-gray-700',
      label: 'Worker Offline',
      description: 'Not running - downloads paused',
    },
    unknown: {
      color: 'bg-gray-400',
      textColor: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-100 dark:bg-gray-700',
      label: 'Checking...',
      description: 'Checking worker status',
    },
  }

  const config = statusConfig[status.state]

  const formatLastSeen = (isoString: string | null) => {
    if (!isoString) return 'Never'
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="relative">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`flex items-center gap-2 px-3 py-1 rounded-full ${config.bgColor} cursor-help`}
      >
        <span className={`w-2 h-2 rounded-full ${config.color} ${status.state === 'online' ? '' : ''}`} />
        <span className={`text-xs font-medium ${config.textColor}`}>
          {config.label}
        </span>
      </div>
      {showTooltip && (
        <div className="absolute z-50 top-full right-0 mt-2 w-56 p-3 bg-gray-900 dark:bg-gray-700 text-white rounded-lg shadow-lg">
          <p className="text-sm font-medium mb-1">{config.description}</p>
          <p className="text-xs text-gray-300">
            Last seen: {formatLastSeen(status.lastSeen)}
          </p>
          {status.worker?.hostname && (
            <p className="text-xs text-gray-400 mt-1">
              Host: {status.worker.hostname}
            </p>
          )}
          {status.worker?.version && (
            <p className="text-xs text-gray-400">
              Version: {status.worker.version}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

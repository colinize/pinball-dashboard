import { useEffect, useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'

const navItems = [
  { path: '/', label: 'Dashboard' },
  { path: '/sources', label: 'Sources' },
  { path: '/items', label: 'Items' },
  { path: '/review', label: 'Review' },
  { path: '/queue', label: 'Queue' },
]

interface PipelineHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
  checks?: {
    scheduler: boolean
    database: boolean
    archive_drive: boolean
    archiver: boolean
    transcriber: boolean
  }
  issues?: string[]
}

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [health, setHealth] = useState<PipelineHealth>({ status: 'unknown' })

  useEffect(() => {
    async function fetchHealth() {
      try {
        const CONTENT_MONITOR_URL = import.meta.env.VITE_CONTENT_MONITOR_URL || 'http://localhost:8000'
        const response = await fetch(`${CONTENT_MONITOR_URL}/health`)
        if (response.ok) {
          const data = await response.json()
          setHealth(data)
        } else {
          setHealth({ status: 'unhealthy', issues: ['Content monitor unreachable'] })
        }
      } catch (err) {
        setHealth({ status: 'unhealthy', issues: ['Content monitor unreachable'] })
      }
    }

    fetchHealth()
    // Refresh every minute
    const interval = setInterval(fetchHealth, 60000)
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
              <PipelineStatusBadge health={health} />
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

function PipelineStatusBadge({ health }: { health: PipelineHealth }) {
  const [showTooltip, setShowTooltip] = useState(false)

  const statusConfig = {
    healthy: {
      color: 'bg-green-500',
      textColor: 'text-green-700 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
      label: 'Pipeline Healthy',
    },
    degraded: {
      color: 'bg-yellow-500',
      textColor: 'text-yellow-700 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
      label: 'Pipeline Degraded',
    },
    unhealthy: {
      color: 'bg-red-500',
      textColor: 'text-red-700 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/20',
      label: 'Pipeline Error',
    },
    unknown: {
      color: 'bg-gray-400',
      textColor: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-100 dark:bg-gray-700',
      label: 'Checking...',
    },
  }

  const config = statusConfig[health.status]

  return (
    <div className="relative">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`flex items-center gap-2 px-3 py-1 rounded-full ${config.bgColor} cursor-help`}
      >
        <span className={`w-2 h-2 rounded-full ${config.color} ${health.status === 'healthy' ? '' : 'animate-pulse'}`} />
        <span className={`text-xs font-medium ${config.textColor}`}>
          {config.label}
        </span>
      </div>
      {showTooltip && health.checks && (
        <div className="absolute z-50 top-full right-0 mt-2 w-64 p-3 bg-gray-900 dark:bg-gray-700 text-white rounded-lg shadow-lg">
          <div className="space-y-2 text-xs">
            {Object.entries(health.checks).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                <span className={value ? 'text-green-400' : 'text-red-400'}>
                  {value ? '✓' : '✗'}
                </span>
              </div>
            ))}
          </div>
          {health.issues && health.issues.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <p className="text-xs text-red-300 font-medium mb-1">Issues:</p>
              {health.issues.map((issue, i) => (
                <p key={i} className="text-xs text-red-200">• {issue}</p>
              ))}
            </div>
          )}
          <div className="absolute bottom-full right-4 w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-gray-900 dark:border-b-gray-700" />
        </div>
      )}
    </div>
  )
}

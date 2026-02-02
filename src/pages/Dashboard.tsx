import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Layout } from '../components/Layout'
import { supabase } from '../lib/supabase'
import { itemsApi } from '../api/items'

interface Stats {
  totalSources: number
  enabledSources: number
  aggregateSources: number
  totalItems: number
  pendingItems: number
  completeItems: number
  failedItems: number
  stuckItems: number
}

export function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [recentItems, setRecentItems] = useState<any[]>([])

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch sources stats
        const { data: sources } = await supabase.from('sources').select('enabled, aggregate')
        const totalSources = sources?.length || 0
        const enabledSources = sources?.filter(s => s.enabled).length || 0
        const aggregateSources = sources?.filter(s => s.aggregate).length || 0

        // Fetch items stats
        const { data: items } = await supabase.from('content_items').select('status')
        const totalItems = items?.length || 0
        const pendingItems = items?.filter(i => i.status === 'pending').length || 0
        const completeItems = items?.filter(i => i.status === 'complete').length || 0
        const failedItems = items?.filter(i => i.status === 'failed').length || 0

        // Get stuck items count
        const stuckItems = await itemsApi.getStuckItemsCount()

        setStats({
          totalSources,
          enabledSources,
          aggregateSources,
          totalItems,
          pendingItems,
          completeItems,
          failedItems,
          stuckItems,
        })

        // Fetch recent items
        const { data: recent } = await supabase
          .from('content_items')
          .select('*, sources(name)')
          .order('discovered_at', { ascending: false })
          .limit(10)

        setRecentItems(recent || [])
      } catch (err) {
        console.error('Failed to fetch stats:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()

    // Subscribe to realtime updates
    const channel = supabase
      .channel('dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'content_items' }, () => {
        fetchStats()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse">Loading...</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>

        {/* Stuck Items Warning */}
        {stats && stats.stuckItems > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  {stats.stuckItems} item{stats.stuckItems !== 1 ? 's' : ''} stuck in queue
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  These items have been pending for over 24 hours. The pipeline may need attention.
                </p>
              </div>
              <Link
                to="/items"
                search={{ status: 'pending' }}
                className="ml-4 px-3 py-1.5 bg-amber-600 text-white text-sm rounded-md hover:bg-amber-700"
              >
                View Items
              </Link>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Sources" value={stats?.totalSources || 0} />
          <StatCard title="Enabled Sources" value={stats?.enabledSources || 0} color="green" />
          <StatCard title="Aggregate Sources" value={stats?.aggregateSources || 0} color="blue" />
          <StatCard title="Total Items" value={stats?.totalItems || 0} />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <StatCard title="Pending" value={stats?.pendingItems || 0} color="yellow" />
          <StatCard title="Complete" value={stats?.completeItems || 0} color="green" />
          <StatCard title="Failed" value={stats?.failedItems || 0} color="red" />
        </div>

        {/* Two-column layout for Recent Items and Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Items */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Recent Items
              </h3>
              <div className="space-y-3">
                {recentItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {item.title || 'Untitled'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.sources?.name} • {new Date(item.discovered_at).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`ml-2 px-2 py-1 text-xs rounded-full ${
                        item.status === 'complete'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : item.status === 'failed'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          : item.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <ActivityFeed />
        </div>
      </div>
    </Layout>
  )
}

function ActivityFeed() {
  const [activity, setActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchActivity() {
      try {
        const CONTENT_MONITOR_URL = import.meta.env.VITE_CONTENT_MONITOR_URL || 'http://localhost:8000'
        const response = await fetch(`${CONTENT_MONITOR_URL}/api/activity?limit=15`)
        if (response.ok) {
          const data = await response.json()
          setActivity(data.activity || [])
        }
      } catch (err) {
        console.error('Failed to fetch activity:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchActivity()
    // Refresh every 30 seconds
    const interval = setInterval(fetchActivity, 30000)
    return () => clearInterval(interval)
  }, [])

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'source_checked':
        return (
          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'source_error':
      case 'source_circuit_breaker':
        return (
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      case 'item_discovered':
        return (
          <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
          </svg>
        )
      case 'item_complete':
        return (
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'item_failed':
        return (
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Activity Feed
        </h3>
        {loading ? (
          <div className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">Loading...</div>
        ) : activity.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">No recent activity</div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {activity.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 py-2 border-b border-gray-200 dark:border-gray-700 last:border-0"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getEventIcon(event.event_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white truncate">
                    {event.message}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {event.source_name && `${event.source_name} • `}
                    {formatTime(event.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  color = 'gray',
}: {
  title: string
  value: number
  color?: 'gray' | 'green' | 'blue' | 'yellow' | 'red'
}) {
  const colorClasses = {
    gray: 'bg-gray-100 dark:bg-gray-700',
    green: 'bg-green-100 dark:bg-green-900/20',
    blue: 'bg-blue-100 dark:bg-blue-900/20',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/20',
    red: 'bg-red-100 dark:bg-red-900/20',
  }

  return (
    <div className={`${colorClasses[color]} overflow-hidden shadow rounded-lg`}>
      <div className="px-4 py-5 sm:p-6">
        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
          {title}
        </dt>
        <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
          {value.toLocaleString()}
        </dd>
      </div>
    </div>
  )
}

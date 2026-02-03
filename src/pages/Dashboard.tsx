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
                  These items have been pending for over 24 hours. The worker may need attention.
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

        {/* Two-column layout for Recent Items and Source Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Items */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Recent Items
              </h3>
              <div className="space-y-3">
                {recentItems.map((item) => (
                  <RecentItemRow key={item.id} item={item} />
                ))}
              </div>
            </div>
          </div>

          {/* Source Activity */}
          <SourceActivity />
        </div>
      </div>
    </Layout>
  )
}

function RecentItemRow({ item }: { item: any }) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDate(dateStr)
  }

  // Prefer published_at over discovered_at
  const displayDate = item.published_at
    ? formatDate(item.published_at)
    : formatRelativeTime(item.discovered_at)

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {item.title || 'Untitled'}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {item.sources?.name} • {displayDate}
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
  )
}

function SourceActivity() {
  const [recentSources, setRecentSources] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRecentSources() {
      try {
        // Get sources with recent activity (recently checked or with errors)
        const { data } = await supabase
          .from('sources')
          .select('id, name, source_type, last_checked_at, last_success_at, last_error_at, last_error, consecutive_failures')
          .not('last_checked_at', 'is', null)
          .order('last_checked_at', { ascending: false })
          .limit(15)

        setRecentSources(data || [])
      } catch (err) {
        console.error('Failed to fetch source activity:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchRecentSources()
    // Refresh every minute
    const interval = setInterval(fetchRecentSources, 60000)
    return () => clearInterval(interval)
  }, [])

  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
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

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'youtube_channel':
        return '📺'
      case 'rss':
        return '📡'
      default:
        return '🌐'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Source Activity
        </h3>
        {loading ? (
          <div className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">Loading...</div>
        ) : recentSources.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">No recent activity</div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {recentSources.map((source) => {
              const hasError = source.consecutive_failures > 0
              return (
                <Link
                  key={source.id}
                  to={`/sources/${source.id}`}
                  className="flex items-start gap-3 py-2 border-b border-gray-200 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-750 -mx-2 px-2 rounded"
                >
                  <div className="flex-shrink-0 mt-0.5 text-lg">
                    {getSourceIcon(source.source_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-900 dark:text-white truncate">
                        {source.name}
                      </p>
                      {hasError && (
                        <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" title={source.last_error} />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Checked {formatRelativeTime(source.last_checked_at)}
                    </p>
                  </div>
                </Link>
              )
            })}
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

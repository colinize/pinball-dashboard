import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import { supabase } from '../lib/supabase'

interface Stats {
  totalSources: number
  enabledSources: number
  aggregateSources: number
  totalItems: number
  pendingItems: number
  completeItems: number
  failedItems: number
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

        setStats({
          totalSources,
          enabledSources,
          aggregateSources,
          totalItems,
          pendingItems,
          completeItems,
          failedItems,
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
      </div>
    </Layout>
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

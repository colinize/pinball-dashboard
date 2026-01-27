import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import { itemsApi } from '../api/items'
import { supabase } from '../lib/supabase'

export function QueuePage() {
  const [queueStatus, setQueueStatus] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  const fetchStatus = async () => {
    try {
      const status = await itemsApi.getQueueStatus()
      setQueueStatus(status)
    } catch (err) {
      console.error('Failed to fetch queue status:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()

    // Subscribe to realtime updates
    const channel = supabase
      .channel('queue-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'content_items' }, () => {
        fetchStatus()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const statusOrder = ['pending', 'archiving', 'transcribing', 'summarizing', 'complete', 'failed', 'skipped']
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500',
    archiving: 'bg-blue-500',
    transcribing: 'bg-purple-500',
    summarizing: 'bg-indigo-500',
    complete: 'bg-green-500',
    failed: 'bg-red-500',
    skipped: 'bg-gray-400',
  }

  const total = Object.values(queueStatus).reduce((sum, count) => sum + count, 0)

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Processing Queue</h1>

        {loading ? (
          <div className="animate-pulse">Loading...</div>
        ) : (
          <>
            {/* Status Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
              {statusOrder.map((status) => (
                <div
                  key={status}
                  className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg"
                >
                  <div className="px-4 py-5 sm:p-6">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate capitalize">
                      {status}
                    </dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
                      {(queueStatus[status] || 0).toLocaleString()}
                    </dd>
                  </div>
                </div>
              ))}
            </div>

            {/* Progress Bar */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Queue Distribution
              </h3>
              <div className="h-8 flex rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                {statusOrder.map((status) => {
                  const count = queueStatus[status] || 0
                  const percentage = total > 0 ? (count / total) * 100 : 0
                  if (percentage === 0) return null
                  return (
                    <div
                      key={status}
                      className={`${statusColors[status]} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                      title={`${status}: ${count} (${percentage.toFixed(1)}%)`}
                    />
                  )
                })}
              </div>
              <div className="mt-4 flex flex-wrap gap-4">
                {statusOrder.map((status) => (
                  <div key={status} className="flex items-center">
                    <div className={`w-3 h-3 rounded-full ${statusColors[status]} mr-2`} />
                    <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Summary
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Items</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {total.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Processing</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {(
                      (queueStatus['archiving'] || 0) +
                      (queueStatus['transcribing'] || 0) +
                      (queueStatus['summarizing'] || 0)
                    ).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Success Rate</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {total > 0
                      ? (
                          ((queueStatus['complete'] || 0) /
                            (total - (queueStatus['pending'] || 0) - (queueStatus['skipped'] || 0))) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}

import { useEffect, useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { Layout } from '../components/Layout'
import { sourcesApi } from '../api/sources'
import { itemsApi } from '../api/items'
import type { Source, ContentItem } from '../lib/supabase'

export function SourceDetailPage() {
  const { sourceId } = useParams({ from: '/sources/$sourceId' })
  const [source, setSource] = useState<Source | null>(null)
  const [items, setItems] = useState<ContentItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [offset, setOffset] = useState(0)
  const limit = 25

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const [sourceData, itemsData] = await Promise.all([
          sourcesApi.get(parseInt(sourceId)),
          itemsApi.list({
            source_id: parseInt(sourceId),
            status: statusFilter || undefined,
            limit,
            offset,
          }),
        ])
        setSource(sourceData)
        setItems(itemsData.items)
        setTotal(itemsData.total)
      } catch (err) {
        console.error('Failed to fetch source details:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [sourceId, statusFilter, offset])

  const handleForceCheck = async () => {
    if (!source) return
    try {
      await sourcesApi.forceCheck(source.id)
      alert(`Check triggered for ${source.name}. New items will appear shortly.`)
    } catch (err) {
      console.error('Failed to trigger check:', err)
      alert(`Failed to trigger check: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleRequeue = async (id: number) => {
    try {
      await itemsApi.requeue(id)
      // Refresh items
      const itemsData = await itemsApi.list({
        source_id: parseInt(sourceId),
        status: statusFilter || undefined,
        limit,
        offset,
      })
      setItems(itemsData.items)
      setTotal(itemsData.total)
    } catch (err) {
      console.error('Failed to requeue item:', err)
    }
  }

  if (loading && !source) {
    return (
      <Layout>
        <div className="animate-pulse">Loading...</div>
      </Layout>
    )
  }

  if (!source) {
    return (
      <Layout>
        <div className="text-red-600 dark:text-red-400">Source not found</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Link
                to="/sources"
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                ← Sources
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
              {source.name}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {source.url}
            </p>
          </div>
          <button
            onClick={handleForceCheck}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Check Now
          </button>
        </div>

        {/* Source Info */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Type:</span>{' '}
              <span className="font-medium text-gray-900 dark:text-white">
                {source.source_type}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Status:</span>{' '}
              <span
                className={`font-medium ${
                  source.enabled
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {source.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Check Interval:</span>{' '}
              <span className="font-medium text-gray-900 dark:text-white">
                {source.check_interval_minutes} min
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Last Checked:</span>{' '}
              <span className="font-medium text-gray-900 dark:text-white">
                {source.last_checked_at
                  ? new Date(source.last_checked_at).toLocaleString()
                  : 'Never'}
              </span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {source.aggregate && (
              <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                Aggregate Feed
              </span>
            )}
            {source.auto_archive && (
              <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                Auto Archive
              </span>
            )}
            {source.auto_approve && (
              <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                Trusted
              </span>
            )}
            {source.auto_transcribe && (
              <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                Auto Transcribe
              </span>
            )}
          </div>
        </div>

        {/* Items Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Items ({total})
            </h2>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setOffset(0)
              }}
              className="rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="archiving">Archiving</option>
              <option value="transcribing">Transcribing</option>
              <option value="complete">Complete</option>
              <option value="failed">Failed</option>
              <option value="skipped">Skipped</option>
            </select>
          </div>

          {/* Items Table */}
          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden rounded-lg">
            {loading ? (
              <div className="p-6 animate-pulse">Loading...</div>
            ) : items.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                No items found for this source.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Discovered
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline block truncate max-w-md"
                        >
                          {item.title || 'Untitled'}
                        </a>
                        {item.error_message && (
                          <p
                            className="mt-1 text-xs text-red-600 dark:text-red-400 truncate max-w-md"
                            title={item.error_message}
                          >
                            {item.error_message}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(item.discovered_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        {(item.status === 'failed' || item.status === 'skipped') && (
                          <button
                            onClick={() => handleRequeue(item.id)}
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900"
                          >
                            Requeue
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="flex justify-between items-center mt-4">
              <button
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Showing {offset + 1} - {Math.min(offset + limit, total)} of {total}
              </span>
              <button
                disabled={offset + limit >= total}
                onClick={() => setOffset(offset + limit)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    archiving: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    transcribing: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    summarizing: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
    complete: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    skipped: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  }

  return (
    <span className={`px-2 py-1 text-xs rounded-full ${colors[status] || colors.pending}`}>
      {status}
    </span>
  )
}

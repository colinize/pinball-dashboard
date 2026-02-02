import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import { itemsApi, type ItemsFilter } from '../api/items'
import type { ContentItem } from '../lib/supabase'

export function ItemsPage() {
  const [items, setItems] = useState<ContentItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<ItemsFilter>({ limit: 50, offset: 0 })

  const fetchItems = async () => {
    setLoading(true)
    try {
      const { items, total } = await itemsApi.list(filter)
      setItems(items)
      setTotal(total)
    } catch (err) {
      console.error('Failed to fetch items:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [filter])

  const handleRequeue = async (id: number) => {
    try {
      await itemsApi.requeue(id)
      fetchItems()
    } catch (err) {
      console.error('Failed to requeue item:', err)
    }
  }

  const handleSkip = async (id: number) => {
    try {
      await itemsApi.skip(id)
      fetchItems()
    } catch (err) {
      console.error('Failed to skip item:', err)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return
    try {
      await itemsApi.delete(id)
      fetchItems()
    } catch (err) {
      console.error('Failed to delete item:', err)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Content Items</h1>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {total.toLocaleString()} total items
          </span>
        </div>

        {/* Filters */}
        <div className="flex space-x-4">
          <select
            value={filter.status || ''}
            onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined, offset: 0 })}
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
          <select
            value={filter.content_type || ''}
            onChange={(e) => setFilter({ ...filter, content_type: e.target.value || undefined, offset: 0 })}
            className="rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
          >
            <option value="">All Types</option>
            <option value="video">Video</option>
            <option value="podcast">Podcast</option>
            <option value="article">Article</option>
          </select>
        </div>

        {/* Items Table */}
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden rounded-lg">
          {loading ? (
            <div className="p-6 animate-pulse">Loading...</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Discovered
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline truncate block max-w-xs"
                      >
                        {item.title || 'Untitled'}
                      </a>
                      {item.error_message && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400 truncate max-w-xs" title={item.error_message}>
                          {item.error_message}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {(item.sources as any)?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                        {item.content_type || 'unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(item.discovered_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      {(item.status === 'failed' || item.status === 'skipped') && (
                        <button
                          onClick={() => handleRequeue(item.id)}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900"
                        >
                          Requeue
                        </button>
                      )}
                      {item.status === 'pending' && (
                        <button
                          onClick={() => handleSkip(item.id)}
                          className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-900"
                        >
                          Skip
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center">
          <button
            disabled={(filter.offset || 0) === 0}
            onClick={() => setFilter({ ...filter, offset: Math.max(0, (filter.offset || 0) - 50) })}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing {(filter.offset || 0) + 1} - {Math.min((filter.offset || 0) + 50, total)} of {total}
          </span>
          <button
            disabled={(filter.offset || 0) + 50 >= total}
            onClick={() => setFilter({ ...filter, offset: (filter.offset || 0) + 50 })}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Next
          </button>
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

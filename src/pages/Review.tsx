import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import { supabase } from '../lib/supabase'
import type { ContentItem } from '../lib/supabase'

export function ReviewPage() {
  const [items, setItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'video' | 'podcast' | 'article'>('all')

  const fetchItems = async () => {
    setLoading(true)
    try {
      // Get items from aggregate sources that:
      // - Are not approved yet
      // - Are not from auto_approve sources
      let query = supabase
        .from('content_items')
        .select('*, sources!inner(name, aggregate, auto_approve)')
        .eq('sources.aggregate', true)
        .eq('sources.auto_approve', false)
        .eq('approved', false)
        .order('discovered_at', { ascending: false })
        .limit(100)

      if (filter !== 'all') {
        query = query.eq('content_type', filter)
      }

      const { data, error } = await query

      if (error) throw error
      setItems(data || [])
    } catch (err) {
      console.error('Failed to fetch items:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [filter])

  const handleApprove = async (id: number) => {
    try {
      await supabase
        .from('content_items')
        .update({ approved: true })
        .eq('id', id)

      setItems(items.filter(item => item.id !== id))
    } catch (err) {
      console.error('Failed to approve item:', err)
    }
  }

  const handleReject = async (id: number) => {
    try {
      // Mark as skipped so it won't show up again
      await supabase
        .from('content_items')
        .update({ status: 'skipped' })
        .eq('id', id)

      setItems(items.filter(item => item.id !== id))
    } catch (err) {
      console.error('Failed to reject item:', err)
    }
  }

  const handleBulkApprove = async () => {
    if (!confirm(`Approve all ${items.length} items?`)) return

    try {
      const ids = items.map(item => item.id)
      await supabase
        .from('content_items')
        .update({ approved: true })
        .in('id', ids)

      setItems([])
    } catch (err) {
      console.error('Failed to bulk approve:', err)
    }
  }

  const contentTypeColors: Record<string, string> = {
    video: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    podcast: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    article: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  }

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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Review Queue</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {items.length} items awaiting review
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
            >
              <option value="all">All Types</option>
              <option value="video">Videos</option>
              <option value="podcast">Podcasts</option>
              <option value="article">Articles</option>
            </select>
            {items.length > 0 && (
              <button
                onClick={handleBulkApprove}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Approve All ({items.length})
              </button>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
            <div className="text-gray-400 dark:text-gray-500 text-lg">
              No items to review
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Items from non-trusted sources will appear here for approval
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 flex items-start justify-between"
              >
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center space-x-2 mb-1">
                    {item.content_type && (
                      <span className={`px-2 py-0.5 text-xs rounded-full ${contentTypeColors[item.content_type] || 'bg-gray-100 dark:bg-gray-700'}`}>
                        {item.content_type}
                      </span>
                    )}
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {item.sources?.name}
                    </span>
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-medium text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400"
                  >
                    {item.title || 'Untitled'}
                  </a>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(item.discovered_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button
                    onClick={() => handleReject(item.id)}
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => handleApprove(item.id)}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                  >
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

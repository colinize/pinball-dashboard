import { useEffect, useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { Layout } from '../components/Layout'
import { sourcesApi } from '../api/sources'
import { itemsApi } from '../api/items'
import type { Source, ContentItem, ContentItemMetadata } from '../lib/supabase'

export function SourceDetailPage() {
  const { sourceId } = useParams({ from: '/sources/$sourceId' })
  const [source, setSource] = useState<Source | null>(null)
  const [items, setItems] = useState<ContentItem[]>([])
  const [total, setTotal] = useState(0)
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [offset, setOffset] = useState(0)
  const limit = 25

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const [sourceData, itemsData, counts] = await Promise.all([
          sourcesApi.get(parseInt(sourceId)),
          itemsApi.list({
            source_id: parseInt(sourceId),
            status: statusFilter || undefined,
            limit,
            offset,
          }),
          itemsApi.getSourceStatusCounts(parseInt(sourceId)),
        ])
        setSource(sourceData)
        setItems(itemsData.items)
        setTotal(itemsData.total)
        setStatusCounts(counts)
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
        {/* Header with Feed/Channel Metadata */}
        <SourceHeader source={source} onForceCheck={handleForceCheck} />

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

        {/* Health Status Card */}
        <HealthStatusCard source={source} />

        {/* Stats Summary */}
        <StatsSummary counts={statusCounts} onFilterClick={setStatusFilter} />

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

          {/* Items Cards */}
          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden rounded-lg">
            {loading ? (
              <div className="p-6 animate-pulse">Loading...</div>
            ) : items.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                No items found for this source.
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {items.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    sourceType={source.source_type}
                    onRequeue={handleRequeue}
                  />
                ))}
              </div>
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

function StatsSummary({
  counts,
  onFilterClick
}: {
  counts: Record<string, number>
  onFilterClick: (status: string) => void
}) {
  const totalItems = Object.values(counts).reduce((sum, c) => sum + c, 0)
  const pending = counts.pending || 0
  const complete = counts.complete || 0
  const failed = counts.failed || 0
  const archiving = counts.archiving || 0
  const transcribing = counts.transcribing || 0
  const skipped = counts.skipped || 0
  const inProgress = archiving + transcribing

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="font-medium text-gray-900 dark:text-white">
          Total: {totalItems}
        </div>
        <div className="border-l border-gray-200 dark:border-gray-700 h-6"></div>
        {pending > 0 && (
          <button
            onClick={() => onFilterClick('pending')}
            className="flex items-center gap-1.5 hover:opacity-80"
          >
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
            <span className="text-gray-600 dark:text-gray-300">{pending} Pending</span>
          </button>
        )}
        {inProgress > 0 && (
          <button
            onClick={() => onFilterClick(archiving > 0 ? 'archiving' : 'transcribing')}
            className="flex items-center gap-1.5 hover:opacity-80"
          >
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span className="text-gray-600 dark:text-gray-300">{inProgress} Processing</span>
          </button>
        )}
        {complete > 0 && (
          <button
            onClick={() => onFilterClick('complete')}
            className="flex items-center gap-1.5 hover:opacity-80"
          >
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span className="text-gray-600 dark:text-gray-300">{complete} Complete</span>
          </button>
        )}
        {failed > 0 && (
          <button
            onClick={() => onFilterClick('failed')}
            className="flex items-center gap-1.5 hover:opacity-80"
          >
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span className="text-gray-600 dark:text-gray-300">{failed} Failed</span>
          </button>
        )}
        {skipped > 0 && (
          <button
            onClick={() => onFilterClick('skipped')}
            className="flex items-center gap-1.5 hover:opacity-80"
          >
            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
            <span className="text-gray-600 dark:text-gray-300">{skipped} Skipped</span>
          </button>
        )}
      </div>
    </div>
  )
}

interface SourceMetadata {
  // RSS/Podcast metadata
  feed_title?: string
  feed_description?: string
  feed_image_url?: string
  feed_author?: string
  feed_link?: string
  // YouTube metadata
  channel_name?: string
  channel_thumbnail_url?: string
  subscriber_count?: number
  channel_description?: string
}

function SourceHeader({
  source,
  onForceCheck,
}: {
  source: Source
  onForceCheck: () => void
}) {
  // Extract metadata from config
  const config = source.config as { metadata?: SourceMetadata } | null
  const metadata = config?.metadata

  // Format subscriber count
  const formatSubscribers = (count: number | undefined) => {
    if (!count) return null
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M subscribers`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K subscribers`
    return `${count} subscribers`
  }

  const thumbnailUrl = metadata?.channel_thumbnail_url || metadata?.feed_image_url
  const title = metadata?.channel_name || metadata?.feed_title
  const description = metadata?.channel_description || metadata?.feed_description
  const subscribers = formatSubscribers(metadata?.subscriber_count)

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex gap-4">
        {/* Thumbnail/Avatar */}
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">
              {source.source_type === 'youtube_channel' ? '📺' : source.source_type === 'rss' ? '📡' : '🌐'}
            </span>
          </div>
        )}

        <div>
          <div className="flex items-center gap-2">
            <Link
              to="/sources"
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm"
            >
              ← Sources
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {title || source.name}
          </h1>
          {title && title !== source.name && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {source.name}
            </p>
          )}
          {subscribers && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {subscribers}
            </p>
          )}
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2 max-w-2xl">
              {description}
            </p>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate max-w-lg">
            {source.url}
          </p>
        </div>
      </div>

      <button
        onClick={onForceCheck}
        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex-shrink-0"
      >
        Check Now
      </button>
    </div>
  )
}

function ItemCard({
  item,
  sourceType,
  onRequeue,
}: {
  item: ContentItem
  sourceType: string
  onRequeue: (id: number) => void
}) {
  // Parse metadata from JSON
  const metadata: ContentItemMetadata = item.metadata_json ? JSON.parse(item.metadata_json) : {}

  // Generate YouTube thumbnail URL from video ID
  const getThumbnailUrl = () => {
    if (sourceType === 'youtube_channel' && item.external_id) {
      return `https://img.youtube.com/vi/${item.external_id}/mqdefault.jpg`
    }
    return null
  }

  // Format duration from seconds
  const formatDuration = (seconds: number | undefined) => {
    if (!seconds) return null
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins >= 60) {
      const hours = Math.floor(mins / 60)
      const remainMins = mins % 60
      return `${hours}:${String(remainMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    }
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  // Format view count
  const formatViewCount = (views: number | undefined) => {
    if (!views) return null
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M views`
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K views`
    return `${views} views`
  }

  // Format relative time
  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 30) return date.toLocaleDateString()
    if (diffDays > 0) return `${diffDays}d ago`
    if (diffHours > 0) return `${diffHours}h ago`
    if (diffMins > 0) return `${diffMins}m ago`
    return 'just now'
  }

  const thumbnailUrl = getThumbnailUrl()
  const duration = formatDuration(metadata.duration)
  const viewCount = formatViewCount(metadata.view_count)
  const timeAgo = formatRelativeTime(item.published_at || item.discovered_at)

  return (
    <div className="flex gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-750">
      {/* Thumbnail */}
      {thumbnailUrl ? (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0"
        >
          <div className="relative w-32 h-20 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
            <img
              src={thumbnailUrl}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {duration && (
              <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                {duration}
              </span>
            )}
          </div>
        </a>
      ) : (
        <div className="flex-shrink-0 w-32 h-20 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
          <span className="text-2xl">
            {item.content_type === 'podcast' ? '🎙️' : item.content_type === 'video' ? '🎬' : '📄'}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-2"
        >
          {item.title || 'Untitled'}
        </a>

        {/* Metadata line */}
        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
          {duration && !thumbnailUrl && <span>{duration}</span>}
          {viewCount && <span>{viewCount}</span>}
          {timeAgo && <span>{timeAgo}</span>}
        </div>

        {/* Error message */}
        {item.error_message && (
          <p
            className="mt-1 text-xs text-red-600 dark:text-red-400 line-clamp-1"
            title={item.error_message}
          >
            {item.error_message}
          </p>
        )}

        {/* Status and actions */}
        <div className="flex items-center gap-3 mt-2">
          <StatusBadge status={item.status} />
          {(item.status === 'failed' || item.status === 'skipped') && (
            <button
              onClick={() => onRequeue(item.id)}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Requeue
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function HealthStatusCard({ source }: { source: Source }) {
  const now = new Date()
  const circuitBreakerActive = source.circuit_breaker_until && new Date(source.circuit_breaker_until) > now
  const hasRecentError = source.last_error && source.consecutive_failures > 0

  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Health Status</h3>

      {circuitBreakerActive ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span className="font-medium text-red-600 dark:text-red-400">Circuit Breaker Active</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Source will not be checked until{' '}
            <span className="font-medium">
              {new Date(source.circuit_breaker_until!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </p>
          {source.consecutive_failures > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {source.consecutive_failures} consecutive failures
            </p>
          )}
        </div>
      ) : hasRecentError ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            <span className="font-medium text-yellow-600 dark:text-yellow-400">
              {source.consecutive_failures} consecutive failure{source.consecutive_failures !== 1 ? 's' : ''}
            </span>
          </div>
          {source.last_error && (
            <p className="text-sm text-gray-600 dark:text-gray-300 break-words">
              Last error: "{source.last_error}"
            </p>
          )}
          {source.last_error_at && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatRelativeTime(source.last_error_at)}
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span className="font-medium text-green-600 dark:text-green-400">Healthy</span>
          </div>
          {source.last_success_at && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Last success: {formatRelativeTime(source.last_success_at)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

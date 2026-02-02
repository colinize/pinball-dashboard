import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Layout } from '../components/Layout'
import { sourcesApi } from '../api/sources'
import type { Source, SourceCreate, SourceUpdate } from '../lib/supabase'

type SortField = 'name' | 'source_type' | 'last_checked_at'
type SortDir = 'asc' | 'desc'

export function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingSource, setEditingSource] = useState<Source | null>(null)
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const fetchSources = async () => {
    try {
      const data = await sourcesApi.list()
      setSources(data)
    } catch (err) {
      console.error('Failed to fetch sources:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSources()
  }, [])

  const handleToggleEnabled = async (source: Source) => {
    try {
      await sourcesApi.toggleEnabled(source.id, !source.enabled)
      fetchSources()
    } catch (err) {
      console.error('Failed to toggle source:', err)
    }
  }

  const handleToggleAggregate = async (source: Source) => {
    try {
      await sourcesApi.toggleAggregate(source.id, !source.aggregate)
      fetchSources()
    } catch (err) {
      console.error('Failed to toggle aggregate:', err)
    }
  }

  const handleToggleAutoArchive = async (source: Source) => {
    try {
      await sourcesApi.update(source.id, { auto_archive: !source.auto_archive })
      fetchSources()
    } catch (err) {
      console.error('Failed to toggle auto_archive:', err)
    }
  }

  const handleToggleAutoApprove = async (source: Source) => {
    try {
      await sourcesApi.update(source.id, { auto_approve: !source.auto_approve })
      fetchSources()
    } catch (err) {
      console.error('Failed to toggle auto_approve:', err)
    }
  }

  const handleBulkToggle = async (field: keyof SourceUpdate) => {
    const allOn = sources.every((s) => s[field as keyof Source])
    try {
      await sourcesApi.bulkUpdate(field, !allOn)
      fetchSources()
    } catch (err) {
      console.error(`Failed to bulk toggle ${field}:`, err)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this source?')) return
    try {
      await sourcesApi.delete(id)
      fetchSources()
    } catch (err) {
      console.error('Failed to delete source:', err)
    }
  }

  const handleForceCheck = async (source: Source) => {
    try {
      await sourcesApi.forceCheck(source.id)
      alert(`Check triggered for ${source.name}. New items will appear shortly.`)
    } catch (err) {
      console.error('Failed to trigger check:', err)
      alert(`Failed to trigger check: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sortedSources = [...sources].sort((a, b) => {
    let aVal = a[sortField]
    let bVal = b[sortField]

    // Handle nulls
    if (aVal === null) aVal = ''
    if (bVal === null) bVal = ''

    // String comparison
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      const cmp = aVal.toLowerCase().localeCompare(bVal.toLowerCase())
      return sortDir === 'asc' ? cmp : -cmp
    }

    return 0
  })

  const handleSave = async (data: SourceCreate) => {
    try {
      if (editingSource) {
        await sourcesApi.update(editingSource.id, data)
      } else {
        await sourcesApi.create(data)
      }
      setShowForm(false)
      setEditingSource(null)
      fetchSources()
    } catch (err) {
      console.error('Failed to save source:', err)
    }
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sources</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{sources.length} sources</p>
          </div>
          <button
            onClick={() => {
              setEditingSource(null)
              setShowForm(true)
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Add Source
          </button>
        </div>

        {showForm && (
          <SourceForm
            source={editingSource}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false)
              setEditingSource(null)
            }}
          />
        )}

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-x-auto">
          <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    Name
                    {sortField === 'name' && (
                      <span>{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('source_type')}
                    className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    Type
                    {sortField === 'source_type' && (
                      <span>{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                </th>
                <ToggleColumnHeader
                  label="Enabled"
                  description="Check this source for new content on a schedule"
                  field="enabled"
                  sources={sources}
                  color="green"
                  onBulkToggle={handleBulkToggle}
                />
                <ToggleColumnHeader
                  label="Aggregate"
                  description="Include items from this source in the public feed"
                  field="aggregate"
                  sources={sources}
                  color="blue"
                  onBulkToggle={handleBulkToggle}
                />
                <ToggleColumnHeader
                  label="Archive"
                  description="Automatically download and archive content locally"
                  field="auto_archive"
                  sources={sources}
                  color="purple"
                  onBulkToggle={handleBulkToggle}
                />
                <ToggleColumnHeader
                  label="Trusted"
                  description="Auto-approve items for the public feed without manual review"
                  field="auto_approve"
                  sources={sources}
                  color="yellow"
                  onBulkToggle={handleBulkToggle}
                />
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  Health
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  Last Checked
                </th>
                <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {sortedSources.map((source) => (
                <tr key={source.id}>
                  <td className="px-3 py-3 max-w-[200px]">
                    <Link
                      to="/sources/$sourceId"
                      params={{ sourceId: String(source.id) }}
                      className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline truncate block"
                    >
                      {source.name}
                    </Link>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {source.url}
                    </div>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap">
                    <span className="px-1.5 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                      {source.source_type}
                    </span>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleToggleEnabled(source)}
                      className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${
                        source.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`pointer-events-none block w-4 h-4 bg-white rounded-full transform transition-transform ${
                          source.enabled ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleToggleAggregate(source)}
                      className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${
                        source.aggregate ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`pointer-events-none block w-4 h-4 bg-white rounded-full transform transition-transform ${
                          source.aggregate ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleToggleAutoArchive(source)}
                      className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${
                        source.auto_archive ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`pointer-events-none block w-4 h-4 bg-white rounded-full transform transition-transform ${
                          source.auto_archive ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleToggleAutoApprove(source)}
                      className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${
                        source.auto_approve ? 'bg-yellow-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`pointer-events-none block w-4 h-4 bg-white rounded-full transform transition-transform ${
                          source.auto_approve ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap">
                    <HealthIndicator source={source} />
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                    {source.last_checked_at
                      ? new Date(source.last_checked_at).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-right text-sm font-medium space-x-1">
                    <button
                      onClick={() => handleForceCheck(source)}
                      className="text-green-600 dark:text-green-400 hover:text-green-900 px-1"
                      title="Check this source for new content now"
                    >
                      Check
                    </button>
                    <button
                      onClick={() => {
                        setEditingSource(source)
                        setShowForm(true)
                      }}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 px-1"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(source.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-900 px-1"
                    >
                      Del
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}

function SourceForm({
  source,
  onSave,
  onCancel,
}: {
  source: Source | null
  onSave: (data: SourceCreate) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState<SourceCreate>({
    name: source?.name || '',
    source_type: source?.source_type || 'rss',
    url: source?.url || '',
    check_interval_minutes: source?.check_interval_minutes || 360,
    enabled: source?.enabled ?? true,
    aggregate: source?.aggregate ?? false,
    auto_archive: source?.auto_archive ?? true,
    auto_approve: source?.auto_approve ?? false,
    auto_transcribe: source?.auto_transcribe ?? false,
    auto_summarize: source?.auto_summarize ?? false,
    config: source?.config || {},
  })

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        {source ? 'Edit Source' : 'Add Source'}
      </h3>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSave(formData)
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Type
            </label>
            <select
              value={formData.source_type}
              onChange={(e) =>
                setFormData({ ...formData, source_type: e.target.value as any })
              }
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
            >
              <option value="rss">RSS Feed</option>
              <option value="youtube_channel">YouTube Channel</option>
              <option value="website">Website</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              URL
            </label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Check Interval (minutes)
            </label>
            <input
              type="number"
              value={formData.check_interval_minutes}
              onChange={(e) =>
                setFormData({ ...formData, check_interval_minutes: parseInt(e.target.value) })
              }
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Enabled</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.aggregate}
              onChange={(e) => setFormData({ ...formData, aggregate: e.target.checked })}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Public Feed
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.auto_archive}
              onChange={(e) => setFormData({ ...formData, auto_archive: e.target.checked })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Auto Archive
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.auto_approve}
              onChange={(e) => setFormData({ ...formData, auto_approve: e.target.checked })}
              className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Trusted (Auto-Approve)
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.auto_transcribe}
              onChange={(e) => setFormData({ ...formData, auto_transcribe: e.target.checked })}
              className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Auto Transcribe
            </span>
          </label>
        </div>
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  )
}

const colorClasses: Record<string, { text: string; textPartial: string; dot: string; dotPartial: string; dotOff: string }> = {
  green: {
    text: 'text-green-600 dark:text-green-400',
    textPartial: 'text-green-400 dark:text-green-600',
    dot: 'bg-green-500',
    dotPartial: 'bg-green-300',
    dotOff: 'bg-gray-300 dark:bg-gray-600',
  },
  blue: {
    text: 'text-blue-600 dark:text-blue-400',
    textPartial: 'text-blue-400 dark:text-blue-600',
    dot: 'bg-blue-500',
    dotPartial: 'bg-blue-300',
    dotOff: 'bg-gray-300 dark:bg-gray-600',
  },
  purple: {
    text: 'text-purple-600 dark:text-purple-400',
    textPartial: 'text-purple-400 dark:text-purple-600',
    dot: 'bg-purple-500',
    dotPartial: 'bg-purple-300',
    dotOff: 'bg-gray-300 dark:bg-gray-600',
  },
  yellow: {
    text: 'text-yellow-600 dark:text-yellow-400',
    textPartial: 'text-yellow-400 dark:text-yellow-600',
    dot: 'bg-yellow-500',
    dotPartial: 'bg-yellow-300',
    dotOff: 'bg-gray-300 dark:bg-gray-600',
  },
}

function ToggleColumnHeader({
  label,
  description,
  field,
  sources,
  color,
  onBulkToggle,
}: {
  label: string
  description: string
  field: keyof SourceUpdate
  sources: Source[]
  color: string
  onBulkToggle: (field: keyof SourceUpdate) => void
}) {
  const [showTooltip, setShowTooltip] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null)
  const c = colorClasses[color]

  const allOn = sources.every((s) => s[field as keyof Source])
  const someOn = sources.some((s) => s[field as keyof Source])

  return (
    <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider">
      <div className="relative">
        <button
          onClick={() => onBulkToggle(field)}
          onMouseEnter={() => {
            timeoutRef.current = setTimeout(() => setShowTooltip(true), 400)
          }}
          onMouseLeave={() => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
            setShowTooltip(false)
          }}
          className={`flex items-center gap-1 text-xs font-medium uppercase tracking-wider transition-colors ${
            allOn ? c.text : someOn ? c.textPartial : 'text-gray-500 dark:text-gray-400'
          } hover:opacity-80`}
        >
          <span className={`inline-block w-2 h-2 rounded-full ${
            allOn ? c.dot : someOn ? c.dotPartial : c.dotOff
          }`} />
          {label}
        </button>
        {showTooltip && (
          <div className="absolute z-[9999] top-full left-0 mt-2 w-48 px-2 py-1.5 text-xs font-normal normal-case tracking-normal text-gray-200 bg-gray-900 dark:bg-gray-700 rounded-md shadow-lg">
            {description}
            <div className="absolute bottom-full left-4 w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-gray-900 dark:border-b-gray-700" />
          </div>
        )}
      </div>
    </th>
  )
}

function HealthIndicator({ source }: { source: Source }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Determine health status
  const isCircuitBroken = source.circuit_breaker_until && new Date(source.circuit_breaker_until) > new Date()
  const hasRecentError = source.consecutive_failures > 0
  const isHealthy = !isCircuitBroken && !hasRecentError

  let statusColor: string
  let statusText: string
  let statusDetail: string

  if (isCircuitBroken) {
    statusColor = 'bg-red-500'
    statusText = 'Disabled'
    statusDetail = `Circuit breaker active until ${new Date(source.circuit_breaker_until!).toLocaleString()}. Last error: ${source.last_error || 'Unknown'}`
  } else if (hasRecentError) {
    statusColor = source.consecutive_failures >= 2 ? 'bg-orange-500' : 'bg-yellow-500'
    statusText = `${source.consecutive_failures} failure${source.consecutive_failures !== 1 ? 's' : ''}`
    statusDetail = source.last_error || 'Unknown error'
  } else {
    statusColor = 'bg-green-500'
    statusText = 'Healthy'
    statusDetail = source.last_success_at
      ? `Last success: ${new Date(source.last_success_at).toLocaleString()}`
      : 'No recent activity'
  }

  return (
    <div className="relative">
      <div
        onMouseEnter={() => {
          timeoutRef.current = setTimeout(() => setShowTooltip(true), 300)
        }}
        onMouseLeave={() => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current)
          setShowTooltip(false)
        }}
        className="flex items-center gap-1.5 cursor-help"
      >
        <span className={`inline-block w-2 h-2 rounded-full ${statusColor}`} />
        <span className={`text-xs ${isHealthy ? 'text-gray-500 dark:text-gray-400' : isCircuitBroken ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
          {statusText}
        </span>
      </div>
      {showTooltip && (
        <div className="absolute z-[9999] top-full left-0 mt-2 w-64 px-2 py-1.5 text-xs font-normal text-gray-200 bg-gray-900 dark:bg-gray-700 rounded-md shadow-lg">
          {statusDetail}
          <div className="absolute bottom-full left-4 w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-gray-900 dark:border-b-gray-700" />
        </div>
      )}
    </div>
  )
}

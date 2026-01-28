import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import { sourcesApi } from '../api/sources'
import type { Source, SourceCreate, SourceUpdate } from '../lib/supabase'

export function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingSource, setEditingSource] = useState<Source | null>(null)

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sources</h1>
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

        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  <button
                    onClick={() => handleBulkToggle('enabled')}
                    className={`flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
                      sources.every(s => s.enabled)
                        ? 'text-green-600 dark:text-green-400'
                        : sources.some(s => s.enabled)
                        ? 'text-green-400 dark:text-green-600'
                        : 'text-gray-500 dark:text-gray-400'
                    } hover:text-green-500`}
                    title={sources.every(s => s.enabled) ? 'Disable all' : 'Enable all'}
                  >
                    <span className={`inline-block w-2 h-2 rounded-full ${
                      sources.every(s => s.enabled) ? 'bg-green-500' : sources.some(s => s.enabled) ? 'bg-green-300' : 'bg-gray-300 dark:bg-gray-600'
                    }`} />
                    Enabled
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  <button
                    onClick={() => handleBulkToggle('aggregate')}
                    className={`flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
                      sources.every(s => s.aggregate)
                        ? 'text-blue-600 dark:text-blue-400'
                        : sources.some(s => s.aggregate)
                        ? 'text-blue-400 dark:text-blue-600'
                        : 'text-gray-500 dark:text-gray-400'
                    } hover:text-blue-500`}
                    title={sources.every(s => s.aggregate) ? 'Remove all from feed' : 'Add all to feed'}
                  >
                    <span className={`inline-block w-2 h-2 rounded-full ${
                      sources.every(s => s.aggregate) ? 'bg-blue-500' : sources.some(s => s.aggregate) ? 'bg-blue-300' : 'bg-gray-300 dark:bg-gray-600'
                    }`} />
                    Aggregate
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  <button
                    onClick={() => handleBulkToggle('auto_archive')}
                    className={`flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
                      sources.every(s => s.auto_archive)
                        ? 'text-purple-600 dark:text-purple-400'
                        : sources.some(s => s.auto_archive)
                        ? 'text-purple-400 dark:text-purple-600'
                        : 'text-gray-500 dark:text-gray-400'
                    } hover:text-purple-500`}
                    title={sources.every(s => s.auto_archive) ? 'Disable all archiving' : 'Enable all archiving'}
                  >
                    <span className={`inline-block w-2 h-2 rounded-full ${
                      sources.every(s => s.auto_archive) ? 'bg-purple-500' : sources.some(s => s.auto_archive) ? 'bg-purple-300' : 'bg-gray-300 dark:bg-gray-600'
                    }`} />
                    Archive
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  <button
                    onClick={() => handleBulkToggle('auto_approve')}
                    className={`flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
                      sources.every(s => s.auto_approve)
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : sources.some(s => s.auto_approve)
                        ? 'text-yellow-400 dark:text-yellow-600'
                        : 'text-gray-500 dark:text-gray-400'
                    } hover:text-yellow-500`}
                    title={sources.every(s => s.auto_approve) ? 'Untrust all' : 'Trust all'}
                  >
                    <span className={`inline-block w-2 h-2 rounded-full ${
                      sources.every(s => s.auto_approve) ? 'bg-yellow-500' : sources.some(s => s.auto_approve) ? 'bg-yellow-300' : 'bg-gray-300 dark:bg-gray-600'
                    }`} />
                    Trusted
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Checked
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {sources.map((source) => (
                <tr key={source.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {source.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                      {source.url}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                      {source.source_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleEnabled(source)}
                      className={`w-10 h-6 rounded-full transition-colors ${
                        source.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`block w-4 h-4 bg-white rounded-full transform transition-transform ${
                          source.enabled ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleAggregate(source)}
                      className={`w-10 h-6 rounded-full transition-colors ${
                        source.aggregate ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`block w-4 h-4 bg-white rounded-full transform transition-transform ${
                          source.aggregate ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleAutoArchive(source)}
                      className={`w-10 h-6 rounded-full transition-colors ${
                        source.auto_archive ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`block w-4 h-4 bg-white rounded-full transform transition-transform ${
                          source.auto_archive ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleAutoApprove(source)}
                      className={`w-10 h-6 rounded-full transition-colors ${
                        source.auto_approve ? 'bg-yellow-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`block w-4 h-4 bg-white rounded-full transform transition-transform ${
                          source.auto_approve ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {source.last_checked_at
                      ? new Date(source.last_checked_at).toLocaleString()
                      : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => {
                        setEditingSource(source)
                        setShowForm(true)
                      }}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(source.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-900"
                    >
                      Delete
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

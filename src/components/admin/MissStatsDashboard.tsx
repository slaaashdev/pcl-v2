import React, { useState, useEffect } from 'react'
import { RefreshCw, Plus, TrendingUp, Clock, AlertCircle } from 'lucide-react'

interface MissEntry {
  id: string
  word_phrase: string
  frequency: number
  miss_type: 'word' | 'phrase'
  token_count: number | null
  first_seen: string
  last_seen: string
  admin_reviewed: boolean
}

interface MissStatistics {
  topWords: MissEntry[]
  topPhrases: MissEntry[]
  totalMisses: number
  newMissesToday: number
  avgFrequency: number
}

interface AddRuleModalData {
  originalText: string
  missId: string
  isOpen: boolean
}

export const MissStatsDashboard: React.FC = () => {
  const [stats, setStats] = useState<MissStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addRuleModal, setAddRuleModal] = useState<AddRuleModalData>({
    originalText: '',
    missId: '',
    isOpen: false
  })

  // Load miss statistics
  const loadStats = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/miss-stats')
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to load statistics')
      }

      setStats(result.data)
    } catch (err) {
      console.error('Failed to load miss stats:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // Auto-refresh every 30 seconds
  useEffect(() => {
    loadStats()
    const interval = setInterval(loadStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const openAddRuleModal = (missEntry: MissEntry) => {
    setAddRuleModal({
      originalText: missEntry.word_phrase,
      missId: missEntry.id,
      isOpen: true
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading miss statistics...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">Error: {error}</span>
        </div>
        <button
          onClick={loadStats}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center p-8 text-gray-500">
        No statistics available
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Miss Statistics</h2>
        <button
          onClick={loadStats}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-500">Total Misses</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalMisses}</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-500">New Today</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.newMissesToday}</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-500">Avg Frequency</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.avgFrequency}</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <span className="text-sm font-medium text-gray-500">High Priority</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats.topWords.filter(w => w.frequency > 10).length +
             stats.topPhrases.filter(p => p.frequency > 10).length}
          </p>
        </div>
      </div>

      {/* Miss tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Missed Words */}
        <div className="bg-white rounded-lg shadow border">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              Top Missed Words ({stats.topWords.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-700">Word</th>
                  <th className="text-right p-3 font-medium text-gray-700">Frequency</th>
                  <th className="text-right p-3 font-medium text-gray-700">Last Seen</th>
                  <th className="text-center p-3 font-medium text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.topWords.slice(0, 15).map((miss) => (
                  <tr key={miss.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <span className="font-mono text-blue-600">{miss.word_phrase}</span>
                    </td>
                    <td className="text-right p-3">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        miss.frequency > 20 ? 'bg-red-100 text-red-800' :
                        miss.frequency > 10 ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {miss.frequency}
                      </span>
                    </td>
                    <td className="text-right p-3 text-gray-500">
                      {formatRelativeTime(miss.last_seen)}
                    </td>
                    <td className="text-center p-3">
                      <button
                        onClick={() => openAddRuleModal(miss)}
                        className="inline-flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Rule</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Missed Phrases */}
        <div className="bg-white rounded-lg shadow border">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              Top Missed Phrases ({stats.topPhrases.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-700">Phrase</th>
                  <th className="text-right p-3 font-medium text-gray-700">Frequency</th>
                  <th className="text-right p-3 font-medium text-gray-700">Last Seen</th>
                  <th className="text-center p-3 font-medium text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.topPhrases.slice(0, 15).map((miss) => (
                  <tr key={miss.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <span className="font-mono text-purple-600">"{miss.word_phrase}"</span>
                    </td>
                    <td className="text-right p-3">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        miss.frequency > 15 ? 'bg-red-100 text-red-800' :
                        miss.frequency > 8 ? 'bg-orange-100 text-orange-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {miss.frequency}
                      </span>
                    </td>
                    <td className="text-right p-3 text-gray-500">
                      {formatRelativeTime(miss.last_seen)}
                    </td>
                    <td className="text-center p-3">
                      <button
                        onClick={() => openAddRuleModal(miss)}
                        className="inline-flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Rule</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Rule Modal */}
      {addRuleModal.isOpen && (
        <AddRuleModal
          originalText={addRuleModal.originalText}
          missId={addRuleModal.missId}
          onClose={() => setAddRuleModal({ ...addRuleModal, isOpen: false })}
          onSuccess={() => {
            setAddRuleModal({ ...addRuleModal, isOpen: false })
            loadStats() // Refresh stats after adding rule
          }}
        />
      )}
    </div>
  )
}

// Add Rule Modal Component
interface AddRuleModalProps {
  originalText: string
  missId: string
  onClose: () => void
  onSuccess: () => void
}

const AddRuleModal: React.FC<AddRuleModalProps> = ({
  originalText,
  missId,
  onClose,
  onSuccess
}) => {
  const [compressedForm, setCompressedForm] = useState('')
  const [confidence, setConfidence] = useState(0.70)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!compressedForm.trim()) {
      setError('Compressed form is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/add-rule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalText,
          compressedForm: compressedForm.trim(),
          confidenceScore: confidence
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to create rule')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Add Compression Rule</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Original Text
            </label>
            <input
              type="text"
              value={originalText}
              disabled
              className="w-full p-2 border rounded bg-gray-50 font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Compressed Form
            </label>
            <input
              type="text"
              value={compressedForm}
              onChange={(e) => setCompressedForm(e.target.value)}
              placeholder="Enter compressed version..."
              className="w-full p-2 border rounded font-mono"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Initial Confidence: {confidence.toFixed(2)}
            </label>
            <input
              type="range"
              min="0.40"
              max="1.00"
              step="0.01"
              value={confidence}
              onChange={(e) => setConfidence(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="text-xs text-gray-500 mt-1">
              Range: 0.40 (aggressive) to 1.00 (perfect)
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!compressedForm.trim() || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Add Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
import React, { useState } from 'react'

interface CompressionResult {
  original: string
  compressed: string
  compressionRatio: number
  processingTime: number
  rulesApplied: AppliedRule[]
  fromCache: boolean
  passResults: {
    pass1: { tokensProcessed: number; rulesApplied: number; processingTime: number }
    pass2: { tokensProcessed: number; rulesApplied: number; processingTime: number }
  }
}

interface AppliedRule {
  id: string
  originalText: string
  compressedForm: string
  confidence: number
  priority: number
}

const CompressionInterface: React.FC = () => {
  const [text, setText] = useState('')
  const [result, setResult] = useState<CompressionResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleCompress = async () => {
    if (!text.trim()) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/unified-compress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() })
      })

      const data = await response.json()

      if (data.success) {
        setResult(data.data)
      } else {
        setError(data.error || 'Compression failed')
      }
    } catch (err) {
      setError('Network error occurred')
    }

    setLoading(false)
  }

  const handleCopy = async () => {
    if (!result) return

    try {
      await navigator.clipboard.writeText(result.compressed)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      setError('Failed to copy to clipboard')
    }
  }

  const handleFeedback = async (satisfied: boolean) => {
    if (!result) return

    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          satisfied,
          originalText: result.original,
          compressedText: result.compressed,
          rulesApplied: result.rulesApplied,
          compressionRatio: result.compressionRatio,
          processingTime: result.processingTime
        })
      })
    } catch (err) {
      console.error('Feedback submission failed:', err)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          🗜️ PCL Text Compressor
        </h1>

        <div className="space-y-6">
          <div>
            <label htmlFor="text-input" className="block text-sm font-medium text-gray-700 mb-2">
              Enter text to compress:
            </label>
            <textarea
              id="text-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="Type or paste your text here..."
            />
            <div className="text-sm text-gray-500 mt-1">
              Characters: {text.length}
            </div>
          </div>

          <button
            onClick={handleCompress}
            disabled={!text.trim() || loading}
            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{loading ? '⏳ Compressing...' : '🗜️ Compress Text'}</span>
          </button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">✅ Compressed Result:</h3>
                <div className="bg-white p-3 rounded border font-mono text-sm">
                  {result.compressed}
                </div>

                <div className="flex items-center justify-between mt-3">
                  <button
                    onClick={handleCopy}
                    className="flex items-center space-x-1 px-3 py-1 bg-blue-100 hover:bg-blue-200 rounded text-blue-800"
                  >
                    <span>{copied ? '✅ Copied!' : '📋 Copy'}</span>
                  </button>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleFeedback(true)}
                      className="px-3 py-1 bg-green-100 hover:bg-green-200 rounded text-green-800"
                    >
                      👍 Good
                    </button>
                    <button
                      onClick={() => handleFeedback(false)}
                      className="px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-red-800"
                    >
                      👎 Bad
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{result.compressionRatio}%</div>
                  <div className="text-sm text-gray-600">Compression</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{result.processingTime}ms</div>
                  <div className="text-sm text-gray-600">Processing Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{result.rulesApplied.length}</div>
                  <div className="text-sm text-gray-600">Rules Applied</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{result.fromCache ? 'Yes' : 'No'}</div>
                  <div className="text-sm text-gray-600">From Cache</div>
                </div>
              </div>

              {result.passResults && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-3">📊 Processing Details:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded border">
                      <h5 className="font-medium text-gray-700">Pass 1 (Phrases)</h5>
                      <div className="text-sm text-gray-600">
                        <div>Tokens: {result.passResults.pass1.tokensProcessed}</div>
                        <div>Rules: {result.passResults.pass1.rulesApplied}</div>
                        <div>Time: {result.passResults.pass1.processingTime}ms</div>
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <h5 className="font-medium text-gray-700">Pass 2 (Words)</h5>
                      <div className="text-sm text-gray-600">
                        <div>Tokens: {result.passResults.pass2.tokensProcessed}</div>
                        <div>Rules: {result.passResults.pass2.rulesApplied}</div>
                        <div>Time: {result.passResults.pass2.processingTime}ms</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CompressionInterface
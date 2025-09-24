import type { NextApiRequest, NextApiResponse } from 'next'
import { compressionEngine, CompressionResult } from '@/lib/compression/two-pass-engine'
import { missTracker } from '@/lib/miss-tracking'

export interface CompressionApiRequest {
  text: string
  sessionId?: string
  options?: {
    confidenceMode?: 'conservative' | 'default' | 'aggressive'
    enableCaching?: boolean
  }
}

export interface CompressionApiResponse {
  success: boolean
  data?: CompressionResult & {
    meta: {
      cacheHit: boolean
      processingDetails: {
        pass1Time: number
        pass2Time: number
        totalRules: number
        missesLogged: number
      }
    }
  }
  error?: string
  timestamp: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CompressionApiResponse>
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.',
      timestamp: new Date().toISOString()
    })
    return
  }

  const startTime = Date.now()

  try {
    // Validate request body
    const { text, sessionId, options }: CompressionApiRequest = req.body

    if (!text || typeof text !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Missing or invalid text parameter',
        timestamp: new Date().toISOString()
      })
      return
    }

    if (text.length > 10000) {
      res.status(400).json({
        success: false,
        error: 'Text too long. Maximum 10,000 characters.',
        timestamp: new Date().toISOString()
      })
      return
    }

    if (text.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Text cannot be empty',
        timestamp: new Date().toISOString()
      })
      return
    }

    // Generate session ID if not provided
    const finalSessionId = sessionId || generateSessionId()

    console.log(`[${finalSessionId}] Compressing text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`)

    // Perform compression
    const result = await compressionEngine.compress(text, finalSessionId)

    // Calculate processing details
    const pass1Time = result.passResults.pass1.processingTime
    const pass2Time = result.passResults.pass2.processingTime
    const totalRules = result.rulesApplied.length
    const missesLogged = await estimateMissesLogged(text, result.rulesApplied)

    // Log performance metrics
    console.log(`[${finalSessionId}] Compression complete:`, {
      originalLength: text.length,
      compressedLength: result.compressed.length,
      ratio: result.compressionRatio,
      processingTime: result.processingTime,
      cacheHit: result.fromCache,
      rulesApplied: totalRules
    })

    // Return successful response
    res.status(200).json({
      success: true,
      data: {
        ...result,
        meta: {
          cacheHit: result.fromCache,
          processingDetails: {
            pass1Time,
            pass2Time,
            totalRules,
            missesLogged
          }
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Compression API error:', error)

    // Determine error type and status code
    let statusCode = 500
    let errorMessage = 'Internal server error'

    if (error instanceof Error) {
      if (error.message.includes('Database connection failed')) {
        statusCode = 503
        errorMessage = 'Database temporarily unavailable'
      } else if (error.message.includes('Unable to')) {
        statusCode = 500
        errorMessage = error.message
      } else {
        errorMessage = 'Compression processing failed'
      }
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    })
  }
}

/**
 * Estimate number of misses logged (for performance metrics)
 */
async function estimateMissesLogged(originalText: string, rulesApplied: any[]): Promise<number> {
  try {
    // Simple estimation: count words not covered by rules
    const words = originalText.split(/\s+/).filter(word => word.trim().length > 0)
    const coveredWords = new Set()

    rulesApplied.forEach(rule => {
      const ruleWords = rule.originalText.split(/\s+/)
      ruleWords.forEach(word => coveredWords.add(word.toLowerCase()))
    })

    const uncoveredWords = words.filter(word =>
      !coveredWords.has(word.toLowerCase()) &&
      /^\w+$/.test(word) && // Only count actual words
      word.length > 2 // Ignore very short words
    )

    return uncoveredWords.length
  } catch (error) {
    console.error('Failed to estimate misses:', error)
    return 0
  }
}

/**
 * Generate unique session ID
 */
function generateSessionId(): string {
  return 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15)
}

/**
 * Get client IP for rate limiting (if needed later)
 */
function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket.remoteAddress) || 'unknown'
  return ip.trim()
}
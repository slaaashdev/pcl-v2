import type { NextApiRequest, NextApiResponse } from 'next'
import { compressionEngine, CompressionResult } from '@/lib/compression/two-pass-engine'

// Rate limiting storage (in-memory - use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

// Rate limit configurations
const RATE_LIMITS = {
  FREE_TIER: { requests: 10, windowMs: 60 * 1000 }, // 10 requests per minute
  PREMIUM: { requests: 100, windowMs: 60 * 1000 }   // 100 requests per minute
}

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

/**
 * Validate API key against environment variable
 */
function validateApiKey(apiKey: string | undefined): boolean {
  if (!apiKey) return false
  return apiKey === process.env.API_SECRET_KEY
}

/**
 * Check and update rate limits for an IP address
 */
function checkRateLimit(ip: string, isPremium: boolean): { allowed: boolean; resetTime: number; remaining: number } {
  const now = Date.now()
  const config = isPremium ? RATE_LIMITS.PREMIUM : RATE_LIMITS.FREE_TIER

  // Clean up expired entries
  rateLimitMap.forEach((value, key) => {
    if (now > value.resetTime) {
      rateLimitMap.delete(key)
    }
  })

  const existing = rateLimitMap.get(ip)

  if (!existing || now > existing.resetTime) {
    // First request in window or window has expired
    const resetTime = now + config.windowMs
    rateLimitMap.set(ip, { count: 1, resetTime })
    return { allowed: true, resetTime, remaining: config.requests - 1 }
  }

  if (existing.count >= config.requests) {
    // Rate limit exceeded
    return { allowed: false, resetTime: existing.resetTime, remaining: 0 }
  }

  // Increment count
  existing.count++
  rateLimitMap.set(ip, existing)
  return { allowed: true, resetTime: existing.resetTime, remaining: config.requests - existing.count }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CompressionApiResponse>
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key')

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


  // Get API key and client IP for security checks
  const apiKey = req.headers['x-api-key'] as string | undefined
  const clientIP = getClientIP(req)

  // 1. API Key Validation
  let isPremium = false
  if (apiKey) {
    if (!validateApiKey(apiKey)) {
      res.status(401).json({
        success: false,
        error: 'Invalid API key. Please check your authentication credentials.',
        timestamp: new Date().toISOString()
      })
      return
    }
    isPremium = true
    console.log(`[PREMIUM] API key validated for IP: ${clientIP}`)
  } else {
    console.log(`[FREE] Request from IP: ${clientIP}`)
  }

  // 2. Rate Limiting
  const rateLimitResult = checkRateLimit(clientIP, isPremium)

  // Add rate limit headers
  res.setHeader('X-RateLimit-Limit', isPremium ? RATE_LIMITS.PREMIUM.requests : RATE_LIMITS.FREE_TIER.requests)
  res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining)
  res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimitResult.resetTime / 1000))

  if (!rateLimitResult.allowed) {
    res.status(429).json({
      success: false,
      error: `Rate limit exceeded. ${isPremium ? 'Premium' : 'Free'} tier allows ${isPremium ? RATE_LIMITS.PREMIUM.requests : RATE_LIMITS.FREE_TIER.requests} requests per minute. Try again in ${Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)} seconds.`,
      timestamp: new Date().toISOString()
    })
    return
  }

  try {
    // Validate request body
    const { text, sessionId }: CompressionApiRequest = req.body

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
      ruleWords.forEach((word: string) => coveredWords.add(word.toLowerCase()))
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
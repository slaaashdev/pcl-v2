import type { NextApiRequest, NextApiResponse } from 'next'
import { missTracker, MissStatistics } from '@/lib/miss-tracking'

export interface MissStatsApiResponse {
  success: boolean
  data?: MissStatistics & {
    meta: {
      lastUpdated: string
      dataFreshness: 'live' | 'cached'
    }
  }
  error?: string
  timestamp: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MissStatsApiResponse>
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET.',
      timestamp: new Date().toISOString()
    })
    return
  }

  try {
    // Parse query parameters
    const { limit } = req.query
    const limitNum = limit ? parseInt(limit as string, 10) : 50

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 500) {
      res.status(400).json({
        success: false,
        error: 'Invalid limit parameter. Must be between 1 and 500.',
        timestamp: new Date().toISOString()
      })
      return
    }

    console.log(`[Admin] Fetching miss statistics (limit: ${limitNum})`)

    // Get miss statistics
    const stats = await missTracker.getMissStatistics(limitNum)

    // Log admin activity
    console.log(`[Admin] Miss stats retrieved:`, {
      topWords: stats.topWords.length,
      topPhrases: stats.topPhrases.length,
      totalMisses: stats.totalMisses,
      newToday: stats.newMissesToday
    })

    // Return successful response
    res.status(200).json({
      success: true,
      data: {
        ...stats,
        meta: {
          lastUpdated: new Date().toISOString(),
          dataFreshness: 'live' as const
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Miss stats API error:', error)

    // Determine error type and status code
    let statusCode = 500
    let errorMessage = 'Internal server error'

    if (error instanceof Error) {
      if (error.message.includes('Unable to fetch miss statistics')) {
        statusCode = 500
        errorMessage = 'Failed to retrieve miss statistics'
      } else if (error.message.includes('Database')) {
        statusCode = 503
        errorMessage = 'Database temporarily unavailable'
      } else {
        errorMessage = 'Miss statistics retrieval failed'
      }
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    })
  }
}
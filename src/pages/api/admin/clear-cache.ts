import type { NextApiRequest, NextApiResponse } from 'next'
import { compressionEngine } from '@/lib/compression/two-pass-engine'

export interface ClearCacheResponse {
  success: boolean
  message: string
  cacheStats?: {
    sizeBefore: number
    sizeAfter: number
  }
  timestamp: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ClearCacheResponse>
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
      message: 'Method not allowed. Use POST.',
      timestamp: new Date().toISOString()
    })
    return
  }

  try {
    // Get cache stats before clearing
    const statsBefore = compressionEngine.getCacheStats()
    const sizeBefore = statsBefore.size

    // Clear the cache
    compressionEngine.clearCache()

    // Get cache stats after clearing
    const statsAfter = compressionEngine.getCacheStats()
    const sizeAfter = statsAfter.size

    console.log(`🧹 Cache cleared: ${sizeBefore} → ${sizeAfter} entries`)

    res.status(200).json({
      success: true,
      message: `Cache cleared successfully. Removed ${sizeBefore} cached entries.`,
      cacheStats: {
        sizeBefore,
        sizeAfter
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Cache clear error:', error)

    res.status(500).json({
      success: false,
      message: 'Failed to clear cache',
      timestamp: new Date().toISOString()
    })
  }
}
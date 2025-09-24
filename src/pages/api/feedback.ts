import type { NextApiRequest, NextApiResponse } from 'next'
import { confidenceSystem, ConfidenceAdjustment } from '@/lib/confidence-system'

export interface FeedbackApiRequest {
  satisfied: boolean
  originalText: string
  compressedText: string
  rulesApplied: {
    id: string
    originalText: string
    compressedForm: string
    pass: number
    confidence: number
  }[]
  sessionId?: string
  compressionRatio?: number
  processingTime?: number
}

export interface FeedbackApiResponse {
  success: boolean
  data?: {
    feedbackRecorded: boolean
    confidenceAdjustments: ConfidenceAdjustment[]
    newConfidenceScores: Record<string, number>
  }
  error?: string
  timestamp: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FeedbackApiResponse>
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

  try {
    // Validate request body
    const {
      satisfied,
      originalText,
      compressedText,
      rulesApplied,
      sessionId,
      compressionRatio,
      processingTime
    }: FeedbackApiRequest = req.body

    // Validation
    if (typeof satisfied !== 'boolean') {
      res.status(400).json({
        success: false,
        error: 'Missing or invalid satisfied parameter (must be boolean)',
        timestamp: new Date().toISOString()
      })
      return
    }

    if (!originalText || !compressedText) {
      res.status(400).json({
        success: false,
        error: 'Missing originalText or compressedText',
        timestamp: new Date().toISOString()
      })
      return
    }

    if (!rulesApplied || !Array.isArray(rulesApplied)) {
      res.status(400).json({
        success: false,
        error: 'Missing or invalid rulesApplied array',
        timestamp: new Date().toISOString()
      })
      return
    }

    // Validate each rule in rulesApplied
    for (const rule of rulesApplied) {
      if (!rule.id || !rule.originalText || !rule.compressedForm) {
        res.status(400).json({
          success: false,
          error: 'Invalid rule structure in rulesApplied',
          timestamp: new Date().toISOString()
        })
        return
      }
    }

    console.log(`[${sessionId || 'unknown'}] Processing ${satisfied ? 'positive' : 'negative'} feedback for ${rulesApplied.length} rules`)

    // Process feedback and update confidence scores
    const adjustments = await confidenceSystem.processFeedback(
      satisfied,
      originalText,
      compressedText,
      rulesApplied,
      sessionId,
      compressionRatio,
      processingTime
    )

    // Create response with new confidence scores
    const newConfidenceScores: Record<string, number> = {}
    adjustments.forEach(adj => {
      newConfidenceScores[adj.patternId] = adj.newConfidence
    })

    // Log feedback processing results
    console.log(`[${sessionId || 'unknown'}] Feedback processed:`, {
      satisfied,
      rulesAffected: adjustments.length,
      avgAdjustment: adjustments.length > 0
        ? adjustments.reduce((sum, adj) => sum + adj.adjustment, 0) / adjustments.length
        : 0
    })

    // Return success response
    res.status(200).json({
      success: true,
      data: {
        feedbackRecorded: true,
        confidenceAdjustments: adjustments,
        newConfidenceScores
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Feedback API error:', error)

    // Determine error type and status code
    let statusCode = 500
    let errorMessage = 'Internal server error'

    if (error instanceof Error) {
      if (error.message.includes('Unable to process user feedback')) {
        statusCode = 500
        errorMessage = 'Failed to process feedback'
      } else if (error.message.includes('Database')) {
        statusCode = 503
        errorMessage = 'Database temporarily unavailable'
      } else {
        errorMessage = 'Feedback processing failed'
      }
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    })
  }
}
import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/supabase'
import CryptoJS from 'crypto-js'

export interface AddRuleApiRequest {
  originalText: string
  compressedForm: string
  confidenceScore?: number
  compressionType?: 'word' | 'phrase'
  notes?: string
}

export interface AddRuleApiResponse {
  success: boolean
  data?: {
    ruleId: string
    originalText: string
    compressedForm: string
    confidenceScore: number
    compressionRatio: number
    passLevel: number
  }
  error?: string
  timestamp: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AddRuleApiResponse>
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
      originalText,
      compressedForm,
      confidenceScore = 0.70,
      compressionType,
      notes
    }: AddRuleApiRequest = req.body

    // Validation
    if (!originalText || typeof originalText !== 'string' || originalText.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Missing or invalid originalText',
        timestamp: new Date().toISOString()
      })
      return
    }

    if (!compressedForm || typeof compressedForm !== 'string' || compressedForm.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Missing or invalid compressedForm',
        timestamp: new Date().toISOString()
      })
      return
    }

    if (confidenceScore < 0 || confidenceScore > 1) {
      res.status(400).json({
        success: false,
        error: 'confidenceScore must be between 0.00 and 1.00',
        timestamp: new Date().toISOString()
      })
      return
    }

    // Sanitize inputs
    const cleanOriginal = originalText.trim()
    const cleanCompressed = compressedForm.trim()

    // Check if rule already exists
    const existingRule = await db.getPatternByText(cleanOriginal)
    if (existingRule) {
      res.status(409).json({
        success: false,
        error: `Rule for "${cleanOriginal}" already exists`,
        timestamp: new Date().toISOString()
      })
      return
    }

    // Determine compression characteristics
    const wordCount = cleanOriginal.split(/\s+/).length
    const actualCompressionType = compressionType || (wordCount > 1 ? 'phrase' : 'word')
    const passLevel = actualCompressionType === 'phrase' ? 1 : 2
    const compressionRatio = Math.round(
      ((cleanOriginal.length - cleanCompressed.length) / cleanOriginal.length) * 100
    )

    console.log(`[Admin] Adding new compression rule:`, {
      original: cleanOriginal,
      compressed: cleanCompressed,
      type: actualCompressionType,
      wordCount,
      passLevel,
      confidence: confidenceScore,
      ratio: compressionRatio
    })

    // Insert new compression rule
    const { data: newRule, error } = await db.supabase
      .from('compressions')
      .insert({
        text_hash: CryptoJS.MD5(cleanOriginal.toLowerCase()).toString(),
        original_text: cleanOriginal,
        compressed_form: cleanCompressed,
        compression_rule: `${cleanOriginal} → ${cleanCompressed}`,
        word_count: wordCount,
        pass_priority: passLevel,
        compression_type: actualCompressionType,
        confidence_score: confidenceScore,
        compression_ratio: compressionRatio
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to insert compression rule:', error)
      throw new Error('Database insertion failed')
    }

    // Mark related miss as reviewed if it exists
    try {
      await db.supabase
        .from('miss_log')
        .update({
          admin_reviewed: true,
          review_notes: notes || `Created rule: ${cleanOriginal} → ${cleanCompressed}`
        })
        .eq('word_phrase', cleanOriginal)
    } catch (missError) {
      // Non-critical error - rule creation succeeded
      console.warn('Failed to update miss log:', missError)
    }

    console.log(`[Admin] Successfully created compression rule:`, {
      id: newRule.id,
      original: newRule.original_text,
      compressed: newRule.compressed_form,
      confidence: newRule.confidence_score
    })

    // Return successful response
    res.status(201).json({
      success: true,
      data: {
        ruleId: newRule.id,
        originalText: newRule.original_text,
        compressedForm: newRule.compressed_form,
        confidenceScore: newRule.confidence_score,
        compressionRatio: newRule.compression_ratio || 0,
        passLevel: newRule.pass_priority
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Add rule API error:', error)

    // Determine error type and status code
    let statusCode = 500
    let errorMessage = 'Internal server error'

    if (error instanceof Error) {
      if (error.message.includes('Database insertion failed')) {
        statusCode = 500
        errorMessage = 'Failed to create compression rule'
      } else if (error.message.includes('Database')) {
        statusCode = 503
        errorMessage = 'Database temporarily unavailable'
      } else if (error.message.includes('already exists')) {
        statusCode = 409
        errorMessage = error.message
      } else {
        errorMessage = 'Rule creation failed'
      }
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    })
  }
}
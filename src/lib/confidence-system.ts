import { db, UserFeedback } from './supabase'
import { AppliedRule } from './compression/two-pass-engine'

export interface ConfidenceAdjustment {
  patternId: string
  oldConfidence: number
  newConfidence: number
  adjustment: number
  reason: string
}

export interface ConfidenceStats {
  totalPatterns: number
  activePatterns: number // >= 0.70
  conservativePatterns: number // >= 0.85
  aggressivePatterns: number // 0.40-0.69
  disabledPatterns: number // < 0.40
  averageConfidence: number
  recentAdjustments: ConfidenceAdjustment[]
}

export class ConfidenceSystem {
  // Confidence thresholds
  private readonly CONFIDENCE_THRESHOLDS = {
    CONSERVATIVE: 0.85,
    DEFAULT: 0.70,
    AGGRESSIVE: 0.40,
    DISABLED: 0.30
  }

  // Feedback adjustments
  private readonly FEEDBACK_ADJUSTMENTS = {
    SATISFIED: 0.01,    // +0.01 for 👍
    UNSATISFIED: -0.03  // -0.03 for 👎
  }

  /**
   * Process user feedback and update confidence scores
   */
  async processFeedback(
    satisfied: boolean,
    originalText: string,
    compressedText: string,
    rulesApplied: AppliedRule[],
    sessionId?: string,
    compressionRatio?: number,
    processingTime?: number
  ): Promise<ConfidenceAdjustment[]> {
    const adjustments: ConfidenceAdjustment[] = []

    try {
      // Store feedback in database
      await db.submitFeedback({
        satisfied,
        original_text: originalText,
        compressed_text: compressedText,
        rules_applied: rulesApplied.map(rule => rule.id),
        user_session: sessionId || this.generateSessionId(),
        compression_ratio: compressionRatio || null,
        processing_time_ms: processingTime || null
      })

      // Update confidence for each applied rule
      for (const rule of rulesApplied) {
        const adjustment = await this.updateRuleConfidence(rule.id, satisfied)
        if (adjustment) {
          adjustments.push(adjustment)
        }
      }

      console.log(`Processed ${satisfied ? 'positive' : 'negative'} feedback for ${rulesApplied.length} rules`)
      return adjustments

    } catch (error) {
      console.error('Failed to process feedback:', error)
      throw new Error('Unable to process user feedback')
    }
  }

  /**
   * Update confidence score for a specific rule
   */
  async updateRuleConfidence(patternId: string, satisfied: boolean): Promise<ConfidenceAdjustment | null> {
    try {
      // Get current confidence
      const { data: pattern, error: fetchError } = await db.supabase
        .from('compressions')
        .select('confidence_score')
        .eq('id', patternId)
        .single()

      if (fetchError) throw fetchError

      const oldConfidence = pattern.confidence_score
      const adjustment = satisfied ? this.FEEDBACK_ADJUSTMENTS.SATISFIED : this.FEEDBACK_ADJUSTMENTS.UNSATISFIED

      // Update confidence using database function
      await db.updateConfidence(patternId, satisfied)

      const newConfidence = Math.max(0.00, Math.min(1.00, oldConfidence + adjustment))

      return {
        patternId,
        oldConfidence,
        newConfidence,
        adjustment,
        reason: satisfied ? 'Positive user feedback' : 'Negative user feedback'
      }

    } catch (error) {
      console.error('Failed to update confidence:', error)
      return null
    }
  }

  /**
   * Get patterns by confidence level
   */
  async getPatternsByConfidenceLevel(level: 'conservative' | 'default' | 'aggressive' | 'disabled') {
    let minConfidence: number
    let maxConfidence: number

    switch (level) {
      case 'conservative':
        minConfidence = this.CONFIDENCE_THRESHOLDS.CONSERVATIVE
        maxConfidence = 1.00
        break
      case 'default':
        minConfidence = this.CONFIDENCE_THRESHOLDS.DEFAULT
        maxConfidence = this.CONFIDENCE_THRESHOLDS.CONSERVATIVE - 0.01
        break
      case 'aggressive':
        minConfidence = this.CONFIDENCE_THRESHOLDS.AGGRESSIVE
        maxConfidence = this.CONFIDENCE_THRESHOLDS.DEFAULT - 0.01
        break
      case 'disabled':
        minConfidence = 0.00
        maxConfidence = this.CONFIDENCE_THRESHOLDS.DISABLED - 0.01
        break
    }

    const { data, error } = await db.supabase
      .from('compressions')
      .select('*')
      .gte('confidence_score', minConfidence)
      .lte('confidence_score', maxConfidence)
      .order('confidence_score', { ascending: false })

    if (error) throw error
    return data
  }

  /**
   * Get comprehensive confidence statistics
   */
  async getConfidenceStats(): Promise<ConfidenceStats> {
    try {
      const { data: patterns, error } = await db.supabase
        .from('compressions')
        .select('id, confidence_score, updated_at')

      if (error) throw error

      const totalPatterns = patterns.length
      const activePatterns = patterns.filter(p => p.confidence_score >= this.CONFIDENCE_THRESHOLDS.DEFAULT).length
      const conservativePatterns = patterns.filter(p => p.confidence_score >= this.CONFIDENCE_THRESHOLDS.CONSERVATIVE).length
      const aggressivePatterns = patterns.filter(p =>
        p.confidence_score >= this.CONFIDENCE_THRESHOLDS.AGGRESSIVE &&
        p.confidence_score < this.CONFIDENCE_THRESHOLDS.DEFAULT
      ).length
      const disabledPatterns = patterns.filter(p => p.confidence_score < this.CONFIDENCE_THRESHOLDS.DISABLED).length

      const averageConfidence = totalPatterns > 0
        ? patterns.reduce((sum, p) => sum + p.confidence_score, 0) / totalPatterns
        : 0

      // Get recent adjustments (would need to track these separately in production)
      const recentAdjustments: ConfidenceAdjustment[] = []

      return {
        totalPatterns,
        activePatterns,
        conservativePatterns,
        aggressivePatterns,
        disabledPatterns,
        averageConfidence: Math.round(averageConfidence * 100) / 100,
        recentAdjustments
      }

    } catch (error) {
      console.error('Failed to get confidence stats:', error)
      throw new Error('Unable to fetch confidence statistics')
    }
  }

  /**
   * Get patterns that need admin review (low confidence)
   */
  async getPatternsNeedingReview(threshold: number = 0.40) {
    try {
      const { data, error } = await db.supabase
        .from('compressions')
        .select('*')
        .lt('confidence_score', threshold)
        .order('confidence_score', { ascending: true })

      if (error) throw error

      return data.map(pattern => ({
        ...pattern,
        reason: pattern.confidence_score < this.CONFIDENCE_THRESHOLDS.DISABLED
          ? 'Auto-disabled due to low confidence'
          : 'Low confidence - needs review',
        recommendedAction: pattern.confidence_score < this.CONFIDENCE_THRESHOLDS.DISABLED
          ? 'delete'
          : 'review' as 'delete' | 'review' | 'adjust'
      }))

    } catch (error) {
      console.error('Failed to get patterns needing review:', error)
      throw error
    }
  }

  /**
   * Get feedback trends for analytics
   */
  async getFeedbackTrends(days: number = 30): Promise<{
    dailyFeedback: { date: string; positive: number; negative: number }[]
    satisfactionRate: number
    totalFeedback: number
  }> {
    try {
      const since = new Date()
      since.setDate(since.getDate() - days)

      const { data: feedback, error } = await db.supabase
        .from('user_feedback')
        .select('satisfied, created_at')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true })

      if (error) throw error

      // Group by date
      const dailyFeedback = this.groupFeedbackByDate(feedback, days)

      const totalFeedback = feedback.length
      const positiveFeedback = feedback.filter(f => f.satisfied).length
      const satisfactionRate = totalFeedback > 0 ? (positiveFeedback / totalFeedback) * 100 : 0

      return {
        dailyFeedback,
        satisfactionRate: Math.round(satisfactionRate),
        totalFeedback
      }

    } catch (error) {
      console.error('Failed to get feedback trends:', error)
      throw error
    }
  }

  /**
   * Manually adjust confidence score (admin action)
   */
  async manuallyAdjustConfidence(
    patternId: string,
    newConfidence: number,
    reason: string
  ): Promise<ConfidenceAdjustment> {
    try {
      // Validate confidence range
      if (newConfidence < 0 || newConfidence > 1) {
        throw new Error('Confidence score must be between 0.00 and 1.00')
      }

      // Get current confidence
      const { data: pattern, error: fetchError } = await db.supabase
        .from('compressions')
        .select('confidence_score')
        .eq('id', patternId)
        .single()

      if (fetchError) throw fetchError

      const oldConfidence = pattern.confidence_score
      const adjustment = newConfidence - oldConfidence

      // Update confidence
      const { error: updateError } = await db.supabase
        .from('compressions')
        .update({ confidence_score: newConfidence, updated_at: new Date().toISOString() })
        .eq('id', patternId)

      if (updateError) throw updateError

      return {
        patternId,
        oldConfidence,
        newConfidence,
        adjustment,
        reason: `Manual adjustment: ${reason}`
      }

    } catch (error) {
      console.error('Failed to manually adjust confidence:', error)
      throw error
    }
  }

  /**
   * Auto-disable patterns with very low confidence
   */
  async autoDisableLowConfidencePatterns(): Promise<string[]> {
    try {
      const { data: lowConfidencePatterns, error } = await db.supabase
        .from('compressions')
        .select('id')
        .lt('confidence_score', this.CONFIDENCE_THRESHOLDS.DISABLED)

      if (error) throw error

      if (lowConfidencePatterns.length === 0) return []

      const patternIds = lowConfidencePatterns.map(p => p.id)

      // For now, we'll just mark them with confidence 0.00
      // In production, you might want a separate 'disabled' flag
      const { error: updateError } = await db.supabase
        .from('compressions')
        .update({ confidence_score: 0.00 })
        .in('id', patternIds)

      if (updateError) throw updateError

      console.log(`Auto-disabled ${patternIds.length} low-confidence patterns`)
      return patternIds

    } catch (error) {
      console.error('Failed to auto-disable patterns:', error)
      throw error
    }
  }

  /**
   * Group feedback by date for trends
   */
  private groupFeedbackByDate(feedback: any[], days: number) {
    const dateMap = new Map<string, { positive: number; negative: number }>()

    // Initialize all dates
    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - (days - 1 - i))
      const dateStr = date.toISOString().split('T')[0]
      dateMap.set(dateStr, { positive: 0, negative: 0 })
    }

    // Count feedback by date
    feedback.forEach(f => {
      const date = f.created_at.split('T')[0]
      const existing = dateMap.get(date)
      if (existing) {
        if (f.satisfied) {
          existing.positive++
        } else {
          existing.negative++
        }
      }
    })

    return Array.from(dateMap.entries()).map(([date, counts]) => ({
      date,
      ...counts
    }))
  }

  /**
   * Generate session ID for tracking
   */
  private generateSessionId(): string {
    return 'sess_' + Math.random().toString(36).substring(2, 15)
  }
}

// Export singleton instance
export const confidenceSystem = new ConfidenceSystem()
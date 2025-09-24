import { db, MissLogEntry } from './supabase'

export interface MissStatistics {
  topWords: MissLogEntry[]
  topPhrases: MissLogEntry[]
  totalMisses: number
  newMissesToday: number
  avgFrequency: number
}

export interface MissAnalytics {
  dailyMisses: { date: string; count: number }[]
  typeDistribution: { type: string; count: number }[]
  frequencyDistribution: { range: string; count: number }[]
}

export class MissTrackingService {
  /**
   * Log a missed word or phrase
   */
  async logMiss(
    wordPhrase: string,
    type: 'word' | 'phrase',
    context: string[] = [],
    surroundingWords: string[] = []
  ): Promise<void> {
    try {
      await db.logMiss(wordPhrase, type, context)

      // Log for analytics
      console.log(`Miss logged: ${type} "${wordPhrase}" (frequency will be incremented)`)
    } catch (error) {
      console.error('Failed to log miss:', error)
      // Don't throw - missing tracking shouldn't break compression
    }
  }

  /**
   * Get comprehensive miss statistics for admin dashboard
   */
  async getMissStatistics(limit: number = 50): Promise<MissStatistics> {
    try {
      const allMisses = await db.getTopMisses(limit * 2) // Get extra to split by type

      const topWords = allMisses
        .filter(miss => miss.miss_type === 'word')
        .slice(0, limit)

      const topPhrases = allMisses
        .filter(miss => miss.miss_type === 'phrase')
        .slice(0, limit)

      const totalMisses = allMisses.reduce((sum, miss) => sum + miss.frequency, 0)
      const avgFrequency = allMisses.length > 0
        ? Math.round(totalMisses / allMisses.length)
        : 0

      // Count new misses today
      const today = new Date().toISOString().split('T')[0]
      const newMissesToday = allMisses.filter(miss =>
        miss.first_seen.startsWith(today)
      ).length

      return {
        topWords,
        topPhrases,
        totalMisses,
        newMissesToday,
        avgFrequency
      }
    } catch (error) {
      console.error('Failed to get miss statistics:', error)
      throw new Error('Unable to fetch miss statistics')
    }
  }

  /**
   * Get analytics data for charts and trends
   */
  async getMissAnalytics(): Promise<MissAnalytics> {
    try {
      const allMisses = await db.getTopMisses(1000) // Get more data for analytics

      // Daily misses for the last 30 days
      const dailyMisses = this.calculateDailyMisses(allMisses)

      // Type distribution
      const typeDistribution = this.calculateTypeDistribution(allMisses)

      // Frequency distribution
      const frequencyDistribution = this.calculateFrequencyDistribution(allMisses)

      return {
        dailyMisses,
        typeDistribution,
        frequencyDistribution
      }
    } catch (error) {
      console.error('Failed to get miss analytics:', error)
      throw new Error('Unable to fetch miss analytics')
    }
  }

  /**
   * Mark misses as reviewed by admin
   */
  async markAsReviewed(missIds: string[], notes?: string): Promise<void> {
    try {
      const { error } = await db.supabase
        .from('miss_log')
        .update({
          admin_reviewed: true,
          review_notes: notes || 'Reviewed by admin'
        })
        .in('id', missIds)

      if (error) throw error

      console.log(`Marked ${missIds.length} misses as reviewed`)
    } catch (error) {
      console.error('Failed to mark misses as reviewed:', error)
      throw new Error('Unable to update miss status')
    }
  }

  /**
   * Add new compression rule from miss
   */
  async createRuleFromMiss(
    missId: string,
    compressedForm: string,
    confidence: number = 0.70
  ): Promise<void> {
    try {
      // Get the miss entry
      const { data: miss, error: missError } = await db.supabase
        .from('miss_log')
        .select('*')
        .eq('id', missId)
        .single()

      if (missError) throw missError

      if (!miss) {
        throw new Error('Miss entry not found')
      }

      // Create compression rule
      const { error: ruleError } = await db.supabase
        .from('compressions')
        .insert({
          original_text: miss.word_phrase,
          compressed_form: compressedForm,
          compression_rule: `${miss.word_phrase} → ${compressedForm}`,
          word_count: miss.token_count || miss.word_phrase.split(' ').length,
          pass_priority: miss.miss_type === 'phrase' ? 1 : 2,
          compression_type: miss.miss_type,
          confidence_score: confidence,
          compression_ratio: Math.round(
            ((miss.word_phrase.length - compressedForm.length) / miss.word_phrase.length) * 100
          )
        })

      if (ruleError) throw ruleError

      // Mark miss as reviewed
      await this.markAsReviewed([missId], `Created rule: ${miss.word_phrase} → ${compressedForm}`)

      console.log(`Created compression rule from miss: ${miss.word_phrase} → ${compressedForm}`)
    } catch (error) {
      console.error('Failed to create rule from miss:', error)
      throw new Error('Unable to create compression rule')
    }
  }

  /**
   * Calculate daily miss trends
   */
  private calculateDailyMisses(misses: MissLogEntry[]): { date: string; count: number }[] {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (29 - i))
      return date.toISOString().split('T')[0]
    })

    return last30Days.map(date => ({
      date,
      count: misses.filter(miss => miss.first_seen.startsWith(date)).length
    }))
  }

  /**
   * Calculate type distribution
   */
  private calculateTypeDistribution(misses: MissLogEntry[]): { type: string; count: number }[] {
    const types = misses.reduce((acc, miss) => {
      acc[miss.miss_type] = (acc[miss.miss_type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(types).map(([type, count]) => ({ type, count }))
  }

  /**
   * Calculate frequency distribution ranges
   */
  private calculateFrequencyDistribution(misses: MissLogEntry[]): { range: string; count: number }[] {
    const ranges = [
      { range: '1-5', min: 1, max: 5 },
      { range: '6-10', min: 6, max: 10 },
      { range: '11-25', min: 11, max: 25 },
      { range: '26-50', min: 26, max: 50 },
      { range: '50+', min: 51, max: Infinity }
    ]

    return ranges.map(({ range, min, max }) => ({
      range,
      count: misses.filter(miss => miss.frequency >= min && miss.frequency <= max).length
    }))
  }

  /**
   * Get suggestions for new compression rules based on frequency and patterns
   */
  async getCompressionSuggestions(limit: number = 20): Promise<{
    word: string
    frequency: number
    suggestedCompression?: string
    confidence: number
  }[]> {
    try {
      const misses = await db.getTopMisses(100)

      return misses
        .filter(miss => miss.frequency >= 5 && !miss.admin_reviewed) // High frequency, not reviewed
        .slice(0, limit)
        .map(miss => ({
          word: miss.word_phrase,
          frequency: miss.frequency,
          suggestedCompression: this.suggestCompression(miss.word_phrase),
          confidence: this.calculateSuggestionConfidence(miss)
        }))
        .sort((a, b) => b.confidence - a.confidence)
    } catch (error) {
      console.error('Failed to get compression suggestions:', error)
      return []
    }
  }

  /**
   * Simple compression suggestion algorithm
   */
  private suggestCompression(word: string): string | undefined {
    const lowerWord = word.toLowerCase()

    // Common patterns
    const patterns = [
      { pattern: /tion$/, replacement: 'tn' },
      { pattern: /ment$/, replacement: 'mt' },
      { pattern: /ness$/, replacement: 'ns' },
      { pattern: /ing$/, replacement: 'ng' },
      { pattern: /ould$/, replacement: 'd' },
      { pattern: /ough/, replacement: 'o' },
      { pattern: /you/, replacement: 'u' },
      { pattern: /are/, replacement: 'r' },
      { pattern: /for/, replacement: '4' },
      { pattern: /to/, replacement: '2' },
    ]

    for (const { pattern, replacement } of patterns) {
      if (pattern.test(lowerWord)) {
        return lowerWord.replace(pattern, replacement)
      }
    }

    // Vowel removal for longer words
    if (word.length > 6) {
      return word.replace(/[aeiou]/gi, '').substring(0, Math.max(3, Math.floor(word.length * 0.6)))
    }

    return undefined
  }

  /**
   * Calculate confidence for compression suggestions
   */
  private calculateSuggestionConfidence(miss: MissLogEntry): number {
    let confidence = 0.5

    // Higher frequency = higher confidence
    if (miss.frequency > 20) confidence += 0.2
    else if (miss.frequency > 10) confidence += 0.1

    // Single words are easier to compress
    if (miss.miss_type === 'word') confidence += 0.1

    // Longer words have more compression potential
    if (miss.word_phrase.length > 8) confidence += 0.1

    return Math.min(confidence, 0.9)
  }
}

// Export singleton instance
export const missTracker = new MissTrackingService()
import { db, CompressionPattern } from '../supabase'
import { smartMissTracker } from '../smart-miss-tracker'
import { extractCleanWords, reassembleText, CleanWord } from '../text-utils'
import { questionPrefixProcessor, Pass0Result } from './pass-zero'
import CryptoJS from 'crypto-js'

// Types for compression processing
export interface CompressionResult {
  original: string
  compressed: string
  compressionRatio: number
  processingTime: number
  rulesApplied: AppliedRule[]
  fromCache: boolean
  passResults: {
    pass0: PassResult
    pass1: PassResult
    pass2: PassResult
  }
  pass0Result?: Pass0Result
}

export interface AppliedRule {
  id: string
  originalText: string
  compressedForm: string
  pass: number
  confidence: number
  startIndex: number
  endIndex: number
}

export interface PassResult {
  tokensProcessed: number
  rulesApplied: number
  processingTime: number
}

export interface Token {
  text: string              // Clean word for matching
  original: string          // Original word with punctuation
  index: number
  processed: boolean
  originalIndex: number
  cleanWord: CleanWord      // Full punctuation info
}

export class ThreePassCompressionEngine {
  private pass0Patterns: CompressionPattern[] = []
  private phrasePatterns: CompressionPattern[] = []
  private wordPatterns: CompressionPattern[] = []
  private cacheHits = new Map<string, CompressionResult>()

  /**
   * Main compression entry point
   */
  async compress(text: string, sessionId?: string): Promise<CompressionResult> {
    const startTime = Date.now()

    // Step 1: Check full-text cache
    const cacheKey = this.generateCacheKey(text)
    const cached = this.cacheHits.get(cacheKey)
    if (cached) {
      return {
        ...cached,
        fromCache: true,
        processingTime: Date.now() - startTime
      }
    }

    // Step 2: Load patterns from database
    await this.loadPatterns()

    // Step 3: Three-pass compression
    const result = await this.performThreePassCompression(text, startTime, sessionId)

    // Step 4: Cache result for future use
    this.cacheHits.set(cacheKey, { ...result, fromCache: false })

    return result
  }

  /**
   * Load compression patterns from database by priority
   */
  private async loadPatterns() {
    try {
      // Load Pass 0 patterns (priority 0)
      this.pass0Patterns = await db.getPatternsByPriority(0, 0.70)

      // Load phrase patterns (Pass 1, priority 1)
      this.phrasePatterns = await db.getPatternsByPriority(1, 0.70)

      // Load word patterns (Pass 2, priority 2)
      this.wordPatterns = await db.getPatternsByPriority(2, 0.70)

      console.log(`Loaded ${this.pass0Patterns.length} Pass 0 patterns, ${this.phrasePatterns.length} phrase patterns, ${this.wordPatterns.length} word patterns`)
    } catch (error) {
      console.error('Failed to load patterns:', error)
      throw new Error('Database connection failed')
    }
  }

  /**
   * Perform the three-pass compression algorithm with Pass 0 prefix removal
   */
  private async performThreePassCompression(text: string, startTime: number, sessionId?: string): Promise<CompressionResult> {
    // Store original text for case preservation
    const originalText = text

    // Pass 0: Question prefix removal
    const pass0Start = Date.now()
    const pass0Result = questionPrefixProcessor.processText(text)
    const pass0Time = Date.now() - pass0Start

    // Use Pass 0 processed text for subsequent passes
    const textAfterPass0 = pass0Result.processed
    console.log(`[${sessionId}] Pass 0: "${text}" → "${textAfterPass0}" (${pass0Result.compressionRatio}% compression)`)

    // Extract clean words with punctuation preservation from Pass 0 result
    const cleanWords = extractCleanWords(textAfterPass0)

    console.log(`[${sessionId}] Extracted ${cleanWords.length} words with punctuation handling`)

    // Create word-based tokens with punctuation info
    const tokens: Token[] = cleanWords.map((cleanWord, index) => ({
      text: cleanWord.clean,           // Clean word for matching
      original: cleanWord.original,    // Original with punctuation
      index,
      processed: false,
      originalIndex: index,
      cleanWord: cleanWord             // Full punctuation info
    }))

    const appliedRules: AppliedRule[] = []

    // Add Pass 0 rule if prefix was removed
    if (pass0Result.prefixRemoved) {
      appliedRules.push({
        id: 'pass0-prefix-removal',
        originalText: pass0Result.prefixRemoved,
        compressedForm: pass0Result.questionMarkAdded ? '?' : '',
        pass: 0,
        confidence: 0.95,
        startIndex: 0,
        endIndex: 0
      })
    }

    // Pass 1: Phrase compression (2-6 word patterns)
    const pass1Start = Date.now()
    const pass1Result = await this.performPhrasePass(tokens, appliedRules)
    const pass1Time = Date.now() - pass1Start

    // Pass 2: Word compression (individual words)
    const pass2Start = Date.now()
    const pass2Result = await this.performWordPass(tokens, appliedRules)
    const pass2Time = Date.now() - pass2Start

    // Reassemble the text with proper spacing
    const compressed = this.reassembleText(tokens, textAfterPass0)
    const compressionRatio = this.calculateCompressionRatio(originalText, compressed)

    // Track misses for patterns not found
    await this.trackMisses(originalText, tokens, appliedRules)

    // Update usage counts for applied rules
    await this.updateUsageCounts(appliedRules)

    return {
      original: originalText,
      compressed,
      compressionRatio,
      processingTime: Date.now() - startTime,
      rulesApplied: appliedRules,
      fromCache: false,
      passResults: {
        pass0: {
          tokensProcessed: pass0Result.prefixRemoved ? 1 : 0,
          rulesApplied: pass0Result.prefixRemoved ? 1 : 0,
          processingTime: pass0Time
        },
        pass1: {
          tokensProcessed: pass1Result.tokensProcessed,
          rulesApplied: pass1Result.rulesApplied,
          processingTime: pass1Time
        },
        pass2: {
          tokensProcessed: pass2Result.tokensProcessed,
          rulesApplied: pass2Result.rulesApplied,
          processingTime: pass2Time
        }
      },
      pass0Result
    }
  }

  /**
   * Pass 1: Phrase compression using 6→5→4→3→2→1 sliding window with case-insensitive matching
   */
  private async performPhrasePass(tokens: Token[], appliedRules: AppliedRule[]): Promise<PassResult> {
    let tokensProcessed = 0
    let rulesApplied = 0

    // Sliding window: check 6, 5, 4, 3, 2, 1 word combinations (longest first)
    for (let windowSize = 6; windowSize >= 1; windowSize--) {
      for (let i = 0; i <= tokens.length - windowSize; i++) {
        // Skip if any token in window is already processed
        if (tokens.slice(i, i + windowSize).some(token => token.processed)) {
          continue
        }

        // Extract phrase from word tokens (space-separated)
        const phraseTokens = tokens.slice(i, i + windowSize)
        const phrase = phraseTokens.map(t => t.text).join(' ').trim()

        if (!phrase || phrase.length < 2) continue

        // Find matching pattern (both already lowercase)
        const pattern = this.phrasePatterns.find(p => {
          const normalizedPatternText = p.original_text.toLowerCase()
          return normalizedPatternText === phrase && p.word_count === windowSize
        })

        if (pattern) {
          // Apply compression
          this.applyPhraseCompression(tokens, i, windowSize, pattern, appliedRules)
          tokensProcessed += windowSize
          rulesApplied++
        }
      }
    }

    return { tokensProcessed, rulesApplied, processingTime: 0 }
  }

  /**
   * Pass 2: Word compression for unprocessed tokens (case-insensitive)
   */
  private async performWordPass(tokens: Token[], appliedRules: AppliedRule[]): Promise<PassResult> {
    let tokensProcessed = 0
    let rulesApplied = 0

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]

      // Skip already processed tokens or empty tokens
      if (token.processed || !token.text.trim()) {
        continue
      }

      // Find matching word pattern (case-insensitive)
      const pattern = this.wordPatterns.find(p => {
        const normalizedPatternText = p.original_text.toLowerCase()
        const normalizedTokenText = token.text.toLowerCase().trim()
        return normalizedPatternText === normalizedTokenText
      })

      if (pattern) {
        // Apply word compression with case preservation
        token.text = this.preserveCase(token.text, pattern.compressed_form)
        token.processed = true

        appliedRules.push({
          id: pattern.pattern_id || pattern.original_text,
          originalText: pattern.original_text,
          compressedForm: pattern.compressed_form,
          pass: 2,
          confidence: pattern.confidence_score,
          startIndex: i,
          endIndex: i
        })

        tokensProcessed++
        rulesApplied++
      }
    }

    return { tokensProcessed, rulesApplied, processingTime: 0 }
  }

  /**
   * Apply phrase compression with case preservation
   */
  private applyPhraseCompression(
    tokens: Token[],
    startIndex: number,
    windowSize: number,
    pattern: CompressionPattern,
    appliedRules: AppliedRule[]
  ) {
    // Get original phrase for case preservation (space-separated)
    const originalPhrase = tokens.slice(startIndex, startIndex + windowSize)
      .map(t => t.text).join(' ')

    // Apply compression with case preservation
    const compressedPhrase = this.preserveCase(originalPhrase, pattern.compressed_form)

    // Replace the first token with compressed phrase, mark others as processed
    tokens[startIndex].text = compressedPhrase
    tokens[startIndex].processed = true

    // Mark subsequent tokens as processed and empty them
    for (let i = startIndex + 1; i < startIndex + windowSize; i++) {
      tokens[i].text = ''
      tokens[i].processed = true
    }

    appliedRules.push({
      id: pattern.id,
      originalText: pattern.original_text,
      compressedForm: pattern.compressed_form,
      pass: 1,
      confidence: pattern.confidence_score,
      startIndex,
      endIndex: startIndex + windowSize - 1
    })
  }

  /**
   * Preserve case pattern from original to compressed
   */
  private preserveCase(original: string, compressed: string): string {
    // Simple case preservation - can be enhanced
    if (original === original.toUpperCase()) {
      return compressed.toUpperCase()
    }
    if (original[0] === original[0].toUpperCase()) {
      return compressed.charAt(0).toUpperCase() + compressed.slice(1).toLowerCase()
    }
    return compressed.toLowerCase()
  }

  /**
   * Track missed patterns for admin review using smart filtering
   */
  private async trackMisses(originalText: string, tokens: Token[], appliedRules: AppliedRule[]) {
    try {
      console.log(`🔍 Smart miss tracking for: "${originalText}"`)

      // Use smart miss tracker with intelligent filtering
      const result = await smartMissTracker.trackSmartMisses(
        originalText,
        tokens,
        appliedRules
      )

      console.log(`📊 Smart miss results: ${result.wordsLogged} words + ${result.phrasesLogged} phrases logged | ${result.wordsSkipped} words + ${result.phrasesSkipped} phrases skipped`)

      // Log detailed results if any items were logged
      if (result.loggedItems.length > 0) {
        result.loggedItems.forEach(item => {
          console.log(`  ✅ Logged ${item.type}: "${item.text}" (${item.reason})`)
        })
      }

    } catch (error) {
      console.error('❌ Smart miss tracking failed:', error)
    }
  }

  /**
   * Update usage counts for applied patterns
   */
  private async updateUsageCounts(appliedRules: AppliedRule[]) {
    for (const rule of appliedRules) {
      try {
        await db.incrementUsage(rule.originalText)
      } catch (error) {
        console.error('Failed to update usage count:', error)
      }
    }
  }

  /**
   * Generate cache key for full-text lookups
   */
  private generateCacheKey(text: string): string {
    return CryptoJS.MD5(text.trim().toLowerCase()).toString()
  }

  /**
   * Reassemble text from tokens with punctuation preservation
   */
  private reassembleText(tokens: Token[], originalText: string): string {
    const result = tokens.map(token => {
      // If the token was processed (compressed), use the compressed form
      // Otherwise use the original clean word
      const finalWord = token.text

      // Reconstruct with original punctuation
      const cleanWordInfo = token.cleanWord
      return `${cleanWordInfo.leadingPunctuation}${finalWord}${cleanWordInfo.trailingPunctuation}`
    }).filter(word => word.trim().length > 0)

    return result.join(' ')
  }

  /**
   * Calculate compression ratio as percentage
   */
  private calculateCompressionRatio(original: string, compressed: string): number {
    if (original.length === 0) return 0
    return Math.round(((original.length - compressed.length) / original.length) * 100)
  }

  /**
   * Clear cache (for testing or memory management)
   */
  clearCache() {
    this.cacheHits.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cacheHits.size,
      entries: Array.from(this.cacheHits.keys())
    }
  }
}

// Export singleton instance
export const compressionEngine = new ThreePassCompressionEngine()
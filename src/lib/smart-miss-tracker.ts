import { db } from './supabase'
import { getCleanWordForMatching } from './text-utils'

/**
 * Smart Miss Tracker - Intelligent filtering for meaningful compression patterns
 * Only logs high-value misses that could become useful compression rules
 */

// Skip lists for common words that shouldn't be logged
const SKIP_WORDS = new Set([
  // Articles
  'a', 'an', 'the',

  // Prepositions
  'for', 'to', 'at', 'in', 'on', 'of', 'by', 'with', 'from', 'up', 'out', 'off',

  // Common verbs
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',

  // Pronouns
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',

  // Common conjunctions/connectors
  'and', 'or', 'but', 'so', 'if', 'as', 'that', 'this', 'these', 'those',

  // Single letters & very short
  'a', 'i', 'am', 'my', 'no', 'go', 'so', 'do', 'to', 'we', 'me', 'he',

  // Common question words (usually context-specific)
  'who', 'what', 'when', 'where', 'why', 'how',

  // Time markers (too generic)
  'now', 'then', 'here', 'there'
])

// High-value word patterns that should be logged
const HIGH_VALUE_PATTERNS = {
  // Technology terms
  TECH_TERMS: /^(blockchain|kubernetes|cryptocurrency|javascript|typescript|database|algorithm|optimization|authentication|deployment|infrastructure|microservices|containerization|orchestration|scalability)$/i,

  // Long common words (abbreviation candidates)
  LONG_COMMON: /^(definitely|probably|something|everything|anything|nothing|someone|everyone|anyone|tomorrow|tonight|yesterday|because|through|without|between|understand|remember|important|necessary|different|beautiful|wonderful|excellent|fantastic)$/i,

  // Business/professional terms
  BUSINESS_TERMS: /^(management|development|marketing|strategy|analysis|implementation|integration|configuration|documentation|presentation|communication|collaboration|optimization|efficiency|productivity)$/i,

  // Common abbreviable words
  ABBREVIABLE: /^(please|document|application|information|technology|government|organization|administration|environment|development|management|department|university|community|individual|professional|commercial|international|educational|traditional)$/i
}

// Phrase quality scoring
const PHRASE_QUALITY_RULES = {
  // High value 2-3 word phrases
  isHighValuePhrase(phrase: string): boolean {
    const words = phrase.split(' ')

    // Must be 2-3 words
    if (words.length < 2 || words.length > 3) return false

    // Check for common valuable patterns
    const commonPatterns = [
      /right now/i, /good idea/i, /figure out/i, /find out/i, /check out/i,
      /let me know/i, /make sure/i, /as well/i, /at all/i, /of course/i,
      /by the way/i, /in order/i, /a lot/i, /kind of/i, /sort of/i,
      /as soon as/i, /as much as/i, /as long as/i, /such as/i,
      /thank you/i, /see you/i, /talk to/i, /going to/i, /want to/i,
      /need to/i, /have to/i, /able to/i, /used to/i, /trying to/i
    ]

    return commonPatterns.some(pattern => pattern.test(phrase))
  },

  // Skip overly specific or low-value phrases
  shouldSkipPhrase(phrase: string): boolean {
    const words = phrase.split(' ')

    // Skip if contains numbers or special characters
    if (/\d|[^\w\s]/g.test(phrase)) return true

    // Skip if too long (4+ words are usually too specific)
    if (words.length > 3) return true

    // Skip if all words are in skip list
    if (words.every(word => SKIP_WORDS.has(word.toLowerCase()))) return true

    // Skip proper nouns (capitalized words that aren't sentence start)
    const properNouns = words.filter((word, index) =>
      index > 0 && word[0] === word[0].toUpperCase() && word.length > 1
    )
    if (properNouns.length > 0) return true

    return false
  }
}

export interface SmartMissResult {
  wordsLogged: number
  phrasesLogged: number
  wordsSkipped: number
  phrasesSkipped: number
  loggedItems: Array<{ text: string, type: 'word' | 'phrase', reason: string }>
}

export class SmartMissTracker {

  /**
   * Intelligently track misses with filtering rules
   */
  async trackSmartMisses(
    originalText: string,
    tokens: Array<{ text: string, processed: boolean }>,
    appliedRules: Array<{ originalText: string }>
  ): Promise<SmartMissResult> {

    const result: SmartMissResult = {
      wordsLogged: 0,
      phrasesLogged: 0,
      wordsSkipped: 0,
      phrasesSkipped: 0,
      loggedItems: []
    }

    const appliedTexts = new Set(appliedRules.map(rule => rule.originalText.toLowerCase()))

    // Extract unprocessed tokens and clean them for analysis
    const unprocessedTokens = tokens.filter(token => !token.processed && token.text.trim())
    const words = unprocessedTokens.map(t => getCleanWordForMatching(t.text))

    // 1. SMART WORD TRACKING
    await this.trackSmartWords(words, appliedTexts, originalText, result)

    // 2. SMART PHRASE TRACKING
    await this.trackSmartPhrases(words, appliedTexts, originalText, result)

    console.log(`📊 Smart Miss Summary: ${result.wordsLogged} words, ${result.phrasesLogged} phrases logged | ${result.wordsSkipped} words, ${result.phrasesSkipped} phrases skipped`)

    return result
  }

  /**
   * Track high-value words only
   */
  private async trackSmartWords(
    words: string[],
    appliedTexts: Set<string>,
    originalText: string,
    result: SmartMissResult
  ) {
    const uniqueWords = [...new Set(words)]

    for (const word of uniqueWords) {
      // Skip if already compressed
      if (appliedTexts.has(word)) continue

      // Skip if in skip list
      if (SKIP_WORDS.has(word)) {
        result.wordsSkipped++
        continue
      }

      // Skip very short words (< 4 characters, except tech terms)
      if (word.length < 4 && !this.isHighValueWord(word)) {
        result.wordsSkipped++
        continue
      }

      // Skip if not high value
      if (!this.isHighValueWord(word)) {
        result.wordsSkipped++
        continue
      }

      // LOG THIS HIGH-VALUE WORD
      try {
        await db.logMiss(word, 'word', [originalText])
        result.wordsLogged++
        result.loggedItems.push({
          text: word,
          type: 'word',
          reason: this.getWordValueReason(word)
        })
        console.log(`✅ Logged high-value word: "${word}" (${this.getWordValueReason(word)})`)
      } catch (error) {
        console.error(`❌ Failed to log word "${word}":`, error)
      }
    }
  }

  /**
   * Track high-value 2-3 word phrases
   */
  private async trackSmartPhrases(
    words: string[],
    appliedTexts: Set<string>,
    originalText: string,
    result: SmartMissResult
  ) {
    // Generate 2-word and 3-word phrases
    const phrases: string[] = []

    // 2-word phrases
    for (let i = 0; i < words.length - 1; i++) {
      phrases.push(`${words[i]} ${words[i + 1]}`)
    }

    // 3-word phrases
    for (let i = 0; i < words.length - 2; i++) {
      phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`)
    }

    const uniquePhrases = [...new Set(phrases)]

    for (const phrase of uniquePhrases) {
      // Skip if already compressed
      if (appliedTexts.has(phrase)) continue

      // Skip low-value phrases
      if (PHRASE_QUALITY_RULES.shouldSkipPhrase(phrase)) {
        result.phrasesSkipped++
        continue
      }

      // Only log high-value phrases
      if (!PHRASE_QUALITY_RULES.isHighValuePhrase(phrase)) {
        result.phrasesSkipped++
        continue
      }

      // LOG THIS HIGH-VALUE PHRASE
      try {
        await db.logMiss(phrase, 'phrase', [originalText])
        result.phrasesLogged++
        result.loggedItems.push({
          text: phrase,
          type: 'phrase',
          reason: 'High-value phrase pattern'
        })
        console.log(`✅ Logged high-value phrase: "${phrase}"`)
      } catch (error) {
        console.error(`❌ Failed to log phrase "${phrase}":`, error)
      }
    }
  }

  /**
   * Check if a word is high-value and worth logging
   */
  private isHighValueWord(word: string): boolean {
    // Check against high-value patterns
    for (const pattern of Object.values(HIGH_VALUE_PATTERNS)) {
      if (pattern.test(word)) return true
    }

    // Long words (8+ chars) are usually worth abbreviating
    if (word.length >= 8) return true

    return false
  }

  /**
   * Get reason why a word is considered high-value
   */
  private getWordValueReason(word: string): string {
    if (HIGH_VALUE_PATTERNS.TECH_TERMS.test(word)) return 'Tech term'
    if (HIGH_VALUE_PATTERNS.LONG_COMMON.test(word)) return 'Long common word'
    if (HIGH_VALUE_PATTERNS.BUSINESS_TERMS.test(word)) return 'Business term'
    if (HIGH_VALUE_PATTERNS.ABBREVIABLE.test(word)) return 'Abbreviable word'
    if (word.length >= 8) return 'Long word (8+ chars)'
    return 'High-value pattern'
  }
}

// Export singleton instance
export const smartMissTracker = new SmartMissTracker()
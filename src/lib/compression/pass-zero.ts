/**
 * Pass 0: Question Prefix Removal System
 * Removes redundant question prefixes and adds "?" for context preservation
 */

export interface Pass0Result {
  original: string
  processed: string
  prefixRemoved: string | null
  compressionRatio: number
  questionMarkAdded: boolean
}

export interface QuestionPrefix {
  pattern: RegExp
  name: string
  priority: number
}

export class QuestionPrefixProcessor {
  private readonly questionPrefixes: QuestionPrefix[] = [
    // High priority - most specific patterns first
    { pattern: /^can you please\s+/i, name: 'can_you_please', priority: 1 },
    { pattern: /^could you please\s+/i, name: 'could_you_please', priority: 1 },
    { pattern: /^would you please\s+/i, name: 'would_you_please', priority: 1 },
    { pattern: /^would it be possible to\s+/i, name: 'would_it_be_possible', priority: 1 },
    { pattern: /^is it possible to\s+/i, name: 'is_it_possible', priority: 1 },
    { pattern: /^i would like you to\s+/i, name: 'i_would_like_you_to', priority: 1 },
    { pattern: /^i need you to\s+/i, name: 'i_need_you_to', priority: 1 },

    // Medium priority - shorter variations
    { pattern: /^can you\s+/i, name: 'can_you', priority: 2 },
    { pattern: /^could you\s+/i, name: 'could_you', priority: 2 },
    { pattern: /^would you\s+/i, name: 'would_you', priority: 2 },
    { pattern: /^will you\s+/i, name: 'will_you', priority: 2 },

    // Lower priority - simple patterns
    { pattern: /^please\s+/i, name: 'please', priority: 3 }
  ]

  /**
   * Process text through Pass 0 question prefix removal
   */
  processText(text: string): Pass0Result {
    if (!text || text.trim().length === 0) {
      return {
        original: text,
        processed: text,
        prefixRemoved: null,
        compressionRatio: 0,
        questionMarkAdded: false
      }
    }

    const originalText = text.trim()
    let processedText = originalText
    let prefixRemoved: string | null = null
    let questionMarkAdded = false

    // Step 1: Find and remove question prefix
    for (const prefix of this.questionPrefixes) {
      const match = processedText.match(prefix.pattern)
      if (match) {
        prefixRemoved = match[0].trim()
        processedText = processedText.replace(prefix.pattern, '').trim()

        // Step 2: Normalize first letter (make lowercase unless it's a proper noun)
        if (processedText.length > 0) {
          const firstChar = processedText[0]
          // Only lowercase if it's not already part of a likely proper noun
          if (firstChar === firstChar.toUpperCase() && !this.isLikelyProperNoun(processedText)) {
            processedText = firstChar.toLowerCase() + processedText.slice(1)
          }
        }
        break
      }
    }

    // Step 3: Add question mark if missing and this was clearly a question
    if (prefixRemoved && !processedText.endsWith('?') && !processedText.endsWith('.')) {
      processedText += '?'
      questionMarkAdded = true
    }

    // Calculate compression ratio
    const compressionRatio = originalText.length > 0
      ? Math.round(((originalText.length - processedText.length) / originalText.length) * 100)
      : 0

    return {
      original: originalText,
      processed: processedText,
      prefixRemoved,
      compressionRatio,
      questionMarkAdded
    }
  }

  /**
   * Check if the text starts with a likely proper noun
   */
  private isLikelyProperNoun(text: string): boolean {
    const firstWord = text.split(' ')[0]

    // Common proper noun patterns
    const properNounPatterns = [
      /^[A-Z][a-z]+$/,  // Standard proper noun: "React", "JavaScript"
      /^[A-Z]{2,}$/,     // Acronyms: "API", "HTTP", "SQL"
      /^[A-Z][a-z]*[A-Z]/,  // CamelCase: "TypeScript", "GitHub"
    ]

    return properNounPatterns.some(pattern => pattern.test(firstWord))
  }

  /**
   * Get statistics about prefix patterns
   */
  getPatternStats(): Array<{ name: string; pattern: string; priority: number }> {
    return this.questionPrefixes.map(prefix => ({
      name: prefix.name,
      pattern: prefix.pattern.source,
      priority: prefix.priority
    }))
  }

  /**
   * Test if text contains a question prefix
   */
  hasQuestionPrefix(text: string): boolean {
    const trimmed = text.trim()
    return this.questionPrefixes.some(prefix => prefix.pattern.test(trimmed))
  }

  /**
   * Get the prefix that would be removed (without actually removing it)
   */
  getMatchingPrefix(text: string): string | null {
    const trimmed = text.trim()
    for (const prefix of this.questionPrefixes) {
      const match = trimmed.match(prefix.pattern)
      if (match) {
        return match[0].trim()
      }
    }
    return null
  }
}

// Export singleton instance
export const questionPrefixProcessor = new QuestionPrefixProcessor()
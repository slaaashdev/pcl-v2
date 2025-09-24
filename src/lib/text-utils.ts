/**
 * Text Processing Utilities for PCL Compression System
 * Handles punctuation stripping while preserving text structure
 */

export interface CleanWord {
  clean: string              // Word without punctuation for matching
  original: string           // Original word with punctuation
  leadingPunctuation: string // Punctuation before the word
  trailingPunctuation: string // Punctuation after the word
}

// Punctuation patterns
const PUNCTUATION_REGEX = /[.,!?:;"'()\[\]{}\-—…*#@$%^&+=<>|\\\/~`]/g
const TRAILING_PUNCTUATION_REGEX = /[.,!?:;"')\]}]$/
const LEADING_PUNCTUATION_REGEX = /^["'(\[{]/

// Special cases to preserve
const CONTRACTION_PATTERNS = [
  /\b\w+'\w+\b/g,           // don't, won't, it's, you're
  /\b\w+'s\b/g,             // possessives: John's, car's
  /\b\w+'re\b/g,            // you're, they're
  /\b\w+'ll\b/g,            // you'll, we'll
  /\b\w+'ve\b/g,            // I've, you've
  /\b\w+'d\b/g,             // I'd, you'd
]

const DECIMAL_PATTERN = /^\d+\.\d+$/        // 3.14, 10.5
const URL_PATTERN = /\w+\.\w+/              // site.com, example.org
const COMPOUND_WORD_PATTERN = /^\w+-\w+$/   // twenty-one, well-known

/**
 * Extract and clean a single word, preserving punctuation info
 */
export function cleanWord(word: string): CleanWord {
  if (!word || word.trim().length === 0) {
    return { clean: '', original: word, leadingPunctuation: '', trailingPunctuation: '' }
  }

  const originalWord = word
  let cleanWord = word.toLowerCase().trim()

  // Handle special cases - preserve these as-is
  if (isSpecialCase(cleanWord)) {
    return {
      clean: cleanWord,
      original: originalWord,
      leadingPunctuation: '',
      trailingPunctuation: ''
    }
  }

  // Extract leading punctuation
  const leadingMatch = cleanWord.match(LEADING_PUNCTUATION_REGEX)
  const leadingPunctuation = leadingMatch ? leadingMatch[0] : ''

  // Extract trailing punctuation
  const trailingMatch = cleanWord.match(TRAILING_PUNCTUATION_REGEX)
  const trailingPunctuation = trailingMatch ? trailingMatch[0] : ''

  // Remove all punctuation for clean word
  cleanWord = cleanWord.replace(PUNCTUATION_REGEX, '')

  // Handle edge case: word was all punctuation
  if (cleanWord.length === 0) {
    return {
      clean: '',
      original: originalWord,
      leadingPunctuation: leadingPunctuation,
      trailingPunctuation: trailingPunctuation
    }
  }

  return {
    clean: cleanWord,
    original: originalWord,
    leadingPunctuation: leadingPunctuation,
    trailingPunctuation: trailingPunctuation
  }
}

/**
 * Check if a word should be preserved as-is (special cases)
 */
function isSpecialCase(word: string): boolean {
  // Check contractions
  for (const pattern of CONTRACTION_PATTERNS) {
    if (pattern.test(word)) {
      return true
    }
  }

  // Check decimals
  if (DECIMAL_PATTERN.test(word)) {
    return true
  }

  // Check URLs
  if (URL_PATTERN.test(word)) {
    return true
  }

  // Check compound words
  if (COMPOUND_WORD_PATTERN.test(word)) {
    return true
  }

  return false
}

/**
 * Extract clean words from text for compression processing
 */
export function extractCleanWords(text: string): CleanWord[] {
  if (!text || text.trim().length === 0) {
    return []
  }

  // Split on whitespace to get raw tokens
  const rawTokens = text.trim().split(/\s+/).filter(token => token.length > 0)

  // Process each token to extract clean words
  const cleanWords = rawTokens.map(cleanWord).filter(word => word.clean.length > 0)

  return cleanWords
}

/**
 * Reassemble text with compression applied, preserving punctuation
 */
export function reassembleText(
  originalWords: CleanWord[],
  processedWords: string[], // Same length as originalWords
  compressionMap: Map<string, string> = new Map()
): string {
  if (originalWords.length !== processedWords.length) {
    console.warn('Mismatch between original and processed word counts')
    return processedWords.join(' ')
  }

  const result = originalWords.map((original, index) => {
    const processed = processedWords[index]

    // If word was compressed, use the compressed form
    const finalWord = processed || original.clean

    // Reconstruct with punctuation
    return `${original.leadingPunctuation}${finalWord}${original.trailingPunctuation}`
  })

  return result.join(' ')
}

/**
 * Get clean word for pattern matching (strips all punctuation)
 */
export function getCleanWordForMatching(word: string): string {
  const cleaned = cleanWord(word)
  return cleaned.clean
}

/**
 * Extract phrases from clean words (for phrase compression)
 */
export function extractCleanPhrases(cleanWords: CleanWord[], windowSize: number): string[] {
  if (cleanWords.length < windowSize) {
    return []
  }

  const phrases: string[] = []

  for (let i = 0; i <= cleanWords.length - windowSize; i++) {
    const phraseWords = cleanWords.slice(i, i + windowSize)
    const phrase = phraseWords.map(w => w.clean).join(' ')

    if (phrase.trim().length > 0) {
      phrases.push(phrase)
    }
  }

  return phrases
}

/**
 * Utility for debugging - show word analysis
 */
export function analyzeText(text: string): void {
  console.log('🔍 Text Analysis:')
  console.log('Original:', text)

  const cleanWords = extractCleanWords(text)
  console.log('Clean Words:', cleanWords.length)

  cleanWords.forEach((word, index) => {
    console.log(`  [${index}] "${word.original}" → clean: "${word.clean}"`,
                word.leadingPunctuation && `leading: "${word.leadingPunctuation}"`,
                word.trailingPunctuation && `trailing: "${word.trailingPunctuation}"`)
  })
}
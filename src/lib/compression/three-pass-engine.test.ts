/**
 * Integration Test Suite for Three-Pass Compression Engine
 */

import { ThreePassCompressionEngine } from './two-pass-engine'

// Mock the database and dependencies
jest.mock('../supabase', () => ({
  db: {
    getPatternsByPriority: jest.fn((priority: number) => {
      if (priority === 0) {
        // Pass 0 patterns
        return Promise.resolve([
          { id: '1', original_text: 'can you please', compressed_form: '?', word_count: 3, confidence_score: 0.95, pass_priority: 0 },
          { id: '2', original_text: 'could you', compressed_form: '?', word_count: 2, confidence_score: 0.85, pass_priority: 0 },
        ])
      } else if (priority === 1) {
        // Pass 1 phrase patterns
        return Promise.resolve([
          { id: '3', original_text: 'machine learning', compressed_form: 'ML', word_count: 2, confidence_score: 0.90, pass_priority: 1 },
          { id: '4', original_text: 'by the way', compressed_form: 'BTW', word_count: 3, confidence_score: 0.95, pass_priority: 1 },
        ])
      } else {
        // Pass 2 word patterns
        return Promise.resolve([
          { id: '5', original_text: 'explain', compressed_form: 'xpln', word_count: 1, confidence_score: 0.80, pass_priority: 2 },
          { id: '6', original_text: 'understand', compressed_form: 'undrst', word_count: 1, confidence_score: 0.75, pass_priority: 2 },
        ])
      }
    }),
    incrementUsage: jest.fn(() => Promise.resolve()),
  }
}))

jest.mock('../smart-miss-tracker', () => ({
  smartMissTracker: {
    trackSmartMisses: jest.fn(() => Promise.resolve({
      wordsLogged: 0,
      phrasesLogged: 0,
      wordsSkipped: 5,
      phrasesSkipped: 3,
      loggedItems: []
    }))
  }
}))

describe('Three-Pass Compression Engine', () => {
  let engine: ThreePassCompressionEngine

  beforeEach(() => {
    engine = new ThreePassCompressionEngine()
    // Clear any cached data
    engine.clearCache()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Full Three-Pass Compression', () => {
    test('should perform complete three-pass compression', async () => {
      const input = 'Can you please explain machine learning algorithms in detail?'

      const result = await engine.compress(input, 'test-session-1')

      // Should have results from all three passes
      expect(result.passResults.pass0).toBeDefined()
      expect(result.passResults.pass1).toBeDefined()
      expect(result.passResults.pass2).toBeDefined()

      // Should have Pass 0 result
      expect(result.pass0Result).toBeDefined()
      expect(result.pass0Result?.prefixRemoved).toBe('Can you please')

      // Should show significant compression from Pass 0 alone
      expect(result.pass0Result?.compressionRatio).toBeGreaterThan(20)

      // Should have applied rules from multiple passes
      expect(result.rulesApplied.length).toBeGreaterThan(0)

      // Should include Pass 0 rule
      const pass0Rule = result.rulesApplied.find(rule => rule.pass === 0)
      expect(pass0Rule).toBeDefined()
      expect(pass0Rule?.originalText).toBe('Can you please')
    })

    test('should handle text without question prefixes', async () => {
      const input = 'Machine learning algorithms are complex systems.'

      const result = await engine.compress(input)

      // Pass 0 should not modify the text
      expect(result.pass0Result?.prefixRemoved).toBe(null)
      expect(result.pass0Result?.compressionRatio).toBe(0)

      // Should still attempt Pass 1 and Pass 2
      expect(result.passResults.pass1).toBeDefined()
      expect(result.passResults.pass2).toBeDefined()

      // Pass 0 rule should not be applied
      const pass0Rules = result.rulesApplied.filter(rule => rule.pass === 0)
      expect(pass0Rules).toHaveLength(0)
    })

    test('should preserve case and punctuation through all passes', async () => {
      const input = 'Could you help me understand React, TypeScript, and Node.js?'

      const result = await engine.compress(input)

      // Original text should be preserved
      expect(result.original).toBe(input)

      // Compressed text should maintain proper capitalization
      expect(result.compressed).toMatch(/React/) // React should remain capitalized
      expect(result.compressed).toMatch(/TypeScript/) // TypeScript should remain capitalized

      // Should handle punctuation correctly
      expect(result.compressed).toMatch(/\\?$/) // Should end with question mark
    })
  })

  describe('Pass-Specific Results', () => {
    test('should track Pass 0 metrics correctly', async () => {
      const input = 'Can you please help me with this task?'

      const result = await engine.compress(input)

      const pass0Results = result.passResults.pass0
      expect(pass0Results.tokensProcessed).toBe(1) // One prefix processed
      expect(pass0Results.rulesApplied).toBe(1)    // One rule applied
      expect(pass0Results.processingTime).toBeGreaterThan(0)
    })

    test('should track Pass 1 and Pass 2 metrics', async () => {
      const input = 'Explain machine learning concepts to me'

      const result = await engine.compress(input)

      // Pass 1 should process phrase patterns
      expect(result.passResults.pass1.processingTime).toBeGreaterThan(0)

      // Pass 2 should process word patterns
      expect(result.passResults.pass2.processingTime).toBeGreaterThan(0)

      // Total processing time should be sum of all passes
      const totalPassTime =
        result.passResults.pass0.processingTime +
        result.passResults.pass1.processingTime +
        result.passResults.pass2.processingTime

      expect(result.processingTime).toBeGreaterThan(totalPassTime)
    })
  })

  describe('Compression Ratios', () => {
    test('should calculate overall compression ratio correctly', async () => {
      const input = 'Can you please explain machine learning?'
      // Expected: Pass 0 removes "Can you please " (16 chars)
      // Input: 39 chars, after Pass 0: ~23 chars, potential further compression

      const result = await engine.compress(input)

      // Should have meaningful compression from Pass 0
      expect(result.compressionRatio).toBeGreaterThan(30)

      // Pass 0 alone should provide significant compression
      expect(result.pass0Result?.compressionRatio).toBeGreaterThan(25)
    })

    test('should show stacking compression benefits', async () => {
      const input = 'Could you please explain machine learning algorithms?'

      const result = await engine.compress(input)

      // Each pass should contribute to overall compression
      const pass0Compression = result.pass0Result?.compressionRatio || 0

      // Overall compression should be at least as good as Pass 0
      expect(result.compressionRatio).toBeGreaterThanOrEqual(pass0Compression)

      console.log('Compression breakdown:')
      console.log(`Original: ${result.original}`)
      console.log(`Compressed: ${result.compressed}`)
      console.log(`Pass 0: ${pass0Compression}%`)
      console.log(`Overall: ${result.compressionRatio}%`)
    })
  })

  describe('Error Handling', () => {
    test('should handle empty input gracefully', async () => {
      const result = await engine.compress('')

      expect(result.original).toBe('')
      expect(result.compressed).toBe('')
      expect(result.compressionRatio).toBe(0)
      expect(result.rulesApplied).toHaveLength(0)
    })

    test('should handle whitespace-only input', async () => {
      const result = await engine.compress('   ')

      expect(result.original).toBe('   ')
      expect(result.compressionRatio).toBe(0)
    })
  })

  describe('Caching', () => {
    test('should cache compression results', async () => {
      const input = 'Can you help me with React?'

      // First compression
      const result1 = await engine.compress(input)
      expect(result1.fromCache).toBe(false)

      // Second compression should use cache
      const result2 = await engine.compress(input)
      expect(result2.fromCache).toBe(true)

      // Results should be identical
      expect(result1.compressed).toBe(result2.compressed)
      expect(result1.compressionRatio).toBe(result2.compressionRatio)
    })

    test('should generate unique cache keys for different inputs', async () => {
      const input1 = 'Can you help me?'
      const input2 = 'Could you assist me?'

      const result1 = await engine.compress(input1)
      const result2 = await engine.compress(input2)

      // Should be different results
      expect(result1.compressed).not.toBe(result2.compressed)
      expect(result1.fromCache).toBe(false)
      expect(result2.fromCache).toBe(false)
    })
  })

  describe('Session Tracking', () => {
    test('should include session ID in logging', async () => {
      const sessionId = 'test-session-123'
      const input = 'Please explain this concept'

      const result = await engine.compress(input, sessionId)

      // Should complete without error
      expect(result).toBeDefined()
      expect(result.processingTime).toBeGreaterThan(0)
    })
  })

  describe('Real-World Integration Examples', () => {
    test('comprehensive question compression', async () => {
      const input = 'Can you please help me understand how machine learning algorithms work in modern applications?'

      const result = await engine.compress(input)

      console.log('=== Comprehensive Compression Example ===')
      console.log(`Original (${result.original.length} chars): ${result.original}`)
      console.log(`Compressed (${result.compressed.length} chars): ${result.compressed}`)
      console.log(`Overall Ratio: ${result.compressionRatio}%`)
      console.log(`Pass 0 Removed: "${result.pass0Result?.prefixRemoved}"`)
      console.log(`Pass 0 Ratio: ${result.pass0Result?.compressionRatio}%`)
      console.log(`Rules Applied: ${result.rulesApplied.length}`)

      result.rulesApplied.forEach((rule, index) => {
        console.log(`  ${index + 1}. Pass ${rule.pass}: "${rule.originalText}" → "${rule.compressedForm}"`)
      })

      // Should achieve significant compression
      expect(result.compressionRatio).toBeGreaterThan(20)
      expect(result.rulesApplied.length).toBeGreaterThan(0)
    })

    test('mixed content compression', async () => {
      const input = 'Could you explain React hooks, TypeScript interfaces, and database optimization?'

      const result = await engine.compress(input)

      // Should handle technical terms appropriately
      expect(result.compressed).toContain('React') // Proper noun preserved
      expect(result.compressed).toContain('TypeScript') // Proper noun preserved

      // Should show compression benefits
      expect(result.compressionRatio).toBeGreaterThan(15)
    })
  })
})
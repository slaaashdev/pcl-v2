/**
 * Comprehensive Test Suite for Pass 0 Question Prefix Removal
 */

import { questionPrefixProcessor, QuestionPrefixProcessor } from './pass-zero'

describe('Pass 0 Question Prefix Removal', () => {
  let processor: QuestionPrefixProcessor

  beforeEach(() => {
    processor = new QuestionPrefixProcessor()
  })

  describe('High Priority Patterns', () => {
    test('should remove "can you please" prefix', () => {
      const result = processor.processText('Can you please explain React hooks?')

      expect(result.original).toBe('Can you please explain React hooks?')
      expect(result.processed).toBe('explain React hooks?')
      expect(result.prefixRemoved).toBe('Can you please')
      expect(result.compressionRatio).toBeGreaterThan(25)
      expect(result.questionMarkAdded).toBe(false) // Already has ?
    })

    test('should remove "could you please" prefix', () => {
      const result = processor.processText('Could you please help me understand TypeScript')

      expect(result.processed).toBe('help me understand TypeScript?')
      expect(result.prefixRemoved).toBe('Could you please')
      expect(result.questionMarkAdded).toBe(true) // Added ?
    })

    test('should remove "would you please" prefix', () => {
      const result = processor.processText('Would you please show me the database schema')

      expect(result.processed).toBe('show me the database schema?')
      expect(result.prefixRemoved).toBe('Would you please')
      expect(result.questionMarkAdded).toBe(true)
    })

    test('should remove "would it be possible to" prefix', () => {
      const result = processor.processText('Would it be possible to implement dark mode')

      expect(result.processed).toBe('implement dark mode?')
      expect(result.prefixRemoved).toBe('Would it be possible to')
      expect(result.compressionRatio).toBeGreaterThan(40)
    })

    test('should remove "is it possible to" prefix', () => {
      const result = processor.processText('Is it possible to optimize this query?')

      expect(result.processed).toBe('optimize this query?')
      expect(result.prefixRemoved).toBe('Is it possible to')
      expect(result.questionMarkAdded).toBe(false) // Already has ?
    })

    test('should remove "i would like you to" prefix', () => {
      const result = processor.processText('I would like you to create a new component')

      expect(result.processed).toBe('create a new component?')
      expect(result.prefixRemoved).toBe('I would like you to')
    })

    test('should remove "i need you to" prefix', () => {
      const result = processor.processText('I need you to fix this bug immediately')

      expect(result.processed).toBe('fix this bug immediately?')
      expect(result.prefixRemoved).toBe('I need you to')
    })
  })

  describe('Medium Priority Patterns', () => {
    test('should remove "can you" prefix', () => {
      const result = processor.processText('Can you explain how this works?')

      expect(result.processed).toBe('explain how this works?')
      expect(result.prefixRemoved).toBe('Can you')
      expect(result.compressionRatio).toBeGreaterThan(20)
    })

    test('should remove "could you" prefix', () => {
      const result = processor.processText('Could you help with authentication')

      expect(result.processed).toBe('help with authentication?')
      expect(result.prefixRemoved).toBe('Could you')
      expect(result.questionMarkAdded).toBe(true)
    })

    test('should remove "would you" prefix', () => {
      const result = processor.processText('Would you mind reviewing this code?')

      expect(result.processed).toBe('mind reviewing this code?')
      expect(result.prefixRemoved).toBe('Would you')
    })

    test('should remove "will you" prefix', () => {
      const result = processor.processText('Will you be able to deploy this today')

      expect(result.processed).toBe('be able to deploy this today?')
      expect(result.prefixRemoved).toBe('Will you')
      expect(result.questionMarkAdded).toBe(true)
    })
  })

  describe('Lower Priority Patterns', () => {
    test('should remove "please" prefix', () => {
      const result = processor.processText('Please explain the database structure')

      expect(result.processed).toBe('explain the database structure?')
      expect(result.prefixRemoved).toBe('Please')
      expect(result.questionMarkAdded).toBe(true)
    })

    test('should handle "please" with existing question mark', () => {
      const result = processor.processText('Please tell me how this works?')

      expect(result.processed).toBe('tell me how this works?')
      expect(result.prefixRemoved).toBe('Please')
      expect(result.questionMarkAdded).toBe(false)
    })
  })

  describe('Case Sensitivity and Normalization', () => {
    test('should handle mixed case prefixes', () => {
      const result = processor.processText('CAN YOU PLEASE explain this')

      expect(result.processed).toBe('explain this?')
      expect(result.prefixRemoved).toBe('CAN YOU PLEASE')
    })

    test('should preserve proper nouns', () => {
      const result = processor.processText('Can you please explain React hooks')

      expect(result.processed).toBe('explain React hooks?')
      // React should remain capitalized as it's a proper noun
      expect(result.processed).toContain('React')
    })

    test('should preserve acronyms', () => {
      const result = processor.processText('Could you help with API integration')

      expect(result.processed).toBe('help with API integration?')
      expect(result.processed).toContain('API')
    })

    test('should normalize common words', () => {
      const result = processor.processText('Can you please Explain this concept')

      expect(result.processed).toBe('explain this concept?')
      // "Explain" should become "explain"
      expect(result.processed.startsWith('explain')).toBe(true)
    })
  })

  describe('Question Mark Handling', () => {
    test('should add question mark when missing', () => {
      const result = processor.processText('Can you help me')

      expect(result.processed).toBe('help me?')
      expect(result.questionMarkAdded).toBe(true)
    })

    test('should not duplicate question marks', () => {
      const result = processor.processText('Can you help me?')

      expect(result.processed).toBe('help me?')
      expect(result.questionMarkAdded).toBe(false)
      expect(result.processed.match(/\\?/g)?.length).toBe(1)
    })

    test('should not add question mark to statements ending with period', () => {
      const result = processor.processText('Please implement this feature.')

      expect(result.processed).toBe('implement this feature.')
      expect(result.questionMarkAdded).toBe(false)
    })
  })

  describe('Edge Cases and Validation', () => {
    test('should handle empty strings', () => {
      const result = processor.processText('')

      expect(result.original).toBe('')
      expect(result.processed).toBe('')
      expect(result.prefixRemoved).toBe(null)
      expect(result.compressionRatio).toBe(0)
    })

    test('should handle whitespace-only strings', () => {
      const result = processor.processText('   ')

      expect(result.processed).toBe('')
      expect(result.prefixRemoved).toBe(null)
    })

    test('should handle text without prefixes', () => {
      const result = processor.processText('This is a regular statement.')

      expect(result.processed).toBe('This is a regular statement.')
      expect(result.prefixRemoved).toBe(null)
      expect(result.compressionRatio).toBe(0)
      expect(result.questionMarkAdded).toBe(false)
    })

    test('should handle very short text with prefix', () => {
      const result = processor.processText('Can you help?')

      expect(result.processed).toBe('help?')
      expect(result.prefixRemoved).toBe('Can you')
    })

    test('should handle prefix at beginning only', () => {
      const result = processor.processText('Explain how can you optimize this query')

      expect(result.processed).toBe('Explain how can you optimize this query')
      expect(result.prefixRemoved).toBe(null)
      // "can you" appears mid-sentence, should not be removed
    })
  })

  describe('Compression Ratios', () => {
    test('should calculate accurate compression ratios', () => {
      const testCases = [
        { input: 'Can you please explain this?', expectedRatio: 27 }, // 16 chars removed from 59
        { input: 'Could you help me?', expectedRatio: 44 }, // 10 chars removed from 18
        { input: 'Would it be possible to implement this feature', expectedMinRatio: 40 },
      ]

      testCases.forEach(({ input, expectedRatio, expectedMinRatio }) => {
        const result = processor.processText(input)
        if (expectedRatio) {
          expect(result.compressionRatio).toBeCloseTo(expectedRatio, -1) // Within 10%
        }
        if (expectedMinRatio) {
          expect(result.compressionRatio).toBeGreaterThan(expectedMinRatio)
        }
      })
    })
  })

  describe('Pattern Priority', () => {
    test('should prioritize longer patterns over shorter ones', () => {
      // "Can you please" should take priority over "Can you"
      const result = processor.processText('Can you please help me')

      expect(result.prefixRemoved).toBe('Can you please')
      // Should not be "Can you" with "please" left in the result
    })

    test('should match first applicable pattern', () => {
      // Should match the most specific pattern available
      const result = processor.processText('Could you please help me understand')

      expect(result.prefixRemoved).toBe('Could you please')
      expect(result.processed).toBe('help me understand?')
    })
  })

  describe('Utility Methods', () => {
    test('hasQuestionPrefix should detect prefixes correctly', () => {
      expect(processor.hasQuestionPrefix('Can you help?')).toBe(true)
      expect(processor.hasQuestionPrefix('Please assist me')).toBe(true)
      expect(processor.hasQuestionPrefix('This is a statement')).toBe(false)
    })

    test('getMatchingPrefix should return correct prefix', () => {
      expect(processor.getMatchingPrefix('Can you please explain?')).toBe('Can you please')
      expect(processor.getMatchingPrefix('Could you help?')).toBe('Could you')
      expect(processor.getMatchingPrefix('Regular text')).toBe(null)
    })

    test('getPatternStats should return pattern information', () => {
      const stats = processor.getPatternStats()
      expect(stats).toHaveLength(12) // 12 patterns total
      expect(stats[0]).toHaveProperty('name')
      expect(stats[0]).toHaveProperty('pattern')
      expect(stats[0]).toHaveProperty('priority')
    })
  })

  describe('Real-World Examples', () => {
    const realWorldCases = [
      {
        input: 'Can you please explain how React hooks work in detail?',
        expectedOutput: 'explain how React hooks work in detail?',
        expectedRatio: 27
      },
      {
        input: 'Could you help me understand TypeScript generics?',
        expectedOutput: 'help me understand TypeScript generics?',
        expectedRatio: 37
      },
      {
        input: 'Would it be possible to show me the database schema',
        expectedOutput: 'show me the database schema?',
        expectedRatio: 48
      },
      {
        input: 'I would like you to implement user authentication',
        expectedOutput: 'implement user authentication?',
        expectedRatio: 40
      },
      {
        input: 'Please create a new API endpoint for user profiles',
        expectedOutput: 'create a new API endpoint for user profiles?',
        expectedRatio: 13
      }
    ]

    realWorldCases.forEach(({ input, expectedOutput, expectedRatio }, index) => {
      test(`real-world case ${index + 1}: should process correctly`, () => {
        const result = processor.processText(input)

        expect(result.processed).toBe(expectedOutput)
        expect(result.compressionRatio).toBeCloseTo(expectedRatio, -1)
        expect(result.prefixRemoved).not.toBeNull()
      })
    })
  })

  describe('Integration with Three-Pass System', () => {
    test('should preserve semantic meaning for downstream passes', () => {
      const result = processor.processText('Can you please explain how machine learning algorithms work?')

      // Pass 0 result should still be semantically complete for Pass 1 & 2
      expect(result.processed).toBe('explain how machine learning algorithms work?')

      // Should still contain words that could be compressed in later passes
      expect(result.processed).toContain('machine learning')  // Could become "ML" in Pass 1
      expect(result.processed).toContain('algorithms')        // Could become "algo" in Pass 2
    })
  })
})
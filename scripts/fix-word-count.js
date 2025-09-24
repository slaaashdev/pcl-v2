#!/usr/bin/env node

/**
 * PCL Database Fix Script: Correct word_count fields
 *
 * This script fixes the word_count field in the compressions table
 * to match the actual number of words in each pattern.
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local file manually
const envPath = path.join(__dirname, '..', '.env.local')
let supabaseUrl, supabaseAnonKey

try {
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    const envLines = envContent.split('\n')

    for (const line of envLines) {
      const [key, value] = line.split('=')
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') {
        supabaseUrl = value
      } else if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
        supabaseAnonKey = value
      }
    }
  }
} catch (error) {
  console.log('Note: Could not read .env.local file, using environment variables')
}

// Fallback to process environment
supabaseUrl = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL
supabaseAnonKey = supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Calculate word count from text (JavaScript implementation)
 */
function calculateWordCount(text) {
  if (!text || typeof text !== 'string') return 0
  return text.trim().replace(/\s+/g, ' ').split(' ').length
}

/**
 * Execute the database fix
 */
async function fixWordCounts() {
  console.log('🚀 Starting PCL word count fix...\n')

  try {
    // Step 1: Get all patterns that need fixing
    console.log('📋 Step 1: Fetching all compression patterns...')
    const { data: patterns, error: fetchError } = await supabase
      .from('compressions')
      .select('original_text, word_count, pass_priority')
      .order('original_text')

    if (fetchError) {
      throw new Error(`Failed to fetch patterns: ${fetchError.message}`)
    }

    console.log(`   Found ${patterns.length} patterns to analyze`)

    // Step 2: Identify patterns with incorrect word counts
    console.log('\n🔍 Step 2: Analyzing word count accuracy...')
    const incorrectPatterns = []
    const correctPatterns = []

    for (const pattern of patterns) {
      const actualWordCount = calculateWordCount(pattern.original_text)
      const currentWordCount = pattern.word_count || 0

      if (actualWordCount !== currentWordCount) {
        incorrectPatterns.push({
          ...pattern,
          actualWordCount,
          currentWordCount
        })
      } else {
        correctPatterns.push(pattern)
      }
    }

    console.log(`   ✅ ${correctPatterns.length} patterns already correct`)
    console.log(`   ❌ ${incorrectPatterns.length} patterns need fixing`)

    if (incorrectPatterns.length === 0) {
      console.log('\n🎉 All patterns already have correct word counts!')
      return
    }

    // Step 3: Show examples of incorrect patterns
    console.log('\n📝 Examples of patterns that will be fixed:')
    incorrectPatterns.slice(0, 5).forEach(pattern => {
      console.log(`   "${pattern.original_text}" | Current: ${pattern.currentWordCount} → Correct: ${pattern.actualWordCount}`)
    })

    // Step 4: Update patterns with correct word counts
    console.log(`\n🔧 Step 3: Updating ${incorrectPatterns.length} patterns...`)

    let updatedCount = 0
    let errorCount = 0

    for (const pattern of incorrectPatterns) {
      try {
        const { error: updateError } = await supabase
          .from('compressions')
          .update({ word_count: pattern.actualWordCount })
          .eq('original_text', pattern.original_text)

        if (updateError) {
          console.error(`   ❌ Failed to update "${pattern.original_text}": ${updateError.message}`)
          errorCount++
        } else {
          updatedCount++
          if (updatedCount % 100 === 0) {
            console.log(`   📊 Updated ${updatedCount} patterns...`)
          }
        }
      } catch (error) {
        console.error(`   ❌ Error updating "${pattern.original_text}": ${error.message}`)
        errorCount++
      }
    }

    console.log(`   ✅ Successfully updated ${updatedCount} patterns`)
    if (errorCount > 0) {
      console.log(`   ❌ Failed to update ${errorCount} patterns`)
    }

    // Step 5: Verify specific important patterns
    console.log('\n🔍 Step 4: Verifying key phrase patterns...')
    const keyPhrases = ['by the way', 'for your information', 'as soon as possible']

    for (const phrase of keyPhrases) {
      const { data: pattern, error } = await supabase
        .from('compressions')
        .select('original_text, compressed_form, word_count')
        .eq('original_text', phrase)
        .single()

      if (error) {
        console.log(`   ⚠️  "${phrase}" not found in database`)
      } else {
        const expectedWordCount = calculateWordCount(phrase)
        const status = pattern.word_count === expectedWordCount ? '✅' : '❌'
        console.log(`   ${status} "${phrase}" → "${pattern.compressed_form}" | word_count: ${pattern.word_count}`)
      }
    }

    // Step 6: Show final statistics
    console.log('\n📊 Final Statistics:')
    const { data: finalStats } = await supabase
      .from('compressions')
      .select('word_count')

    const wordCountDistribution = {}
    finalStats.forEach(pattern => {
      const count = pattern.word_count || 0
      wordCountDistribution[count] = (wordCountDistribution[count] || 0) + 1
    })

    Object.entries(wordCountDistribution)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .forEach(([wordCount, patternCount]) => {
        console.log(`   ${wordCount} words: ${patternCount} patterns`)
      })

    console.log('\n🎉 Word count fix completed successfully!')
    console.log('\n💡 Next step: Clear compression cache and test "by the way" → "BTW"')

  } catch (error) {
    console.error('\n❌ Error during word count fix:', error.message)
    process.exit(1)
  }
}

// Run the fix
if (require.main === module) {
  fixWordCounts()
    .then(() => {
      console.log('\n✅ Script completed successfully')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n❌ Script failed:', error.message)
      process.exit(1)
    })
}

module.exports = { fixWordCounts, calculateWordCount }
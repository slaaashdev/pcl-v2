#!/usr/bin/env node

/**
 * PCL Pattern Fix Script: Add and correct compression patterns
 *
 * This script adds missing patterns and fixes invalid patterns
 * where original_text equals compressed_form.
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

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
 * Calculate word count from text
 */
function calculateWordCount(text) {
  if (!text || typeof text !== 'string') return 0
  return text.trim().replace(/\s+/g, ' ').split(' ').length
}

/**
 * Generate text hash for pattern
 */
function generateTextHash(text) {
  return crypto.createHash('md5').update(text.toLowerCase()).digest('hex')
}

/**
 * Essential compression patterns to add/fix
 */
const ESSENTIAL_PATTERNS = [
  // High-priority phrase patterns
  {
    original_text: 'by the way',
    compressed_form: 'BTW',
    pass_priority: 1,
    confidence_score: 0.95
  },
  {
    original_text: 'for your information',
    compressed_form: 'FYI',
    pass_priority: 1,
    confidence_score: 0.95
  },
  {
    original_text: 'as soon as possible',
    compressed_form: 'ASAP',
    pass_priority: 1,
    confidence_score: 0.95
  },
  {
    original_text: 'in my opinion',
    compressed_form: 'IMO',
    pass_priority: 1,
    confidence_score: 0.90
  },
  {
    original_text: 'to be honest',
    compressed_form: 'TBH',
    pass_priority: 1,
    confidence_score: 0.90
  },
  {
    original_text: 'laugh out loud',
    compressed_form: 'LOL',
    pass_priority: 1,
    confidence_score: 0.95
  },
  {
    original_text: 'oh my god',
    compressed_form: 'OMG',
    pass_priority: 1,
    confidence_score: 0.90
  },
  {
    original_text: 'what the hell',
    compressed_form: 'WTH',
    pass_priority: 1,
    confidence_score: 0.85
  },
  {
    original_text: 'talk to you later',
    compressed_form: 'TTYL',
    pass_priority: 1,
    confidence_score: 0.90
  },
  {
    original_text: 'be right back',
    compressed_form: 'BRB',
    pass_priority: 1,
    confidence_score: 0.95
  }
]

/**
 * Add or update a compression pattern
 */
async function upsertPattern(pattern) {
  const patternData = {
    original_text: pattern.original_text,
    compressed_form: pattern.compressed_form,
    text_hash: generateTextHash(pattern.original_text),
    compression_type: 'phrase',
    context: 'common_phrases',
    confidence_score: pattern.confidence_score,
    usage_count: 0,
    created_date: new Date().toISOString(),
    claude_model_used: 'manual_curation',
    token_count: null,
    rules_applied: [],
    compression_ratio: Math.round(((pattern.original_text.length - pattern.compressed_form.length) / pattern.original_text.length) * 100),
    updated_at: new Date().toISOString(),
    pass_priority: pattern.pass_priority,
    word_count: calculateWordCount(pattern.original_text),
    positive_feedback: 0,
    negative_feedback: 0,
    compression_rule: `${pattern.original_text} → ${pattern.compressed_form}`
  }

  const { data, error } = await supabase
    .from('compressions')
    .upsert(patternData, {
      onConflict: 'original_text',
      ignoreDuplicates: false
    })
    .select()

  if (error) {
    throw new Error(`Failed to upsert pattern "${pattern.original_text}": ${error.message}`)
  }

  return data
}

/**
 * Fix patterns with invalid compressed forms
 */
async function fixInvalidPatterns() {
  console.log('🔍 Searching for invalid patterns...')

  const { data: patterns, error } = await supabase
    .from('compressions')
    .select('original_text, compressed_form, confidence_score')
    .eq('pass_priority', 1) // Only check phrase patterns
    .order('original_text')

  if (error) {
    throw new Error(`Failed to fetch patterns: ${error.message}`)
  }

  console.log(`   Found ${patterns.length} phrase patterns to check`)

  const invalidPatterns = patterns.filter(pattern =>
    pattern.original_text.toLowerCase() === pattern.compressed_form.toLowerCase()
  )

  console.log(`   ❌ Found ${invalidPatterns.length} invalid patterns with identical original/compressed forms`)

  if (invalidPatterns.length > 0) {
    console.log('\n📝 Examples of invalid patterns:')
    invalidPatterns.slice(0, 5).forEach(pattern => {
      console.log(`   "${pattern.original_text}" → "${pattern.compressed_form}" (NO COMPRESSION)`)
    })
  }

  return invalidPatterns
}

/**
 * Main execution function
 */
async function fixPatterns() {
  console.log('🚀 Starting PCL pattern fix...\n')

  try {
    // Step 1: Check current pattern quality
    const invalidPatterns = await fixInvalidPatterns()

    // Step 2: Add essential compression patterns
    console.log('\n📥 Step 1: Adding essential compression patterns...')

    let addedCount = 0
    let updatedCount = 0
    let errorCount = 0

    for (const pattern of ESSENTIAL_PATTERNS) {
      try {
        // Check if pattern already exists
        const { data: existing } = await supabase
          .from('compressions')
          .select('original_text, compressed_form')
          .eq('original_text', pattern.original_text)
          .single()

        if (existing) {
          if (existing.compressed_form === existing.original_text ||
              existing.compressed_form === pattern.compressed_form) {
            // Update existing pattern
            await upsertPattern(pattern)
            console.log(`   ✅ Updated: "${pattern.original_text}" → "${pattern.compressed_form}"`)
            updatedCount++
          } else {
            console.log(`   ⚠️  Skipped: "${pattern.original_text}" (already has different compression)`)
          }
        } else {
          // Add new pattern
          await upsertPattern(pattern)
          console.log(`   ✅ Added: "${pattern.original_text}" → "${pattern.compressed_form}"`)
          addedCount++
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`   ❌ Error with "${pattern.original_text}": ${error.message}`)
        errorCount++
      }
    }

    console.log(`\n📊 Pattern Update Summary:`)
    console.log(`   ✅ Added: ${addedCount} new patterns`)
    console.log(`   🔄 Updated: ${updatedCount} existing patterns`)
    if (errorCount > 0) {
      console.log(`   ❌ Errors: ${errorCount} patterns failed`)
    }

    // Step 3: Verify key patterns
    console.log('\n🔍 Step 2: Verifying key patterns...')

    const keyPatterns = ['by the way', 'for your information', 'as soon as possible']

    for (const patternText of keyPatterns) {
      const { data: pattern, error } = await supabase
        .from('compressions')
        .select('original_text, compressed_form, word_count, pass_priority, confidence_score')
        .eq('original_text', patternText)
        .single()

      if (error) {
        console.log(`   ❌ "${patternText}" not found in database`)
      } else {
        const compressionRatio = Math.round(((pattern.original_text.length - pattern.compressed_form.length) / pattern.original_text.length) * 100)
        console.log(`   ✅ "${pattern.original_text}" → "${pattern.compressed_form}" (${compressionRatio}% compression, word_count: ${pattern.word_count})`)
      }
    }

    // Step 4: Final statistics
    console.log('\n📊 Final Database Statistics:')
    const { data: finalStats } = await supabase
      .from('compressions')
      .select('pass_priority')

    const pass1Count = finalStats.filter(p => p.pass_priority === 1).length
    const pass2Count = finalStats.filter(p => p.pass_priority === 2).length

    console.log(`   Pass 1 (Phrase) Patterns: ${pass1Count}`)
    console.log(`   Pass 2 (Word) Patterns: ${pass2Count}`)
    console.log(`   Total Patterns: ${finalStats.length}`)

    console.log('\n🎉 Pattern fix completed successfully!')
    console.log('\n💡 Next step: Clear compression cache and test "by the way" → "BTW"')

  } catch (error) {
    console.error('\n❌ Error during pattern fix:', error.message)
    process.exit(1)
  }
}

// Run the fix
if (require.main === module) {
  fixPatterns()
    .then(() => {
      console.log('\n✅ Script completed successfully')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n❌ Script failed:', error.message)
      process.exit(1)
    })
}

module.exports = { fixPatterns, ESSENTIAL_PATTERNS }
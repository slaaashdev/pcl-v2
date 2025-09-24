#!/usr/bin/env node

/**
 * Boost "by the way" pattern to ensure it gets loaded
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

supabaseUrl = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL
supabaseAnonKey = supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function boostBtwPattern() {
  console.log('🚀 Boosting "by the way" → "BTW" pattern for loading...')

  try {
    // First check current pattern
    const { data: current, error: fetchError } = await supabase
      .from('compressions')
      .select('*')
      .eq('original_text', 'by the way')
      .single()

    if (fetchError) {
      console.error('❌ Pattern not found:', fetchError.message)
      return
    }

    console.log('📋 Current pattern:')
    console.log(`   Text: "${current.original_text}" → "${current.compressed_form}"`)
    console.log(`   Confidence: ${current.confidence_score}`)
    console.log(`   Usage Count: ${current.usage_count}`)
    console.log(`   Pass Priority: ${current.pass_priority}`)

    // Update pattern to ensure it gets loaded
    const { data, error } = await supabase
      .from('compressions')
      .update({
        compressed_form: 'BTW',
        confidence_score: 0.95, // High confidence
        usage_count: 100, // High usage to get it in top results
        compression_ratio: 70,
        pass_priority: 1, // Ensure it's a phrase pattern
        updated_at: new Date().toISOString()
      })
      .eq('original_text', 'by the way')
      .select()

    if (error) {
      throw error
    }

    console.log('✅ Successfully boosted "by the way" → "BTW"')
    console.log('📋 Updated pattern:')
    console.log(`   Text: "${data[0].original_text}" → "${data[0].compressed_form}"`)
    console.log(`   Confidence: ${data[0].confidence_score}`)
    console.log(`   Usage Count: ${data[0].usage_count}`)
    console.log(`   Pass Priority: ${data[0].pass_priority}`)
    console.log(`   Word Count: ${data[0].word_count}`)

  } catch (error) {
    console.error('❌ Failed to boost pattern:', error.message)
  }
}

boostBtwPattern()
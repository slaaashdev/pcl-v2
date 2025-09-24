#!/usr/bin/env node

/**
 * Fix "by the way" pattern specifically
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

async function fixBtwPattern() {
  console.log('🔧 Fixing "by the way" → "BTW" pattern...')

  try {
    const { data, error } = await supabase
      .from('compressions')
      .update({
        compressed_form: 'BTW',
        compression_ratio: 70, // 70% compression
        updated_at: new Date().toISOString()
      })
      .eq('original_text', 'by the way')
      .select()

    if (error) {
      throw error
    }

    console.log('✅ Successfully updated "by the way" → "BTW"')
    console.log('Pattern details:', data[0])

  } catch (error) {
    console.error('❌ Failed to fix pattern:', error.message)
  }
}

fixBtwPattern()
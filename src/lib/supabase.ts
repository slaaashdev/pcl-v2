import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // We'll handle sessions manually if needed
  },
  realtime: {
    params: {
      eventsPerSecond: 2, // Optimize for our use case
    },
  },
})

// Database type definitions matching your actual Supabase table
export interface CompressionPattern {
  original_text: string           // PRIMARY KEY in your table
  compressed_form: string
  text_hash: string               // UNIQUE in your table
  compression_type: string
  context?: string
  confidence_score?: number
  usage_count: number             // DEFAULT 0 in your table
  created_date?: string           // Your table uses created_date, not created_at
  last_used_date?: string         // Your table uses last_used_date
  claude_model_used?: string
  token_count?: number
  rules_applied?: any
  compression_ratio?: number
  updated_at?: string
  // Added columns we need
  word_count?: number
  pass_priority?: number
  positive_feedback?: number
  negative_feedback?: number
  compression_rule?: string
}

export interface MissLogEntry {
  id: string
  word_phrase: string
  frequency: number
  miss_type: 'word' | 'phrase'
  token_count: number | null
  context_examples: string[] | null
  surrounding_words: string[] | null
  first_seen: string
  last_seen: string
  admin_reviewed: boolean
  review_notes: string | null
}

export interface UserFeedback {
  id: string
  satisfied: boolean
  original_text: string
  compressed_text: string
  rules_applied: string[] | null
  user_session: string | null
  compression_ratio: number | null
  processing_time_ms: number | null
  created_at: string
}

// Helper functions for database operations
export const db = {
  // Compression patterns
  async getPatternsByPriority(priority: number, minConfidence: number = 0.70) {
    console.log(`🔍 Querying compressions table for priority=${priority}, minConfidence=${minConfidence}`)

    const { data, error } = await supabase
      .from('compressions')
      .select('*')
      .eq('pass_priority', priority)
      .gte('confidence_score', minConfidence)
      .order('usage_count', { ascending: false })

    if (error) {
      console.error('❌ Database query error:', error)
      throw error
    }

    console.log(`✅ Found ${data?.length || 0} patterns for priority ${priority}:`, data?.slice(0, 3))
    return data as CompressionPattern[]
  },

  async getPatternByText(text: string) {
    const { data, error } = await supabase
      .from('compressions')
      .select('*')
      .eq('original_text', text)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data as CompressionPattern | null
  },

  async incrementUsage(patternText: string) {
    console.log(`🔄 Incrementing usage for: "${patternText}"`)
    const { error } = await supabase
      .rpc('increment_usage_count', { pattern_text: patternText })

    if (error) {
      console.error('❌ Failed to increment usage:', error)
      throw error
    }
  },

  // Miss tracking
  async logMiss(wordPhrase: string, type: 'word' | 'phrase', context: string[] = []) {
    const { data, error } = await supabase
      .from('miss_log')
      .upsert({
        word_phrase: wordPhrase,
        miss_type: type,
        token_count: wordPhrase.split(' ').length,
        context_examples: context,
        last_seen: new Date().toISOString(),
      }, {
        onConflict: 'word_phrase',
        ignoreDuplicates: false,
      })
      .select()

    if (error) throw error

    // Increment frequency if entry exists
    if (data && data.length > 0) {
      await supabase
        .rpc('increment_miss_frequency', { miss_id: data[0].id })
    }
  },

  async getTopMisses(limit: number = 50) {
    const { data, error } = await supabase
      .from('miss_log')
      .select('*')
      .eq('admin_reviewed', false)
      .order('frequency', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data as MissLogEntry[]
  },

  // User feedback
  async submitFeedback(feedback: Omit<UserFeedback, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('user_feedback')
      .insert(feedback)
      .select()
      .single()

    if (error) throw error
    return data as UserFeedback
  },

  async updateConfidence(patternId: string, satisfied: boolean) {
    const adjustment = satisfied ? 0.01 : -0.03
    const { error } = await supabase
      .rpc('update_confidence_score', {
        pattern_id: patternId,
        adjustment: adjustment
      })

    if (error) throw error
  },
}
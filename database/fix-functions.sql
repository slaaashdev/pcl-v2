-- Fix usage count function to work with pattern_text instead of pattern_id
-- Run this in Supabase SQL Editor to fix the function signature mismatch

-- Drop ALL existing increment_usage_count functions
DROP FUNCTION IF EXISTS increment_usage_count(UUID);
DROP FUNCTION IF EXISTS increment_usage_count(TEXT);

-- Create new function that accepts pattern_text (what the code is calling)
CREATE OR REPLACE FUNCTION increment_usage_count(pattern_text TEXT)
RETURNS void AS $$
BEGIN
    UPDATE compressions
    SET usage_count = usage_count + 1,
        last_used_date = NOW(),
        updated_at = NOW()
    WHERE original_text = pattern_text;
END;
$$ LANGUAGE plpgsql;

-- Create missing miss_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS miss_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word_phrase TEXT UNIQUE NOT NULL,
    frequency INTEGER DEFAULT 1,
    miss_type VARCHAR(10) NOT NULL CHECK (miss_type IN ('word', 'phrase')),
    token_count INTEGER,
    context_examples TEXT[],
    surrounding_words TEXT[],
    admin_reviewed BOOLEAN DEFAULT FALSE,
    review_notes TEXT,
    first_seen TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP DEFAULT NOW()
);

-- Create increment_miss_frequency function
CREATE OR REPLACE FUNCTION increment_miss_frequency(miss_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE miss_log
    SET frequency = frequency + 1,
        last_seen = NOW()
    WHERE id = miss_id;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policy for miss_log if needed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'miss_log'
        AND policyname = 'Allow all operations on miss_log'
    ) THEN
        ALTER TABLE miss_log ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Allow all operations on miss_log" ON miss_log FOR ALL USING (true);
    END IF;
END
$$;

-- Test the function
SELECT increment_usage_count('help');
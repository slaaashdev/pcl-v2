-- PCL Compression System Database Schema
-- Run this in your Supabase SQL Editor: https://bdmndrubjlxabmzboldm.supabase.co

-- ============================================================================
-- 1. COMPRESSIONS TABLE (Core compression patterns)
-- ============================================================================
CREATE TABLE IF NOT EXISTS compressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    text_hash VARCHAR(32) UNIQUE NOT NULL,           -- MD5 hash for deduplication

    -- Compression Data
    original_text TEXT NOT NULL,
    compressed_form TEXT NOT NULL,
    compression_rule VARCHAR(200),                    -- Human-readable rule (e.g., "you → u")

    -- Two-Pass Classification
    word_count INTEGER NOT NULL,                      -- 1=word, 2-5=phrase, >5=full-text
    pass_priority INTEGER DEFAULT 1,                  -- 1=phrase pass, 2=word pass
    compression_type VARCHAR(20) DEFAULT 'word',      -- word/phrase/full-text

    -- Confidence System (0.00-1.00)
    confidence_score DECIMAL(3,2) DEFAULT 0.70,       -- Start at 0.70
    positive_feedback INTEGER DEFAULT 0,              -- Count of 👍
    negative_feedback INTEGER DEFAULT 0,              -- Count of 👎

    -- Performance Tracking
    usage_count INTEGER DEFAULT 0,                    -- How often used
    compression_ratio DECIMAL(4,2),                   -- % reduction achieved

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 2. MISS_LOG TABLE (Track uncached patterns for manual review)
-- ============================================================================
CREATE TABLE IF NOT EXISTS miss_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Miss Data
    word_phrase TEXT UNIQUE NOT NULL,                 -- The missed text
    frequency INTEGER DEFAULT 1,                      -- Count of occurrences
    miss_type VARCHAR(10) NOT NULL CHECK (miss_type IN ('word', 'phrase')),
    token_count INTEGER,                              -- Number of tokens

    -- Context for Better Admin Decisions
    context_examples TEXT[],                          -- Array of usage examples
    surrounding_words TEXT[],                         -- Context clues

    -- Admin Review
    admin_reviewed BOOLEAN DEFAULT FALSE,
    review_notes TEXT,

    -- Tracking
    first_seen TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 3. USER_FEEDBACK TABLE (Track satisfaction for confidence adjustment)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Feedback Data
    satisfied BOOLEAN NOT NULL,                       -- true = 👍, false = 👎
    original_text TEXT NOT NULL,
    compressed_text TEXT NOT NULL,
    rules_applied TEXT[],                            -- Array of rule IDs used

    -- Session Context
    user_session VARCHAR(50),                        -- Anonymous session tracking
    compression_ratio DECIMAL(4,2),
    processing_time_ms INTEGER,

    -- Timestamp
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 4. PERFORMANCE INDEXES
-- ============================================================================

-- Compression pattern lookups (critical path)
CREATE INDEX IF NOT EXISTS idx_compressions_text_hash ON compressions(text_hash);
CREATE INDEX IF NOT EXISTS idx_compressions_original_text ON compressions USING hash(original_text);
CREATE INDEX IF NOT EXISTS idx_compressions_pass_priority ON compressions(pass_priority, confidence_score);
CREATE INDEX IF NOT EXISTS idx_compressions_word_count ON compressions(word_count, pass_priority);

-- Miss tracking queries
CREATE INDEX IF NOT EXISTS idx_miss_log_frequency ON miss_log(frequency DESC);
CREATE INDEX IF NOT EXISTS idx_miss_log_type_reviewed ON miss_log(miss_type, admin_reviewed);
CREATE INDEX IF NOT EXISTS idx_miss_log_last_seen ON miss_log(last_seen DESC);

-- Feedback analysis
CREATE INDEX IF NOT EXISTS idx_user_feedback_satisfied ON user_feedback(satisfied, created_at);
CREATE INDEX IF NOT EXISTS idx_user_feedback_rules ON user_feedback USING gin(rules_applied);

-- ============================================================================
-- 5. DATABASE FUNCTIONS (for atomic operations)
-- ============================================================================

-- Increment usage count atomically
CREATE OR REPLACE FUNCTION increment_usage_count(pattern_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE compressions
    SET usage_count = usage_count + 1,
        last_used_at = NOW(),
        updated_at = NOW()
    WHERE id = pattern_id;
END;
$$ LANGUAGE plpgsql;

-- Increment miss frequency atomically
CREATE OR REPLACE FUNCTION increment_miss_frequency(miss_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE miss_log
    SET frequency = frequency + 1,
        last_seen = NOW()
    WHERE id = miss_id;
END;
$$ LANGUAGE plpgsql;

-- Update confidence score with bounds checking
CREATE OR REPLACE FUNCTION update_confidence_score(pattern_id UUID, adjustment DECIMAL)
RETURNS void AS $$
BEGIN
    UPDATE compressions
    SET confidence_score = GREATEST(0.00, LEAST(1.00, confidence_score + adjustment)),
        updated_at = NOW()
    WHERE id = pattern_id;

    -- Update feedback counters
    IF adjustment > 0 THEN
        UPDATE compressions
        SET positive_feedback = positive_feedback + 1
        WHERE id = pattern_id;
    ELSE
        UPDATE compressions
        SET negative_feedback = negative_feedback + 1
        WHERE id = pattern_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) - Allow public access for MVP
-- ============================================================================
ALTER TABLE compressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE miss_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for development (tighten later if needed)
CREATE POLICY IF NOT EXISTS "Allow all operations on compressions" ON compressions FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all operations on miss_log" ON miss_log FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all operations on user_feedback" ON user_feedback FOR ALL USING (true);

-- ============================================================================
-- 7. ANALYTICS VIEWS (for admin dashboard)
-- ============================================================================

-- Top missed patterns for admin review
CREATE OR REPLACE VIEW top_misses AS
SELECT
    id,
    word_phrase,
    frequency,
    miss_type,
    token_count,
    first_seen,
    last_seen,
    admin_reviewed
FROM miss_log
WHERE admin_reviewed = false
ORDER BY frequency DESC, last_seen DESC
LIMIT 100;

-- Compression performance stats
CREATE OR REPLACE VIEW compression_stats AS
SELECT
    id,
    original_text,
    compressed_form,
    confidence_score,
    usage_count,
    positive_feedback,
    negative_feedback,
    CASE
        WHEN (positive_feedback + negative_feedback) > 0
        THEN ROUND((positive_feedback::decimal / (positive_feedback + negative_feedback)) * 100, 1)
        ELSE NULL
    END as satisfaction_rate,
    created_at,
    last_used_at
FROM compressions
ORDER BY usage_count DESC, confidence_score DESC;

-- System health metrics
CREATE OR REPLACE VIEW system_metrics AS
SELECT
    (SELECT COUNT(*) FROM compressions WHERE confidence_score >= 0.70) as active_patterns,
    (SELECT COUNT(*) FROM compressions WHERE confidence_score < 0.40) as low_confidence_patterns,
    (SELECT COUNT(*) FROM miss_log WHERE admin_reviewed = false) as pending_misses,
    (SELECT AVG(compression_ratio) FROM compressions WHERE compression_ratio IS NOT NULL) as avg_compression_ratio,
    (SELECT COUNT(*) FROM user_feedback WHERE satisfied = true) as positive_feedback_total,
    (SELECT COUNT(*) FROM user_feedback WHERE satisfied = false) as negative_feedback_total;

-- Grant access to views
GRANT SELECT ON top_misses TO anon;
GRANT SELECT ON compression_stats TO anon;
GRANT SELECT ON system_metrics TO anon;
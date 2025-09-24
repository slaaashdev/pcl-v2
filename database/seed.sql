-- PCL Compression System Seed Data
-- Run this after schema.sql to populate initial compression rules

-- ============================================================================
-- INITIAL COMPRESSION PATTERNS
-- ============================================================================

-- High-confidence word compressions (Pass 2)
INSERT INTO compressions (original_text, compressed_form, compression_rule, word_count, pass_priority, compression_type, confidence_score) VALUES
('you', 'u', 'you → u', 1, 2, 'word', 0.85),
('please', 'pls', 'please → pls', 1, 2, 'word', 0.90),
('document', 'doc', 'document → doc', 1, 2, 'word', 0.75),
('because', 'bc', 'because → bc', 1, 2, 'word', 0.80),
('something', 'smth', 'something → smth', 1, 2, 'word', 0.75),
('someone', 'sb', 'someone → sb', 1, 2, 'word', 0.70),
('everything', 'evrythng', 'everything → evrythng', 1, 2, 'word', 0.70),
('information', 'info', 'information → info', 1, 2, 'word', 0.85),
('application', 'app', 'application → app', 1, 2, 'word', 0.80),
('development', 'dev', 'development → dev', 1, 2, 'word', 0.80),
('technology', 'tech', 'technology → tech', 1, 2, 'word', 0.85),
('through', 'thru', 'through → thru', 1, 2, 'word', 0.75),
('without', 'w/o', 'without → w/o', 1, 2, 'word', 0.80),
('between', 'btwn', 'between → btwn', 1, 2, 'word', 0.70),
('understand', 'get', 'understand → get', 1, 2, 'word', 0.70);

-- Common phrase compressions (Pass 1 - higher priority)
INSERT INTO compressions (original_text, compressed_form, compression_rule, word_count, pass_priority, compression_type, confidence_score) VALUES
('can you', 'can u', 'can you → can u', 2, 1, 'phrase', 0.80),
('help me', 'help me', 'help me → help me', 2, 1, 'phrase', 0.90), -- Keep as-is, very clear
('thank you', 'thx', 'thank you → thx', 2, 1, 'phrase', 0.85),
('let me know', 'lmk', 'let me know → lmk', 3, 1, 'phrase', 0.75),
('as soon as possible', 'asap', 'as soon as possible → asap', 5, 1, 'phrase', 0.90),
('by the way', 'btw', 'by the way → btw', 3, 1, 'phrase', 0.80),
('for your information', 'fyi', 'for your information → fyi', 3, 1, 'phrase', 0.85),
('what do you think', 'wdyt', 'what do you think → wdyt', 4, 1, 'phrase', 0.70),
('in my opinion', 'imo', 'in my opinion → imo', 3, 1, 'phrase', 0.75),
('talk to you later', 'ttyl', 'talk to you later → ttyl', 4, 1, 'phrase', 0.80),
('see you later', 'cul8r', 'see you later → cul8r', 3, 1, 'phrase', 0.70),
('summarize this', 'sum this', 'summarize this → sum this', 2, 1, 'phrase', 0.75);

-- Update text_hash for all entries (MD5 of original_text)
UPDATE compressions SET text_hash = md5(original_text);

-- Set compression ratios based on actual savings
UPDATE compressions SET compression_ratio = ROUND(
    ((LENGTH(original_text) - LENGTH(compressed_form))::decimal / LENGTH(original_text)) * 100,
    2
);

-- ============================================================================
-- EXAMPLE MISS LOG ENTRIES (for testing admin dashboard)
-- ============================================================================

-- These will be automatically generated during use, but we can add some for testing
INSERT INTO miss_log (word_phrase, frequency, miss_type, token_count, context_examples) VALUES
('blockchain', 15, 'word', 1, ARRAY['explain blockchain technology', 'blockchain development is complex']),
('cryptocurrency', 12, 'word', 1, ARRAY['cryptocurrency market trends', 'investing in cryptocurrency']),
('kubernetes', 8, 'word', 1, ARRAY['kubernetes deployment guide', 'kubernetes vs docker']),
('machine learning', 10, 'phrase', 2, ARRAY['machine learning algorithms', 'explain machine learning']),
('artificial intelligence', 7, 'phrase', 2, ARRAY['artificial intelligence future', 'ai and artificial intelligence']),
('data science', 6, 'phrase', 2, ARRAY['data science career path', 'learn data science']);

-- ============================================================================
-- USAGE SIMULATION (for testing)
-- ============================================================================

-- Simulate some usage of patterns
UPDATE compressions SET usage_count = 150, positive_feedback = 140, negative_feedback = 10 WHERE original_text = 'you';
UPDATE compressions SET usage_count = 89, positive_feedback = 85, negative_feedback = 4 WHERE original_text = 'please';
UPDATE compressions SET usage_count = 67, positive_feedback = 60, negative_feedback = 7 WHERE original_text = 'document';
UPDATE compressions SET usage_count = 45, positive_feedback = 42, negative_feedback = 3 WHERE original_text = 'can you';
UPDATE compressions SET usage_count = 78, positive_feedback = 75, negative_feedback = 3 WHERE original_text = 'help me';
UPDATE compressions SET usage_count = 34, positive_feedback = 30, negative_feedback = 4 WHERE original_text = 'thank you';

-- Update confidence scores based on feedback (simulate the confidence adjustment)
UPDATE compressions SET confidence_score = GREATEST(0.00, LEAST(1.00,
    0.70 + (positive_feedback * 0.01) - (negative_feedback * 0.03)
));

-- ============================================================================
-- VERIFY SETUP
-- ============================================================================

-- Check that everything was inserted correctly
SELECT
    'Compressions Created' as metric,
    COUNT(*) as count,
    MIN(confidence_score) as min_confidence,
    MAX(confidence_score) as max_confidence,
    AVG(compression_ratio) as avg_ratio
FROM compressions
UNION ALL
SELECT
    'Miss Log Entries' as metric,
    COUNT(*) as count,
    NULL as min_confidence,
    NULL as max_confidence,
    AVG(frequency) as avg_ratio
FROM miss_log;

-- Show patterns by priority
SELECT
    pass_priority,
    compression_type,
    COUNT(*) as pattern_count,
    AVG(confidence_score) as avg_confidence
FROM compressions
GROUP BY pass_priority, compression_type
ORDER BY pass_priority, compression_type;
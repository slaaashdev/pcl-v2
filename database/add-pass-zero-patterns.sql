-- Add Pass 0 Question Prefix Patterns to Database
-- Run this in Supabase SQL Editor after fix-functions.sql

-- Insert Pass 0 question prefix patterns with pass_priority = 0
-- These patterns will be processed before phrase and word compression

INSERT INTO compressions (
  original_text,
  compressed_form,
  compression_ratio,
  confidence_score,
  usage_count,
  pass_priority,
  word_count,
  created_at,
  updated_at
) VALUES

-- High Priority Patterns (Most Specific)
('can you please', '?', 75, 0.95, 50, 0, 3, NOW(), NOW()),
('could you please', '?', 76, 0.95, 45, 0, 3, NOW(), NOW()),
('would you please', '?', 76, 0.95, 40, 0, 3, NOW(), NOW()),
('would it be possible to', '?', 83, 0.90, 30, 0, 5, NOW(), NOW()),
('is it possible to', '?', 78, 0.90, 25, 0, 4, NOW(), NOW()),
('i would like you to', '?', 80, 0.90, 35, 0, 5, NOW(), NOW()),
('i need you to', '?', 73, 0.90, 40, 0, 4, NOW(), NOW()),

-- Medium Priority Patterns (Shorter Variations)
('can you', '?', 62, 0.85, 100, 0, 2, NOW(), NOW()),
('could you', '?', 66, 0.85, 80, 0, 2, NOW(), NOW()),
('would you', '?', 66, 0.85, 70, 0, 2, NOW(), NOW()),
('will you', '?', 62, 0.85, 60, 0, 2, NOW(), NOW()),

-- Lower Priority Patterns (Simple)
('please', '?', 50, 0.75, 150, 0, 1, NOW(), NOW())

ON CONFLICT (original_text) DO UPDATE SET
  compressed_form = EXCLUDED.compressed_form,
  compression_ratio = EXCLUDED.compression_ratio,
  confidence_score = EXCLUDED.confidence_score,
  usage_count = EXCLUDED.usage_count,
  pass_priority = EXCLUDED.pass_priority,
  word_count = EXCLUDED.word_count,
  updated_at = NOW();

-- Verify the insertions
SELECT
  original_text,
  compressed_form,
  compression_ratio,
  confidence_score,
  usage_count,
  pass_priority,
  word_count
FROM compressions
WHERE pass_priority = 0
ORDER BY word_count DESC, usage_count DESC;

-- Update getPatternsByPriority function to handle pass_priority = 0
CREATE OR REPLACE FUNCTION get_patterns_by_priority(priority_level INTEGER, min_confidence DECIMAL DEFAULT 0.7)
RETURNS TABLE(
  id UUID,
  original_text TEXT,
  compressed_form TEXT,
  compression_ratio INTEGER,
  confidence_score DECIMAL,
  usage_count INTEGER,
  word_count INTEGER,
  pass_priority INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.original_text,
    c.compressed_form,
    c.compression_ratio,
    c.confidence_score,
    c.usage_count,
    c.word_count,
    c.pass_priority,
    c.created_at,
    c.updated_at
  FROM compressions c
  WHERE c.pass_priority = priority_level
    AND c.confidence_score >= min_confidence
  ORDER BY c.usage_count DESC, c.confidence_score DESC;
END;
$$ LANGUAGE plpgsql;

-- Test the function for Pass 0 patterns
SELECT * FROM get_patterns_by_priority(0, 0.7);
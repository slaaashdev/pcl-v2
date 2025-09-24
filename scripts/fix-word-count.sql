-- PCL Database Fix: Correct word_count fields for phrase patterns
-- This script fixes the word_count field to match actual word counts in patterns

-- Step 1: Create function to calculate word count from text
CREATE OR REPLACE FUNCTION calculate_word_count(text_input TEXT)
RETURNS INTEGER AS $$
BEGIN
  -- Remove extra spaces and count words separated by spaces
  RETURN array_length(
    string_to_array(
      trim(regexp_replace(text_input, '\s+', ' ', 'g')),
      ' '
    ),
    1
  );
END;
$$ LANGUAGE plpgsql;

-- Step 2: Update all existing patterns with correct word_count
UPDATE compressions
SET word_count = calculate_word_count(original_text);

-- Step 3: Create trigger to auto-calculate word_count for new inserts/updates
CREATE OR REPLACE FUNCTION auto_calculate_word_count()
RETURNS TRIGGER AS $$
BEGIN
  NEW.word_count = calculate_word_count(NEW.original_text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_auto_word_count ON compressions;
CREATE TRIGGER trigger_auto_word_count
  BEFORE INSERT OR UPDATE OF original_text ON compressions
  FOR EACH ROW EXECUTE FUNCTION auto_calculate_word_count();

-- Step 4: Verify fix by checking specific patterns
SELECT
  original_text,
  word_count,
  calculate_word_count(original_text) as calculated_count,
  CASE
    WHEN word_count = calculate_word_count(original_text) THEN '✅ CORRECT'
    ELSE '❌ MISMATCH'
  END as status
FROM compressions
WHERE original_text IN ('by the way', 'for your information', 'you', 'help', 'please')
ORDER BY original_text;

-- Step 5: Show summary of word count distribution
SELECT
  word_count,
  COUNT(*) as pattern_count,
  STRING_AGG(original_text, ', ' ORDER BY original_text LIMIT 3) as examples
FROM compressions
GROUP BY word_count
ORDER BY word_count;
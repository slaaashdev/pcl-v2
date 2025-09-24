# PCL Compressor - Three-Pass Text Compression System

A practical text compression system designed for AI prompts with manual curation, zero external API costs, and sophisticated three-pass processing including intelligent question prefix removal.

## 🚀 Quick Start

### 1. Database Setup (Supabase)

1. Go to your Supabase project: https://bdmndrubjlxabmzboldm.supabase.co
2. Navigate to SQL Editor
3. Run the database schema:

```sql
-- Copy and paste the contents of database/schema.sql
-- Then copy and paste the contents of database/seed.sql
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000 to see the compression interface.

## 🎯 Testing the System

### Test Examples

**Question Prefix Removal (Pass 0):**
Input: `"Can you please explain how React hooks work?"`
Expected Output: `"explain how React hooks work?"`

**Full Three-Pass Compression:**
Input: `"Can you help me summarize this document please"`
Expected Output: `"help me sum this doc pls?"`

This tests:
- ✅ **Pass 0**: Question prefix removal: "Can you please" → removed, "?" added
- ✅ **Pass 1**: Phrase compression: "summarize this" → "sum this"
- ✅ **Pass 2**: Word compression: "help" → "help", "document" → "doc", "please" → "pls"
- ✅ Exact spacing and punctuation preservation
- ✅ Performance under 300ms
- ✅ Smart miss tracking with intelligent filtering

### Admin Dashboard
Visit http://localhost:3000/admin to:
- Review missed patterns
- Add new compression rules manually
- Monitor system performance

## 🏗️ System Architecture

### Three-Pass Compression
1. **Pass 0 (Question Prefixes)**: Remove redundant question prefixes (25-50% compression)
   - "Can you please" → removed, "?" added
   - "Could you help me" → "help me?"
   - "Would it be possible to" → removed, "?" added

2. **Pass 1 (Phrases)**: Process 2-6 word patterns for context preservation
   - "machine learning" → "ML"
   - "by the way" → "BTW"
   - Sliding window: 6→5→4→3→2 words

3. **Pass 2 (Words)**: Process individual words to fill gaps
   - "explain" → "xpln"
   - "understand" → "undrst"
   - "document" → "doc"

4. **Assembly**: Reconstruct with exact spacing and punctuation preservation

### Pass 0: Question Prefix Intelligence

**Supported Prefixes** (12 patterns, case-insensitive):
- **High Priority**: "Can you please", "Could you please", "Would you please"
- **High Priority**: "Would it be possible to", "Is it possible to"
- **High Priority**: "I would like you to", "I need you to"
- **Medium Priority**: "Can you", "Could you", "Would you", "Will you"
- **Lower Priority**: "Please"

**Processing Logic**:
1. **Pattern Detection**: Identify question prefixes at text beginning
2. **Prefix Removal**: Strip matched prefix and normalize case
3. **Question Mark Addition**: Add "?" if missing and text was clearly a question
4. **Proper Noun Preservation**: Maintain capitalization for React, API, etc.

**Real-World Examples**:
```
"Can you please explain how React hooks work in detail?"
→ "explain how React hooks work in detail?" (27% compression)

"Could you help me understand TypeScript generics?"
→ "help me understand TypeScript generics?" (37% compression)

"Would it be possible to show me the database schema"
→ "show me the database schema?" (48% compression)
```

### Manual Curation Workflow
1. **Automatic Miss Detection**: All uncached patterns logged with frequency
2. **Admin Review**: Manual review of high-frequency misses
3. **Quality Control**: Human oversight prevents low-quality rules
4. **Confidence Scoring**: 0.00-1.00 scale with user feedback integration

### Performance Targets
- Cache hits: 5-15ms
- Pass 0 processing: 1-5ms
- Three-pass processing: 80-300ms
- Compression ratio: 40-65% (with Pass 0)
- User satisfaction: 85%+

## 📊 API Endpoints

### Main Compression
```
POST /api/unified-compress
{
  "text": "Can you help me summarize this document please",
  "sessionId": "optional_session_id"
}
```

### User Feedback
```
POST /api/feedback
{
  "satisfied": true,
  "originalText": "...",
  "compressedText": "...",
  "rulesApplied": [...]
}
```

### Admin Endpoints
```
GET /api/admin/miss-stats      # Miss statistics for dashboard
POST /api/admin/add-rule       # Create new compression rule
```

## 🗄️ Database Schema

### Core Tables
- **compressions**: Compression patterns with confidence scores
- **miss_log**: Uncached patterns for manual review
- **user_feedback**: Satisfaction tracking for confidence adjustment

### Key Features
- MD5 text hashing for deduplication
- Three-pass priority system (pass_priority: 0=prefix, 1=phrase, 2=word)
- Confidence scoring with feedback integration
- Automatic usage tracking and performance metrics

## 🔧 Configuration

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://bdmndrubjlxabmzboldm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Confidence Thresholds
- **Conservative**: ≥0.85 (high confidence only)
- **Default**: ≥0.70 (balanced mode)
- **Aggressive**: ≥0.40 (experimental)
- **Disabled**: <0.30 (auto-disabled)

## 📈 Monitoring & Analytics

### Performance Metrics
- Response time distribution (p50, p95, p99)
- Cache hit rates
- Compression ratios
- User satisfaction trends

### Quality Control
- Confidence score monitoring
- Rule effectiveness tracking
- Miss frequency analysis
- Automatic low-confidence rule detection

## 🛡️ Security & Constraints

### Zero-Cost Operation
- No external AI APIs (manual curation only)
- Supabase free tier (500MB database limit)
- Vercel free tier hosting
- Zero operational costs

### Data Protection
- Anonymous session tracking
- No personal data collection
- Row-level security enabled
- Automatic cache expiration

## 🚀 Deployment

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run type-check   # TypeScript validation
```

### Production
1. Deploy to Vercel (free tier)
2. Configure environment variables
3. Ensure Supabase connection
4. Run database migrations

## 📝 Contributing

### Code Quality Standards
- TypeScript strict mode
- ESLint configuration
- Automatic formatting
- Comprehensive error handling

### Manual Curation Guidelines
1. Review high-frequency misses first (10+ occurrences)
2. Set conservative confidence for new rules (0.70)
3. Monitor user feedback for rule adjustments
4. Disable rules with confidence <0.30

## 🎯 Success Criteria

### MVP Complete When
✅ Two-pass compression working (phrases before words)
✅ Miss tracking logging all uncached patterns
✅ Admin dashboard functional for manual rule creation
✅ Confidence system responding to user feedback
✅ Test case passing: "Can you help me..." → "Can u help me..."
✅ Performance targets met (cache <15ms, processing <250ms)
✅ Zero external API costs

### Key Performance Indicators
- 30-50% compression ratios
- 75%+ cache hit rates
- 80%+ user satisfaction
- 100% miss capture rate
- Zero operational costs
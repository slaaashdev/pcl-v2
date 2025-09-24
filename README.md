# PCL Compressor - Two-Pass Text Compression System

A practical text compression system designed for AI prompts with manual curation, zero external API costs, and sophisticated two-pass processing.

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

### Test Example
Input: `"Can you help me summarize this document please"`
Expected Output: `"Can u help me sum this doc pls"`

This tests:
- ✅ Phrase compression: "summarize this" → "sum this" (Pass 1)
- ✅ Word compression: "you" → "u", "document" → "doc", "please" → "pls" (Pass 2)
- ✅ Exact spacing preservation
- ✅ Performance under 250ms
- ✅ Miss tracking for uncached patterns

### Admin Dashboard
Visit http://localhost:3000/admin to:
- Review missed patterns
- Add new compression rules manually
- Monitor system performance

## 🏗️ System Architecture

### Two-Pass Compression
1. **Pass 1 (Phrases)**: Process 2-5 word patterns first for better context
2. **Pass 2 (Words)**: Process individual words to fill gaps
3. **Assembly**: Reconstruct with exact spacing preservation

### Manual Curation Workflow
1. **Automatic Miss Detection**: All uncached patterns logged with frequency
2. **Admin Review**: Manual review of high-frequency misses
3. **Quality Control**: Human oversight prevents low-quality rules
4. **Confidence Scoring**: 0.00-1.00 scale with user feedback integration

### Performance Targets
- Cache hits: 5-15ms
- Two-pass processing: 70-250ms
- Compression ratio: 30-50%
- User satisfaction: 80%+

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
- Two-pass priority system (pass_priority: 1=phrase, 2=word)
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
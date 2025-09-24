# Prompt Compression Language (PCL) - Product Requirements Document v4.0

## Executive Summary

The Prompt Compression Language (PCL) is a practical text compression system designed for AI prompts and natural language processing contexts. PCL uses a two-pass compression engine with manual curation and database-driven pattern matching to achieve 30-50% compression ratios while maintaining semantic integrity. The system operates on a $0 budget using Supabase free tier and manual quality control instead of expensive AI APIs.

## Product Vision & Goals

### Vision Statement
To become the industry standard for prompt optimization, enabling users to communicate more efficiently with AI systems while dramatically reducing computational costs and improving response times.

### Key Objectives
- Achieve 30-50% compression ratios through two-pass processing
- Maintain semantic integrity via manual curation and confidence scoring
- Provide 5-15ms cache hits, 70-250ms two-pass processing
- Support continuous improvement through miss tracking and admin dashboard
- Operate at zero cost using Supabase free tier and manual quality control

## Core Features & Capabilities

### Two-Pass Compression Engine
- **Unified API Gateway**: Single entry point `/api/unified-compress` for all compression requests
- **Pass 1 - Phrase Compression**: Identifies and compresses 2-5 word patterns first for better context preservation
- **Pass 2 - Word Compression**: Processes individual words to fill compression gaps
- **Full-Text Cache Check**: 5-15ms response for previously compressed texts
- **Manual Curation**: Zero automatic rule creation - all patterns manually reviewed and approved
- **Confidence Scoring**: 0.00-1.00 confidence system with user feedback integration

### Quality Assurance Standards

#### Miss Tracking & Improvement
- **Automatic Miss Logging**: Every uncached word/phrase logged with frequency and context
- **Admin Dashboard**: Manual review interface for adding new compression rules
- **Confidence Management**: Dynamic confidence adjustment based on user feedback (👍/👎)
- **Quality Control**: Human oversight prevents low-quality automatic compressions
- **Usage Analytics**: Track compression effectiveness and user satisfaction

#### Performance Monitoring
- **Cache Hit Rate**: Target 75%+ for optimal performance
- **Response Times**: 5-15ms cache hits, 70-250ms two-pass processing
- **User Satisfaction**: 80%+ positive feedback target
- **Miss Capture**: 100% logging rate for continuous improvement

### User Interface Components
- **Web Application**: Next.js interface for text compression with real-time feedback
- **Chrome Extension**: MV3 extension for quick compression from any text field
- **Admin Dashboard**: Manual curation interface for managing compression rules
- **Feedback System**: Simple 👍/👎 buttons for user satisfaction tracking
- **API Endpoints**: RESTful API for compression, feedback, and admin operations

## Technical Architecture

### System Overview
```
┌──────────────────────────────────────────────────────────┐
│                   USER ENTRY POINTS                       │
├──────────────────────────────────────────────────────────┤
│  • Web App (Next.js)                                      │
│  • Chrome Extension (MV3)                                 │
│  • API Direct Call                                        │
└─────────────────────┬────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│              UNIFIED API GATEWAY                          │
│           /api/unified-compress                           │
│         (Single entry point for all compression)          │
└─────────────────────┬────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│            TWO-PASS COMPRESSION ENGINE                    │
├──────────────────────────────────────────────────────────┤
│  1. Full-Text Cache Check (5-15ms if hit)                │
│  2. Pass 1: Phrase Compression (2-5 word patterns)       │
│  3. Pass 2: Word Compression (individual words)          │
│  4. Response Assembly with Metadata                       │
└──────────────────────────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
┌─────────────────────┐   ┌─────────────────────┐
│  SUPABASE DATABASE  │   │ DICTIONARY FALLBACK │
│  (Primary Source)   │   │  (Backup Only)      │
│  • compressions     │   │  • Static patterns  │
│  • miss_log         │   │  • Emergency cache  │
│  • user_feedback    │   │                     │
└─────────────────────┘   └─────────────────────┘
```

### File Structure
```
src/lib/
├─ Core Services
│   • unified-compression-service.ts (main orchestrator)
│   • database-compression-service.ts (DB operations)
│   • two-pass-compression-service.ts (two-pass logic)
│   • phrase-detector.ts (sliding window algorithm)
│   • supabase-client.ts (single connection instance)
│
├─ Supporting Services
│   • word-processor.ts (individual word handling)
│   • confidence-filter.ts (threshold management)
│   • miss-tracker.ts (tracking failed compressions)
│   • cache-manager.ts (hierarchical caching)
│
└─ Utilities
    • hash.ts (MD5 generation)
    • token-manager.ts (token state tracking)
    • performance-monitor.ts (metrics collection)

pages/api/
├─ Main Endpoints
│   • unified-compress.ts (primary compression API)
│   • feedback.ts (satisfaction tracking)
│   • miss-stats.ts (miss analytics)
│   • patterns.ts (pattern management)
│
└─ Admin Endpoints
    • bulk-import.ts
    • pattern-review.ts
    • analytics.ts
```

### API Endpoints

#### Core Compression APIs
- `POST /api/unified-compress` - Main compression endpoint (two-pass processing)
- `POST /api/feedback` - User satisfaction tracking (👍/👎)
- `GET /api/miss-stats` - Miss analytics for admin dashboard
- `GET /api/patterns` - Pattern management and CRUD operations

#### Admin Dashboard APIs
- `GET /api/admin/stats` - Miss statistics summary for dashboard
- `POST /api/admin/add-rule` - Create new compression rule
- `PUT /api/admin/update-confidence` - Modify rule confidence scores
- `POST /api/admin/bulk-import` - Import multiple compression rules
- `GET /api/admin/feedback-trends` - User satisfaction analytics

#### User Management APIs (Simplified)
- `POST /api/auth/register` - Basic user registration
- `POST /api/auth/login` - Simple authentication
- `GET /api/user/stats` - Personal compression statistics

### Supabase Database Schema

#### compressions/patterns table
```sql
-- Core compression rules and patterns
CREATE TABLE compressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text_hash VARCHAR(32) UNIQUE, -- MD5 of original text
  pattern_regex TEXT, -- Optional regex pattern

  -- Compression Data
  original_text TEXT NOT NULL,
  compressed_form TEXT NOT NULL,
  compression_rule VARCHAR(100), -- "X → Y" format

  -- Two-Pass Support
  word_count INTEGER NOT NULL, -- 1=word, 2-5=phrase, >5=full-text
  pass_priority INTEGER DEFAULT 1, -- 1=phrase pass, 2=word pass
  compression_type VARCHAR(20) DEFAULT 'word', -- word/phrase/full-text/dictionary

  -- Confidence System
  confidence_score DECIMAL(3,2) DEFAULT 0.70, -- 0.00-1.00
  positive_feedback INTEGER DEFAULT 0,
  negative_feedback INTEGER DEFAULT 0,

  -- Tracking
  usage_count INTEGER DEFAULT 0,
  created_date TIMESTAMP DEFAULT NOW(),
  last_used_date TIMESTAMP,
  compression_ratio DECIMAL(4,2) -- percentage saved
);
```

#### miss_log table
```sql
-- Track uncached words/phrases for admin review
CREATE TABLE miss_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Miss Tracking
  word_phrase TEXT UNIQUE NOT NULL, -- the missed text
  frequency INTEGER DEFAULT 1, -- count of occurrences
  miss_type VARCHAR(10) NOT NULL, -- 'word' or 'phrase'
  token_count INTEGER, -- 1-5 tokens typically

  -- Context
  phrase_context TEXT[], -- surrounding words for context
  first_seen TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW()
);
```

#### user_feedback table
```sql
-- Track user satisfaction for continuous improvement
CREATE TABLE user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Feedback Data
  satisfied BOOLEAN NOT NULL, -- true for 👍, false for 👎
  original_text TEXT NOT NULL,
  compressed_text TEXT NOT NULL,
  rules_applied TEXT[], -- array of compression rules used

  -- Metrics
  compression_ratio DECIMAL(4,2),
  processing_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  user_session VARCHAR(50) -- anonymous session tracking
);
```

#### Admin Dashboard Data Views
```sql
-- View for top missed words/phrases
CREATE VIEW top_misses AS
SELECT
  word_phrase,
  frequency,
  miss_type,
  token_count,
  first_seen,
  last_seen
FROM miss_log
ORDER BY frequency DESC
LIMIT 50;

-- View for compression performance
CREATE VIEW compression_stats AS
SELECT
  original_text,
  compressed_form,
  confidence_score,
  usage_count,
  positive_feedback,
  negative_feedback,
  (positive_feedback::float / NULLIF(positive_feedback + negative_feedback, 0)) as satisfaction_rate
FROM compressions
ORDER BY usage_count DESC;
```

## Manual Curation & Continuous Improvement

### Zero-Cost Intelligence Strategy
Instead of expensive AI APIs, PCL uses manual curation combined with user feedback to build an intelligent compression system. This creates a sustainable improvement cycle where:

1. **Automatic Miss Detection**: Every uncached word/phrase is logged
2. **Data-Driven Prioritization**: Frequency metrics guide admin attention
3. **Manual Quality Control**: Human oversight ensures compression quality
4. **User Feedback Integration**: 👍/👎 adjusts confidence scores
5. **Gradual System Learning**: Popular patterns get cached and improved

### Miss Tracking Workflow
```
User Input: "explain blockchain technology"
    ↓
PASS 1: Check Phrases
    • "explain blockchain" → NOT FOUND → Log miss
    • "blockchain technology" → NOT FOUND → Log miss
    ↓
PASS 2: Check Words
    • "explain" → NOT FOUND → Log miss
    • "blockchain" → NOT FOUND → Log miss ⚠️
    • "technology" → "tech" ✓
    ↓
MISS_LOG TABLE (Accumulating)
    • blockchain: frequency = 47 occurrences 🔥
    ↓
ADMIN DASHBOARD (Manual Review)
    • Admin sees: "blockchain - 47 occurrences"
    • Admin decides: Add "blockchain → BC"
    • System caches: blockchain → BC (confidence: 0.70)
```

### Confidence Scoring System
- **Range**: 0.00 - 1.00 (decimal precision)
- **Initial Score**: 0.70 for manually added rules
- **Feedback Impact**: 👍 +0.01, 👎 -0.03
- **Thresholds**:
  - 0.85+ = Conservative Mode (high confidence only)
  - 0.70+ = Balanced Mode (default)
  - 0.40+ = Aggressive Mode (more experimental)
  - <0.30 = Auto-disabled

### Human-in-the-Loop Quality Control
- **No Automatic Rule Creation**: Prevents low-quality compressions
- **Frequency-Based Prioritization**: Focus on high-impact patterns first
- **Context Preservation**: Admin sees usage examples before deciding
- **Gradual Validation**: Confidence scores prove patterns over time

## Admin Dashboard & Management Interface

### Critical Missing Component
**Current Status**: The admin dashboard does not exist yet and is the primary blocker for the manual curation workflow.

### Dashboard Requirements

#### Priority 1: Miss Statistics View (BUILD FIRST)
```
URL: /admin/misses
Features:
  • Top 20 missed words with frequency counts
  • Top 20 missed phrases with usage context
  • "Add Compression Rule" button for each miss
  • Context snippets showing how words/phrases are used
  • Sorting by frequency, recency, token count
```

#### Priority 2: Pattern Manager (BUILD SECOND)
```
URL: /admin/patterns
Features:
  • List all existing compression rules
  • Edit confidence scores (0.00-1.00)
  • Enable/disable individual rules
  • Bulk import functionality
  • Rule performance metrics (usage, satisfaction)
```

#### Priority 3: Feedback Monitor (BUILD THIRD)
```
URL: /admin/feedback
Features:
  • Recent user satisfaction data (👍/👎)
  • Rules trending down in confidence
  • Overall system satisfaction metrics
  • User feedback analytics and trends
```

### Implementation Options

#### Option 1: Quick MVP (1-2 hours)
- Single `/admin-temp.tsx` page
- Basic HTML tables with action buttons
- Direct database queries
- Simple password protection

#### Option 2: Dedicated Admin Routes (Recommended)
```
/admin/dashboard  → Main overview
/admin/misses     → Miss statistics & rule creation
/admin/patterns   → Compression rule management
/admin/feedback   → User satisfaction monitoring
```

#### Option 3: Separate Admin App
- Complete Next.js deployment
- Professional admin interface
- Advanced authentication

### Dashboard Components
```
components/
├─ User Interface
│   • FeedbackWidget.tsx (👍/👎 buttons)
│   • CompressionSettings.tsx (mode selector)
│   • CompressionDisplay.tsx (results view)
│
└─ Admin Interface
    • MissStatsDashboard.tsx
    • PatternManager.tsx
    • AnalyticsDashboard.tsx
```

## Performance & System Constraints

### $0 Budget Operation
- **No External APIs**: No Claude, OpenAI, or other paid AI services
- **Supabase Free Tier**: All data storage within free limits
- **Manual Curation**: Human intelligence replaces expensive AI
- **Static Hosting**: Next.js deployment on free platforms

### Performance Targets
- **Cache Hits**: 5-15ms response time
- **Two-Pass Processing**: 70-250ms total
  - Pass 1 (phrases): +20-50ms
  - Pass 2 (words): +30-100ms
  - Assembly: +20ms
- **Cache Hit Rate**: 75%+ target (85%+ with mature system)
- **User Satisfaction**: 80%+ positive feedback

### System Efficiency
- **Compression Ratio**: 30-50% text reduction (realistic target)
- **Miss Capture Rate**: 100% (all uncached patterns logged)
- **Database Performance**: Optimized queries with proper indexing
- **Admin Response**: Real-time dashboard updates

## Quality Assurance & Metrics

### Core Functionality Requirements
**These must work 100% before launch:**
1. **Two-Pass Compression**: Phrases processed before words for better context
2. **Miss Tracking**: All uncached patterns automatically logged with frequency
3. **Admin Dashboard**: Functional interface for manual rule creation
4. **Confidence System**: Dynamic scoring based on user feedback
5. **Cache Integration**: New rules immediately available for compression

### Testing Workflow
```
EXAMPLE TEST CASE:
Input: "Can you help me summarize this document please"

Pass 1 - Phrase Check:
  • "Can you help" → "Can u help" ✓ (confidence: 0.80)
  • "help me summarize" → NOT FOUND → Log miss
  • "summarize this document" → NOT FOUND → Log miss
  • "document please" → NOT FOUND → Log miss

Pass 2 - Word Check:
  • "Can" → Keep (already processed)
  • "u" → Keep (already processed)
  • "help" → Keep (already processed)
  • "me" → Keep (confidence: 0.85)
  • "summarize" → "sum" (confidence: 0.75)
  • "this" → Keep (confidence: 0.90)
  • "document" → "doc" (confidence: 0.75)
  • "please" → "pls" (confidence: 0.90)

Result: "Can u help me sum this doc pls"
Misses Logged: 3 phrases for admin review
```

## Success Metrics & KPIs

### MVP Success Criteria
**These must work before system is functional:**
1. **Admin Dashboard**: Interface to view miss statistics and add compression rules
2. **Two-Pass Engine**: Phrase compression prioritized over word compression
3. **Miss Tracking**: Automatic logging of all uncached words/phrases with frequency
4. **Confidence System**: User feedback (👍/👎) adjusts rule confidence scores
5. **Manual Curation**: Admin can add rules, system caches them for future use

### Acceptance Testing Checklist
```
CRITICAL PATH VALIDATION:
□ User can input text and receive compressed output
□ System shows compression metrics (ratio, processing time)
□ Cache hits return results in 5-15ms
□ Two-pass processing completes in 70-250ms
□ Uncached words/phrases are logged to miss_log table
□ Admin dashboard displays top missed patterns
□ Admin can add new compression rules via interface
□ New rules are immediately available for compression
□ User feedback (👍/👎) updates confidence scores
□ Low-confidence rules are highlighted for admin review
□ Database queries perform within acceptable limits
□ System handles concurrent users without degradation
```

### Primary Metrics
- **Compression Ratio**: Target 30-50% average
- **Cache Hit Rate**: Target 75%+ (85%+ mature system)
- **User Satisfaction**: Target 80%+ positive feedback
- **Miss Capture**: 100% logging rate
- **Admin Efficiency**: Time from miss to rule creation

### Secondary Metrics
- **Response Time Distribution**: p50, p95, p99 latency
- **Rule Effectiveness**: Usage count and satisfaction per rule
- **System Growth**: Miss log → admin review → rule creation cycle
- **Quality Trends**: Confidence score changes over time

## Implementation Roadmap

### Phase 1 (Week 1-2): Critical Infrastructure
**Priority: Unblock Manual Curation Workflow**
- Build admin dashboard (miss statistics, pattern management)
- Implement two-pass compression engine
- Set up miss tracking and logging
- Create confidence scoring system
- **Milestone**: Admin can review misses and add rules

### Phase 2 (Week 3-4): System Optimization
**Priority: Improve Performance and User Experience**
- Optimize cache hit rates and response times
- Implement user feedback system (👍/👎)
- Build analytics and monitoring
- Polish web application interface
- **Milestone**: 75%+ cache hit rate, <250ms processing

### Phase 3 (Month 2): Quality & Scale
**Priority: Enhance Manual Curation Efficiency**
- Advanced admin dashboard features
- Bulk import and management tools
- Pattern performance analytics
- User satisfaction tracking
- **Milestone**: 80%+ user satisfaction, efficient admin workflow

### Phase 4 (Month 3+): Growth & Enhancement
**Priority: Scale Through Manual Curation**
- Chrome extension optimization
- API stability and documentation
- Advanced pattern discovery tools
- System scaling and performance tuning
- **Milestone**: Sustainable growth through quality compression

## Risk Mitigation

### Technical Risks
- **Admin Dashboard Blocking Workflow**: Build MVP dashboard immediately as highest priority
- **Cache Performance**: Monitor hit rates and optimize database queries
- **Manual Curation Bottleneck**: Prioritize high-frequency misses for maximum impact
- **Database Limits**: Monitor Supabase usage and optimize for free tier constraints

### Quality Risks
- **Poor Compression Rules**: Manual oversight prevents automatic rule creation
- **Low User Satisfaction**: Real-time feedback system enables quick rule adjustments
- **Confidence Score Drift**: Regular admin review of trending scores
- **Context Loss**: Phrase-first processing preserves meaning better than word-only

### Operational Risks
- **Admin Workload**: Focus on highest-impact patterns first (frequency-based priority)
- **System Scaling**: Design for incremental growth through manual curation
- **Zero Budget Constraint**: All features must work within free tier limitations

---

**Document Version**: 4.0
**Status**: Implementation-Ready PRD with Manual Curation System
**Critical Path**: Build admin dashboard to enable manual curation workflow
**Next Steps**: Implement Phase 1 - Admin Dashboard and Two-Pass Compression Engine
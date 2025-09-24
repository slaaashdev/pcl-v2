# 🚀 PCL Compressor Setup Guide

## Step 1: Database Setup (Required First!)

### 1.1 Open Supabase SQL Editor
1. Go to: https://bdmndrubjlxabmzboldm.supabase.co
2. Navigate to: **SQL Editor** (left sidebar)
3. Click: **New Query**

### 1.2 Create Database Schema
Copy and paste the entire contents of `database/schema.sql` and click **RUN**

This will create:
- ✅ compressions table (compression patterns)
- ✅ miss_log table (uncached patterns)
- ✅ user_feedback table (satisfaction tracking)
- ✅ Database functions for atomic operations
- ✅ Performance indexes
- ✅ Row Level Security policies

### 1.3 Seed Initial Data
Copy and paste the entire contents of `database/seed.sql` and click **RUN**

This will populate:
- ✅ 15 word compression patterns
- ✅ 12 phrase compression patterns
- ✅ Example miss log entries
- ✅ Simulated usage statistics

## Step 2: Install Dependencies

```bash
npm install
```

This installs:
- Next.js 14 with TypeScript
- Supabase client
- React Query for state management
- Tailwind CSS for styling
- All required dependencies

## Step 3: Environment Verification

Verify your `.env.local` file contains:
```env
NEXT_PUBLIC_SUPABASE_URL=https://bdmndrubjlxabmzboldm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbW5kcnViamx4YWJtemJvbGRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxODMyMTAsImV4cCI6MjA3Mzc1OTIxMH0.Iv92EefBcsOkOcLOVhYL2jpX7QwFmQw_yBMfnr4UPh8
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 4: Start Development Server

```bash
npm run dev
```

The server will start at: http://localhost:3000

## Step 5: Test the System

### 5.1 Test Main Compression Interface
1. Go to: http://localhost:3000
2. Enter test text: `"Can you help me summarize this document please"`
3. Click **Compress**
4. Expected result: `"Can u help me sum this doc pls"`

### 5.2 Verify Two-Pass Processing
Check the compression details:
- ✅ Pass 1 should show phrase compressions
- ✅ Pass 2 should show word compressions
- ✅ Processing time should be under 250ms
- ✅ Compression ratio should be 30-50%

### 5.3 Test User Feedback
1. After compression, click 👍 (Satisfied) or 👎 (Not Satisfied)
2. Verify feedback is recorded
3. Check that confidence scores adjust accordingly

### 5.4 Test Admin Dashboard
1. Go to: http://localhost:3000/admin
2. Click **Miss Statistics** tab
3. Verify you see:
   - ✅ Top missed words with frequencies
   - ✅ Top missed phrases with frequencies
   - ✅ "Add Rule" buttons functional
4. Test adding a new compression rule

## Step 6: Verify Database Connection

### 6.1 Check Supabase Connection
In the browser console (F12), you should see:
```
Loaded X phrase patterns, Y word patterns
```

### 6.2 Check Miss Tracking
1. Enter text with unknown words: `"blockchain cryptocurrency metaverse"`
2. Compress it
3. Go to admin dashboard
4. Verify new misses appear in the statistics

## Step 7: Performance Verification

### 7.1 Response Time Testing
- ✅ First compression: 70-250ms (two-pass processing)
- ✅ Cached compression: 5-15ms (cache hit)
- ✅ API responses: All under 1 second

### 7.2 Compression Quality
Test various inputs:
- ✅ Simple words: "you please document" → "u pls doc"
- ✅ Phrases: "can you help me" → "can u help me"
- ✅ Mixed content: Preserves punctuation and spacing exactly

## 🚨 Troubleshooting

### Database Connection Issues
```bash
# Check if Supabase URL is accessible
curl https://bdmndrubjlxabmzboldm.supabase.co

# Verify environment variables are loaded
echo $NEXT_PUBLIC_SUPABASE_URL
```

### Missing Dependencies
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors
```bash
# Run type checking
npm run type-check

# Build to verify everything compiles
npm run build
```

### Database Schema Issues
1. Go to Supabase SQL Editor
2. Check if tables exist:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';
```
3. If missing, re-run schema.sql

## ✅ Success Checklist

After setup, verify:
- [ ] Database tables created and seeded
- [ ] Development server running at localhost:3000
- [ ] Test compression working: "Can you help me..." → "Can u help me..."
- [ ] Admin dashboard accessible at localhost:3000/admin
- [ ] Miss tracking logging new patterns
- [ ] User feedback system functional
- [ ] Performance targets met (processing <250ms)
- [ ] No console errors in browser
- [ ] Supabase connection established

## 🎯 Next Steps

1. **Test thoroughly** with various text inputs
2. **Add compression rules** through admin dashboard
3. **Monitor performance** and user satisfaction
4. **Scale gradually** through manual curation
5. **Deploy to production** when ready (Vercel + Supabase)
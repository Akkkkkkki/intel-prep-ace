-- Migration: Comprehensive Database Schema Optimization
-- This migration removes unused tables, consolidates redundant ones, and simplifies the schema

-- ==============================================
-- PHASE 1: REMOVE CONFIRMED UNUSED TABLES
-- ==============================================

-- Drop unused logging and analytics tables
DROP TABLE IF EXISTS public.api_call_logs CASCADE;
DROP TABLE IF EXISTS public.search_content_usage CASCADE;
DROP TABLE IF EXISTS public.query_performance_log CASCADE;
DROP TABLE IF EXISTS public.scraping_metrics CASCADE;
DROP TABLE IF EXISTS public.research_cache CASCADE;

-- Drop redundant experience tables (keeping the original interview_experiences if needed)
DROP TABLE IF EXISTS public.native_interview_experiences CASCADE;

-- Drop unused functions that reference dropped tables
DROP FUNCTION IF EXISTS public.find_reusable_urls_fast_v2(text, text, text, integer, numeric);
DROP FUNCTION IF EXISTS public.get_cached_content_simple_v2(text[]);
DROP FUNCTION IF EXISTS public.update_scraping_metrics_on_experience();
DROP FUNCTION IF EXISTS public.get_hybrid_search_results(uuid);
DROP FUNCTION IF EXISTS public.get_platform_scraping_stats(integer);
DROP FUNCTION IF EXISTS public.find_similar_experiences(text, text, text, float);

-- Drop unused triggers (check if table exists first)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'native_interview_experiences') THEN
        DROP TRIGGER IF EXISTS update_metrics_on_native_experience ON public.native_interview_experiences;
    END IF;
END $$;

-- ==============================================
-- PHASE 2: CONSOLIDATE SCRAPED_URLS + SCRAPED_CONTENT
-- ==============================================

-- Add content columns from scraped_content to scraped_urls
ALTER TABLE public.scraped_urls 
ADD COLUMN IF NOT EXISTS full_content TEXT,
ADD COLUMN IF NOT EXISTS raw_html TEXT,
ADD COLUMN IF NOT EXISTS structured_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS extracted_questions TEXT[],
ADD COLUMN IF NOT EXISTS extracted_insights TEXT[],
ADD COLUMN IF NOT EXISTS word_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS content_source TEXT,
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'raw' CHECK (processing_status IN ('raw', 'processed', 'analyzed', 'failed')),
ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- Migrate existing data from scraped_content to scraped_urls if the table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'scraped_content') THEN
        UPDATE public.scraped_urls su
        SET 
            full_content = sc.full_content,
            raw_html = sc.raw_html,
            structured_data = COALESCE(sc.structured_data, '{}'::jsonb),
            extracted_questions = sc.extracted_questions,
            extracted_insights = sc.extracted_insights,
            word_count = COALESCE(sc.word_count, 0),
            language = COALESCE(sc.language, 'en'),
            content_source = sc.content_source,
            processing_status = COALESCE(sc.processing_status, 'raw'),
            ai_summary = sc.ai_summary
        FROM public.scraped_content sc
        WHERE su.id = sc.scraped_url_id;
    END IF;
END $$;

-- Drop the now redundant scraped_content table
DROP TABLE IF EXISTS public.scraped_content CASCADE;

-- ==============================================
-- PHASE 3: FIX TAVILY_SEARCHES CONFLICTS
-- ==============================================

-- Ensure tavily_searches table exists with simplified structure
CREATE TABLE IF NOT EXISTS public.tavily_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID REFERENCES public.searches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- API call details
  api_type TEXT NOT NULL CHECK (api_type IN ('search', 'extract')),
  query_text TEXT NOT NULL,
  
  -- Response data
  response_payload JSONB,
  response_status INTEGER NOT NULL,
  results_count INTEGER DEFAULT 0,
  
  -- Performance and cost
  request_duration_ms INTEGER,
  credits_used INTEGER DEFAULT 1,
  
  -- Error handling
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Clean up broken foreign key references in scraped_urls
ALTER TABLE public.scraped_urls DROP COLUMN IF EXISTS tavily_search_id;

-- Update scraped_urls structure for better consistency
ALTER TABLE public.scraped_urls 
DROP CONSTRAINT IF EXISTS unique_url_per_company_role,
ADD CONSTRAINT unique_url_hash_company UNIQUE(url_hash, company_name);

-- ==============================================
-- PHASE 4: SIMPLIFY RLS POLICIES
-- ==============================================

-- Recreate simplified RLS policies for tavily_searches
ALTER TABLE public.tavily_searches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own Tavily searches" ON public.tavily_searches;
DROP POLICY IF EXISTS "Service role can insert Tavily searches" ON public.tavily_searches;

CREATE POLICY "Users can view their own Tavily searches" 
  ON public.tavily_searches 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage Tavily searches" 
  ON public.tavily_searches 
  FOR ALL 
  USING (auth.uid() IS NULL);

-- Simplify scraped_urls RLS policies (remove the complex ones causing timeouts)
DROP POLICY IF EXISTS "Users can view scraped URLs through their searches" ON public.scraped_urls;
DROP POLICY IF EXISTS "Users can view scraped URLs" ON public.scraped_urls;
DROP POLICY IF EXISTS "Service role can manage scraped URLs" ON public.scraped_urls;
DROP POLICY IF EXISTS "Authenticated users can view scraped URLs" ON public.scraped_urls;

CREATE POLICY "Service role can manage scraped URLs" 
  ON public.scraped_urls 
  FOR ALL 
  USING (auth.uid() IS NULL);

-- Add simple read policy for scraped URLs (authenticated users can read)
CREATE POLICY "Authenticated users can view scraped URLs" 
  ON public.scraped_urls 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- ==============================================
-- PHASE 5: CLEAN UP UNUSED FUNCTIONS
-- ==============================================

-- Remove complex functions that reference dropped tables
DROP FUNCTION IF EXISTS public.generate_cache_key(text, text, text);
DROP FUNCTION IF EXISTS public.find_reusable_urls(text, text, text, integer, float);
DROP FUNCTION IF EXISTS public.get_cached_research(text, text, text, integer);
DROP FUNCTION IF EXISTS public.increment_url_reuse(uuid);
DROP FUNCTION IF EXISTS public.increment_cache_access(uuid);
DROP FUNCTION IF EXISTS public.get_excluded_domains_for_search(text, text, text, integer);
DROP FUNCTION IF EXISTS public.cleanup_old_cache_data(integer);

-- Keep only essential functions and create simplified versions
CREATE OR REPLACE FUNCTION public.find_reusable_urls_simple(
  p_company_name TEXT,
  p_role_title TEXT DEFAULT NULL,
  p_max_age_days INTEGER DEFAULT 30,
  p_min_quality_score FLOAT DEFAULT 0.3
)
RETURNS TABLE(
  id UUID,
  url TEXT,
  title TEXT,
  content_quality_score FLOAT,
  ai_summary TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    su.id,
    su.url,
    su.title,
    su.content_quality_score,
    su.ai_summary
  FROM public.scraped_urls su
  WHERE 
    su.company_name ILIKE p_company_name
    AND (p_role_title IS NULL OR su.role_title ILIKE '%' || p_role_title || '%')
    AND su.content_quality_score >= p_min_quality_score
    AND su.first_scraped_at > (NOW() - (p_max_age_days || ' days')::INTERVAL)
  ORDER BY 
    su.content_quality_score DESC,
    su.times_reused DESC NULLS LAST
  LIMIT 20;
END;
$$;

-- Function to increment URL reuse counter atomically
CREATE OR REPLACE FUNCTION public.increment_url_reuse_count(url_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.scraped_urls 
  SET 
    times_reused = times_reused + 1,
    last_reused_at = NOW(),
    updated_at = NOW()
  WHERE id = url_id;
END;
$$;

-- ==============================================
-- PHASE 6: ADD PROPER INDEXES FOR PERFORMANCE
-- ==============================================

-- Remove broken indexes
DROP INDEX IF EXISTS idx_scraped_urls_tavily_search;
DROP INDEX IF EXISTS idx_native_experiences_search_id;
DROP INDEX IF EXISTS idx_native_experiences_platform;
DROP INDEX IF EXISTS idx_api_logs_search_id;
DROP INDEX IF EXISTS idx_scraping_metrics_search_id;

-- Add optimized indexes for remaining tables
CREATE INDEX IF NOT EXISTS idx_scraped_urls_company_name_role 
  ON public.scraped_urls(company_name, role_title);

CREATE INDEX IF NOT EXISTS idx_scraped_urls_quality_reused 
  ON public.scraped_urls(content_quality_score DESC, times_reused DESC);

CREATE INDEX IF NOT EXISTS idx_scraped_urls_processing_status 
  ON public.scraped_urls(processing_status) 
  WHERE processing_status IN ('processed', 'analyzed');

CREATE INDEX IF NOT EXISTS idx_tavily_searches_performance 
  ON public.tavily_searches(user_id, api_type, created_at DESC);

-- Full-text search index for scraped URLs content
CREATE INDEX IF NOT EXISTS idx_scraped_urls_content_search 
  ON public.scraped_urls 
  USING gin(to_tsvector('english', COALESCE(full_content, ai_summary, title, '')));

-- ==============================================
-- PHASE 7: UPDATE TRIGGERS AND CONSTRAINTS
-- ==============================================

-- Remove broken triggers (check if tables exist first)
DO $$
BEGIN
    -- Check and drop triggers on scraped_urls if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'scraped_urls') THEN
        DROP TRIGGER IF EXISTS calculate_url_hash_trigger ON public.scraped_urls;
        DROP TRIGGER IF EXISTS update_content_staleness_trigger ON public.scraped_urls;
        DROP TRIGGER IF EXISTS update_scraped_urls_updated_at ON public.scraped_urls;
    END IF;
    
    -- Check and drop triggers on scraped_content if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'scraped_content') THEN
        DROP TRIGGER IF EXISTS update_scraped_content_updated_at ON public.scraped_content;
    END IF;
    
    -- Check and drop triggers on research_cache if table exists  
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'research_cache') THEN
        DROP TRIGGER IF EXISTS update_research_cache_updated_at ON public.research_cache;
    END IF;
END $$;

-- Recreate essential triggers
CREATE OR REPLACE FUNCTION public.update_scraped_urls_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate URL hash and domain
  NEW.url_hash := encode(sha256(NEW.url::bytea), 'hex');
  NEW.domain := CASE 
    WHEN NEW.url ~ '^https?://([^/]+)' THEN 
      substring(NEW.url from '^https?://([^/]+)')
    ELSE 
      'unknown'
  END;
  
  -- Update staleness
  NEW.content_staleness_days := EXTRACT(days FROM (now() - NEW.first_scraped_at))::INTEGER;
  
  -- Update timestamps
  NEW.updated_at := now();
  
  -- Update word count if content exists
  IF NEW.full_content IS NOT NULL THEN
    NEW.word_count := array_length(string_to_array(NEW.full_content, ' '), 1);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_scraped_urls_metadata_trigger
  BEFORE INSERT OR UPDATE ON public.scraped_urls
  FOR EACH ROW
  EXECUTE FUNCTION public.update_scraped_urls_metadata();

-- ==============================================
-- PHASE 8: GRANT PERMISSIONS
-- ==============================================

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.scraped_urls TO postgres, anon, authenticated, service_role;
GRANT SELECT, INSERT ON public.tavily_searches TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.find_reusable_urls_simple TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_url_reuse_count TO postgres, anon, authenticated, service_role;

-- ==============================================
-- PHASE 9: ADD COMMENTS FOR DOCUMENTATION
-- ==============================================

COMMENT ON TABLE public.scraped_urls IS 'Consolidated table storing all scraped URLs and their content (merged from scraped_content)';
COMMENT ON TABLE public.tavily_searches IS 'Simplified logging for Tavily API calls';
COMMENT ON COLUMN public.scraped_urls.full_content IS 'Complete extracted content from the URL';
COMMENT ON COLUMN public.scraped_urls.ai_summary IS 'AI-generated summary of the content';
COMMENT ON COLUMN public.scraped_urls.processing_status IS 'Current processing status: raw, processed, analyzed, failed';

-- ==============================================
-- PHASE 10: CLEANUP STATEMENTS
-- ==============================================

-- Remove database timeout that might cause issues
ALTER DATABASE postgres RESET statement_timeout;

-- Analyze tables for query planner
ANALYZE public.scraped_urls;
ANALYZE public.tavily_searches;
ANALYZE public.searches;
ANALYZE public.interview_stages;
ANALYZE public.enhanced_question_banks;
ANALYZE public.cv_job_comparisons;
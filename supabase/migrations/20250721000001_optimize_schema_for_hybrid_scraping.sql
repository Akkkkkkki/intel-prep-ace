-- Migration: Optimize schema for hybrid native + Tavily scraping
-- This migration cleans up the schema, fixes broken references, and optimizes for the new hybrid approach

-- Step 1: Drop tables that are no longer needed or have broken references

-- Drop tavily_usage_stats table (replaced by simplified logging)
DROP TABLE IF EXISTS public.tavily_usage_stats CASCADE;

-- Drop existing tavily_searches table if it exists (will be recreated with better structure)
DROP TABLE IF EXISTS public.tavily_searches CASCADE;

-- Step 2: Fix broken foreign key in scraped_urls table
-- Remove the broken reference to tavily_searches and simplify the structure
ALTER TABLE public.scraped_urls DROP COLUMN IF EXISTS tavily_search_id;

-- Add new columns for hybrid scraping support
ALTER TABLE public.scraped_urls 
ADD COLUMN IF NOT EXISTS scraping_method TEXT CHECK (scraping_method IN ('native_glassdoor', 'native_reddit', 'native_blind', 'native_leetcode', 'tavily_search', 'tavily_extract')) DEFAULT 'tavily_search',
ADD COLUMN IF NOT EXISTS platform_specific_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS experience_metadata JSONB DEFAULT '{}'::jsonb;

-- Update existing records to have the new scraping_method
UPDATE public.scraped_urls 
SET scraping_method = CASE 
  WHEN extraction_method = 'search_result' THEN 'tavily_search'
  WHEN extraction_method = 'deep_extract' THEN 'tavily_extract'
  ELSE 'tavily_search'
END
WHERE scraping_method IS NULL;

-- Step 3: Create new optimized tables for hybrid scraping

-- Table for structured interview experiences from native scraping
CREATE TABLE IF NOT EXISTS public.native_interview_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID REFERENCES public.searches(id) ON DELETE CASCADE NOT NULL,
  
  -- Source identification
  platform TEXT NOT NULL CHECK (platform IN ('glassdoor', 'reddit', 'blind', 'leetcode', '1point3acres', 'levels.fyi')),
  source_url TEXT NOT NULL,
  company_name TEXT NOT NULL,
  role_title TEXT,
  
  -- Experience details
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  experience_type TEXT CHECK (experience_type IN ('positive', 'negative', 'neutral')) DEFAULT 'neutral',
  difficulty_rating TEXT CHECK (difficulty_rating IN ('easy', 'medium', 'hard', 'unknown')) DEFAULT 'unknown',
  
  -- Structured metadata from native scrapers
  interview_stages TEXT[],
  questions_asked TEXT[],
  preparation_tips TEXT[],
  salary_mentioned BOOLEAN DEFAULT false,
  offer_outcome TEXT CHECK (offer_outcome IN ('accepted', 'rejected', 'pending', 'unknown')) DEFAULT 'unknown',
  
  -- Platform-specific data
  author_info JSONB DEFAULT '{}'::jsonb, -- username, reputation, etc.
  engagement_metrics JSONB DEFAULT '{}'::jsonb, -- upvotes, comments, views
  platform_metadata JSONB DEFAULT '{}'::jsonb, -- platform-specific fields
  
  -- Content quality and processing
  quality_score FLOAT DEFAULT 0 CHECK (quality_score >= 0 AND quality_score <= 1),
  content_processed BOOLEAN DEFAULT false,
  ai_summary TEXT,
  
  -- Timestamps
  posted_date DATE, -- When the original experience was posted
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Table for simplified API logging (replaces complex tavily_searches)
CREATE TABLE IF NOT EXISTS public.api_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID REFERENCES public.searches(id) ON DELETE CASCADE,
  
  -- API details
  api_provider TEXT NOT NULL CHECK (api_provider IN ('tavily', 'reddit', 'openai', 'other')),
  api_method TEXT NOT NULL, -- 'search', 'extract', 'get_posts', 'chat_completion', etc.
  
  -- Request/Response tracking
  request_summary JSONB, -- Key request parameters (no sensitive data)
  response_status INTEGER NOT NULL,
  results_count INTEGER DEFAULT 0,
  
  -- Performance and cost
  duration_ms INTEGER,
  credits_used INTEGER DEFAULT 0,
  estimated_cost_usd DECIMAL(10,4) DEFAULT 0,
  
  -- Error handling
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Table for tracking scraping performance and quality
CREATE TABLE IF NOT EXISTS public.scraping_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID REFERENCES public.searches(id) ON DELETE CASCADE NOT NULL,
  
  -- Scraping session summary
  total_native_experiences INTEGER DEFAULT 0,
  total_tavily_results INTEGER DEFAULT 0,
  total_execution_time_ms INTEGER DEFAULT 0,
  
  -- Platform breakdown
  glassdoor_experiences INTEGER DEFAULT 0,
  reddit_experiences INTEGER DEFAULT 0,
  blind_experiences INTEGER DEFAULT 0,
  leetcode_experiences INTEGER DEFAULT 0,
  other_platform_experiences INTEGER DEFAULT 0,
  
  -- Quality metrics
  average_quality_score FLOAT DEFAULT 0,
  high_quality_experiences INTEGER DEFAULT 0, -- quality_score >= 0.7
  deduplication_removals INTEGER DEFAULT 0,
  
  -- Cost and performance
  total_api_calls INTEGER DEFAULT 0,
  total_api_cost_usd DECIMAL(10,4) DEFAULT 0,
  cache_hits INTEGER DEFAULT 0,
  cache_hit_rate FLOAT DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Step 4: Update existing tables for better performance

-- Add indexes for the new native experiences table
CREATE INDEX idx_native_experiences_search_id ON public.native_interview_experiences(search_id);
CREATE INDEX idx_native_experiences_platform ON public.native_interview_experiences(platform);
CREATE INDEX idx_native_experiences_company ON public.native_interview_experiences(company_name);
CREATE INDEX idx_native_experiences_quality ON public.native_interview_experiences(quality_score DESC);
CREATE INDEX idx_native_experiences_scraped_at ON public.native_interview_experiences(scraped_at DESC);

-- Add indexes for API logging
CREATE INDEX idx_api_logs_search_id ON public.api_call_logs(search_id);
CREATE INDEX idx_api_logs_provider ON public.api_call_logs(api_provider);
CREATE INDEX idx_api_logs_created_at ON public.api_call_logs(created_at DESC);

-- Add indexes for scraping metrics
CREATE INDEX idx_scraping_metrics_search_id ON public.scraping_metrics(search_id);
CREATE INDEX idx_scraping_metrics_quality ON public.scraping_metrics(average_quality_score DESC);

-- Full-text search for native experiences
CREATE INDEX idx_native_experiences_fulltext ON public.native_interview_experiences 
USING gin(to_tsvector('english', title || ' ' || content));

-- Step 5: Update scraped_urls table indexes for better performance
DROP INDEX IF EXISTS idx_scraped_urls_tavily_search; -- Remove broken index
CREATE INDEX IF NOT EXISTS idx_scraped_urls_scraping_method ON public.scraped_urls(scraping_method);

-- Step 6: Enable Row Level Security for new tables
ALTER TABLE public.native_interview_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraping_metrics ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies for new tables

-- Native interview experiences - users can view experiences from their searches
CREATE POLICY "Users can view native experiences from their searches" 
  ON public.native_interview_experiences 
  FOR SELECT 
  USING (
    search_id IN (
      SELECT id FROM public.searches WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage native experiences" 
  ON public.native_interview_experiences 
  FOR ALL 
  USING (auth.uid() IS NULL);

-- API call logs - users can view logs from their searches  
CREATE POLICY "Users can view API logs from their searches" 
  ON public.api_call_logs 
  FOR SELECT 
  USING (
    search_id IS NULL OR search_id IN (
      SELECT id FROM public.searches WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage API logs" 
  ON public.api_call_logs 
  FOR ALL 
  USING (auth.uid() IS NULL);

-- Scraping metrics - users can view metrics from their searches
CREATE POLICY "Users can view scraping metrics from their searches" 
  ON public.scraping_metrics 
  FOR SELECT 
  USING (
    search_id IN (
      SELECT id FROM public.searches WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage scraping metrics" 
  ON public.scraping_metrics 
  FOR ALL 
  USING (auth.uid() IS NULL);

-- Step 8: Create optimized functions for hybrid scraping

-- Function to get comprehensive search results with native experiences
CREATE OR REPLACE FUNCTION get_hybrid_search_results(p_search_id UUID)
RETURNS TABLE(
  search_data JSONB,
  interview_stages JSONB,
  native_experiences JSONB,
  scraping_metrics JSONB,
  cv_job_comparison JSONB,
  enhanced_questions JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Basic search data
    to_jsonb(s.*) as search_data,
    
    -- Interview stages (AI-generated structure)
    COALESCE(
      jsonb_agg(DISTINCT to_jsonb(ist.*)) FILTER (WHERE ist.id IS NOT NULL),
      '[]'::jsonb
    ) as interview_stages,
    
    -- Native experiences (raw forum data)
    COALESCE(
      jsonb_agg(DISTINCT to_jsonb(nie.*)) FILTER (WHERE nie.id IS NOT NULL),
      '[]'::jsonb
    ) as native_experiences,
    
    -- Scraping performance metrics
    COALESCE(
      to_jsonb(sm.*),
      '{}'::jsonb
    ) as scraping_metrics,
    
    -- CV job comparison
    COALESCE(
      to_jsonb(cjc.*),
      '{}'::jsonb
    ) as cv_job_comparison,
    
    -- Enhanced questions
    COALESCE(
      jsonb_agg(DISTINCT to_jsonb(eqb.*)) FILTER (WHERE eqb.id IS NOT NULL),
      '[]'::jsonb
    ) as enhanced_questions
    
  FROM public.searches s
  LEFT JOIN public.interview_stages ist ON s.id = ist.search_id
  LEFT JOIN public.native_interview_experiences nie ON s.id = nie.search_id
  LEFT JOIN public.scraping_metrics sm ON s.id = sm.search_id
  LEFT JOIN public.cv_job_comparisons cjc ON s.id = cjc.search_id
  LEFT JOIN public.enhanced_question_banks eqb ON s.id = eqb.search_id
  WHERE s.id = p_search_id
  GROUP BY s.id, sm.id, cjc.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get native scraping statistics
CREATE OR REPLACE FUNCTION get_platform_scraping_stats(
  p_days_back INTEGER DEFAULT 7
)
RETURNS TABLE(
  platform TEXT,
  total_experiences INTEGER,
  avg_quality_score FLOAT,
  total_searches INTEGER,
  avg_experiences_per_search FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    nie.platform,
    COUNT(*)::INTEGER as total_experiences,
    AVG(nie.quality_score)::FLOAT as avg_quality_score,
    COUNT(DISTINCT nie.search_id)::INTEGER as total_searches,
    (COUNT(*)::FLOAT / GREATEST(COUNT(DISTINCT nie.search_id), 1))::FLOAT as avg_experiences_per_search
  FROM public.native_interview_experiences nie
  WHERE nie.scraped_at >= (now() - INTERVAL '1 day' * p_days_back)
  GROUP BY nie.platform
  ORDER BY total_experiences DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find similar native experiences (for deduplication)
CREATE OR REPLACE FUNCTION find_similar_experiences(
  p_company TEXT,
  p_role TEXT DEFAULT NULL,
  p_content_sample TEXT DEFAULT NULL,
  p_similarity_threshold FLOAT DEFAULT 0.8
)
RETURNS TABLE(
  id UUID,
  platform TEXT,
  title TEXT,
  similarity_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    nie.id,
    nie.platform,
    nie.title,
    -- Simple content similarity based on word overlap
    CASE 
      WHEN p_content_sample IS NOT NULL THEN
        (LENGTH(p_content_sample) - LENGTH(REPLACE(LOWER(nie.content), LOWER(p_content_sample), ''))) / 
        GREATEST(LENGTH(p_content_sample), 1)::FLOAT
      ELSE 0.5
    END as similarity_score
  FROM public.native_interview_experiences nie
  WHERE 
    nie.company_name ILIKE p_company
    AND (p_role IS NULL OR nie.role_title ILIKE '%' || p_role || '%')
    AND nie.scraped_at >= (now() - INTERVAL '30 days') -- Only recent experiences
  ORDER BY similarity_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Clean up old/unused data and optimize storage

-- Remove old scraped URLs with very low quality scores that haven't been reused
DELETE FROM public.scraped_urls 
WHERE content_quality_score < 0.1 
  AND times_reused = 0 
  AND first_scraped_at < (now() - INTERVAL '7 days');

-- Update content staleness for all remaining URLs
UPDATE public.scraped_urls 
SET content_staleness_days = EXTRACT(days FROM (now() - first_scraped_at))::INTEGER;

-- Step 10: Create triggers for automatic data maintenance

-- Trigger to automatically update scraping metrics when native experiences are added
CREATE OR REPLACE FUNCTION update_scraping_metrics_on_experience()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.scraping_metrics (
    search_id,
    total_native_experiences,
    glassdoor_experiences,
    reddit_experiences, 
    blind_experiences,
    leetcode_experiences,
    other_platform_experiences,
    average_quality_score,
    high_quality_experiences
  )
  SELECT 
    NEW.search_id,
    COUNT(*),
    COUNT(*) FILTER (WHERE platform = 'glassdoor'),
    COUNT(*) FILTER (WHERE platform = 'reddit'),
    COUNT(*) FILTER (WHERE platform = 'blind'), 
    COUNT(*) FILTER (WHERE platform = 'leetcode'),
    COUNT(*) FILTER (WHERE platform NOT IN ('glassdoor', 'reddit', 'blind', 'leetcode')),
    AVG(quality_score),
    COUNT(*) FILTER (WHERE quality_score >= 0.7)
  FROM public.native_interview_experiences 
  WHERE search_id = NEW.search_id
  GROUP BY search_id
  ON CONFLICT (search_id) 
  DO UPDATE SET
    total_native_experiences = EXCLUDED.total_native_experiences,
    glassdoor_experiences = EXCLUDED.glassdoor_experiences,
    reddit_experiences = EXCLUDED.reddit_experiences,
    blind_experiences = EXCLUDED.blind_experiences,
    leetcode_experiences = EXCLUDED.leetcode_experiences,
    other_platform_experiences = EXCLUDED.other_platform_experiences,
    average_quality_score = EXCLUDED.average_quality_score,
    high_quality_experiences = EXCLUDED.high_quality_experiences;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_metrics_on_native_experience
  AFTER INSERT ON public.native_interview_experiences
  FOR EACH ROW 
  EXECUTE FUNCTION update_scraping_metrics_on_experience();

-- Add unique constraint to scraping_metrics to prevent duplicates
ALTER TABLE public.scraping_metrics 
ADD CONSTRAINT unique_scraping_metrics_per_search 
UNIQUE(search_id);

COMMENT ON TABLE public.native_interview_experiences IS 'Structured interview experiences scraped from native forum sources (Glassdoor, Reddit, Blind, etc.)';
COMMENT ON TABLE public.api_call_logs IS 'Simplified logging for all API calls (Tavily, Reddit, OpenAI, etc.) with cost tracking';
COMMENT ON TABLE public.scraping_metrics IS 'Performance and quality metrics for each scraping session';
COMMENT ON COLUMN public.scraped_urls.scraping_method IS 'Method used to obtain this URL: native scraping or Tavily API';
COMMENT ON COLUMN public.native_interview_experiences.quality_score IS 'Automated quality score (0-1) based on content analysis and engagement metrics';
COMMENT ON COLUMN public.native_interview_experiences.platform_metadata IS 'Platform-specific data like Reddit post ID, Glassdoor review ID, etc.';
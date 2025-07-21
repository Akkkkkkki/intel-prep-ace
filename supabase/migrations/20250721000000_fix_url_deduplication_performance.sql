-- Migration: Fix URL deduplication performance issues
-- This addresses timeout problems that caused URL deduplication to be disabled

-- Add critical performance indexes for scraped_urls table (removed CONCURRENTLY for migration compatibility)
CREATE INDEX IF NOT EXISTS idx_scraped_urls_company_quality_time 
ON public.scraped_urls(company_name, content_quality_score DESC, first_scraped_at DESC) 
WHERE content_quality_score >= 0.3;

CREATE INDEX IF NOT EXISTS idx_scraped_urls_reuse_lookup
ON public.scraped_urls(company_name, role_title, times_reused DESC, first_scraped_at DESC);

-- Simplify RLS policies for better performance
-- Service role needs full access for caching operations
DROP POLICY IF EXISTS "Users can view scraped URLs through their searches" ON public.scraped_urls;
CREATE POLICY "Service role full access scraped urls" ON public.scraped_urls 
FOR ALL USING (auth.uid() IS NULL);

-- Create optimized function for finding reusable URLs
CREATE OR REPLACE FUNCTION find_reusable_urls_fast(
  p_company TEXT,
  p_role TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL,
  p_max_age_days INTEGER DEFAULT 30,
  p_min_quality_score FLOAT DEFAULT 0.3
)
RETURNS TABLE(
  url TEXT, 
  domain TEXT, 
  title TEXT, 
  content_type TEXT, 
  content_quality_score FLOAT,
  times_reused INTEGER
)
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    su.url, 
    su.domain, 
    su.title, 
    su.content_type, 
    su.content_quality_score,
    su.times_reused
  FROM public.scraped_urls su
  WHERE su.company_name = p_company
    AND su.content_quality_score >= p_min_quality_score
    AND su.first_scraped_at > (now() - INTERVAL '1 day' * p_max_age_days)
    AND (p_role IS NULL OR su.role_title IS NULL OR su.role_title = p_role)
  ORDER BY su.content_quality_score DESC, su.times_reused DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create simple function to get cached content
CREATE OR REPLACE FUNCTION get_cached_content_simple(p_urls TEXT[])
RETURNS TABLE(
  url TEXT,
  content TEXT,
  title TEXT,
  content_type TEXT
)
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sc.url,
    sc.content,
    sc.title,
    sc.content_type
  FROM public.scraped_content sc
  WHERE sc.url = ANY(p_urls)
  ORDER BY sc.scraped_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION find_reusable_urls_fast(TEXT, TEXT, TEXT, INTEGER, FLOAT) TO service_role;
GRANT EXECUTE ON FUNCTION get_cached_content_simple(TEXT[]) TO service_role;

-- Add performance monitoring
CREATE TABLE IF NOT EXISTS public.url_deduplication_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID,
  cache_hit_count INTEGER DEFAULT 0,
  total_urls_needed INTEGER DEFAULT 0,
  response_time_ms INTEGER DEFAULT 0,
  api_calls_saved INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_url_dedup_metrics_created_at 
ON public.url_deduplication_metrics(created_at DESC);

-- Enable RLS for metrics table
ALTER TABLE public.url_deduplication_metrics ENABLE ROW LEVEL SECURITY;

-- Allow service role to insert metrics
CREATE POLICY "Service role can manage dedup metrics" 
ON public.url_deduplication_metrics 
FOR ALL USING (auth.uid() IS NULL);
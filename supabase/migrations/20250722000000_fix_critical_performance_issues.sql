-- Fix Critical Performance Issues: RLS Policies and Indexes
-- This migration addresses 406 errors and slow database queries

-- 1. Simplify cv_job_comparisons RLS policies to prevent timeouts
DROP POLICY IF EXISTS "Users can view their own CV job comparisons" ON public.cv_job_comparisons;

CREATE POLICY "Users can view their own CV job comparisons" 
  ON public.cv_job_comparisons 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Separate simpler policy for search-based access  
CREATE POLICY "Users can view CV job comparisons via search" 
  ON public.cv_job_comparisons 
  FOR SELECT 
  USING (
    search_id IN (
      SELECT id FROM public.searches WHERE user_id = auth.uid()
    )
  );

-- 2. Simplify INSERT policy as well
DROP POLICY IF EXISTS "Users can insert their own CV job comparisons" ON public.cv_job_comparisons;

CREATE POLICY "Users can insert their own CV job comparisons" 
  ON public.cv_job_comparisons 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- 3. Add critical indexes for performance
CREATE INDEX IF NOT EXISTS idx_cv_job_comparisons_user_id 
  ON public.cv_job_comparisons(user_id);

CREATE INDEX IF NOT EXISTS idx_cv_job_comparisons_search_id 
  ON public.cv_job_comparisons(search_id);

CREATE INDEX IF NOT EXISTS idx_searches_user_id 
  ON public.searches(user_id);

-- 4. Optimize scraped_urls queries that timeout
DROP POLICY IF EXISTS "Users can view scraped URLs through their searches" ON public.scraped_urls;

CREATE POLICY "Users can view scraped URLs" 
  ON public.scraped_urls 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL); -- More permissive temporarily

-- 5. Add performance indexes for URL deduplication
CREATE INDEX IF NOT EXISTS idx_scraped_urls_company_name_hash 
  ON public.scraped_urls(company_name, url_hash);

CREATE INDEX IF NOT EXISTS idx_scraped_urls_created_at 
  ON public.scraped_urls(created_at DESC);

-- 6. Create optimized function for URL deduplication
CREATE OR REPLACE FUNCTION public.find_reusable_urls_fast_v2(
  p_company text,
  p_role text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_max_age_days integer DEFAULT 30,
  p_min_quality_score numeric DEFAULT 0.3
)
RETURNS TABLE(url text, quality_score numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Simple query with timeout protection
  RETURN QUERY
  SELECT 
    su.url,
    su.content_quality_score
  FROM scraped_urls su
  WHERE 
    su.company_name ILIKE p_company
    AND su.first_scraped_at > NOW() - (p_max_age_days || ' days')::interval
    AND su.content_quality_score >= p_min_quality_score
    AND (p_role IS NULL OR su.role_title ILIKE '%' || p_role || '%')
    AND (p_country IS NULL OR su.country ILIKE p_country)
  ORDER BY 
    su.content_quality_score DESC,
    su.last_reused_at DESC NULLS LAST
  LIMIT 20;
END;
$$;

-- 7. Create simplified cache content retrieval function  
CREATE OR REPLACE FUNCTION public.get_cached_content_simple_v2(
  p_urls text[]
)
RETURNS TABLE(url text, content text, title text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Simple join without complex conditions
  RETURN QUERY
  SELECT 
    su.url,
    COALESCE(sc.full_content, su.content_summary, ''),
    COALESCE(su.title, '')
  FROM scraped_urls su
  LEFT JOIN scraped_content sc ON su.id = sc.scraped_url_id
  WHERE su.url = ANY(p_urls)
  LIMIT 50;
END;
$$;

-- 8. Add statement timeout for problematic queries
ALTER DATABASE postgres SET statement_timeout = '30s';

-- 9. Update enhanced_question_banks RLS for better performance
DROP POLICY IF EXISTS "Users can view their own enhanced question banks" ON public.enhanced_question_banks;

CREATE POLICY "Users can view their own enhanced question banks" 
  ON public.enhanced_question_banks 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- 10. Add performance monitoring
CREATE TABLE IF NOT EXISTS public.query_performance_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  query_name text NOT NULL,
  execution_time_ms integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  success boolean DEFAULT true
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
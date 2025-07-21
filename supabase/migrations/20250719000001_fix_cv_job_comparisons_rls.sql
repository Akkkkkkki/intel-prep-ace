-- Fix RLS policies for cv_job_comparisons to allow frontend access

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view their own CV job comparisons" ON public.cv_job_comparisons;

-- Create a more permissive policy that allows users to read their CV job comparisons
CREATE POLICY "Users can view their own CV job comparisons" 
  ON public.cv_job_comparisons 
  FOR SELECT 
  USING (
    auth.uid() = user_id OR 
    auth.uid() IN (
      SELECT s.user_id 
      FROM public.searches s 
      WHERE s.id = cv_job_comparisons.search_id
    )
  );

-- Also allow users to insert their own CV job comparisons from frontend
CREATE POLICY "Users can insert their own CV job comparisons" 
  ON public.cv_job_comparisons 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id OR 
    auth.uid() IN (
      SELECT s.user_id 
      FROM public.searches s 
      WHERE s.id = cv_job_comparisons.search_id
    )
  );

-- Fix RLS policies for enhanced_question_banks similarly
DROP POLICY IF EXISTS "Users can view their own enhanced question banks" ON public.enhanced_question_banks;

CREATE POLICY "Users can view their own enhanced question banks" 
  ON public.enhanced_question_banks 
  FOR SELECT 
  USING (
    auth.uid() = user_id OR 
    auth.uid() IN (
      SELECT s.user_id 
      FROM public.searches s 
      WHERE s.id = enhanced_question_banks.search_id
    )
  );

CREATE POLICY "Users can insert their own enhanced question banks" 
  ON public.enhanced_question_banks 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id OR 
    auth.uid() IN (
      SELECT s.user_id 
      FROM public.searches s 
      WHERE s.id = enhanced_question_banks.search_id
    )
  );

-- Fix scraped_urls RLS to be less restrictive for logged queries
DROP POLICY IF EXISTS "Users can view scraped URLs through their searches" ON public.scraped_urls;

CREATE POLICY "Users can view scraped URLs through their searches" 
  ON public.scraped_urls 
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL AND (
      id IN (
        SELECT scu.scraped_url_id 
        FROM public.search_content_usage scu
        JOIN public.searches s ON scu.search_id = s.id
        WHERE s.user_id = auth.uid()
      ) OR
      -- Allow viewing of scraped URLs from Tavily searches by the same user
      tavily_search_id IN (
        SELECT ts.id
        FROM public.tavily_searches ts
        JOIN public.searches s ON ts.search_id = s.id
        WHERE s.user_id = auth.uid()
      )
    )
  );

-- Fix scraped_content RLS similarly
DROP POLICY IF EXISTS "Users can view content for their searches" ON public.scraped_content;

CREATE POLICY "Users can view content for their searches" 
  ON public.scraped_content 
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL AND
    scraped_url_id IN (
      SELECT su.id
      FROM public.scraped_urls su
      WHERE su.id IN (
        SELECT scu.scraped_url_id 
        FROM public.search_content_usage scu
        JOIN public.searches s ON scu.search_id = s.id
        WHERE s.user_id = auth.uid()
      ) OR
      su.tavily_search_id IN (
        SELECT ts.id
        FROM public.tavily_searches ts
        JOIN public.searches s ON ts.search_id = s.id
        WHERE s.user_id = auth.uid()
      )
    )
  );
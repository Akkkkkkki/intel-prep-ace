-- Fix RLS policies for search functionality
-- This migration addresses the "new row violates row-level security policy for table 'searches'" error

-- Add policy to allow service role (edge functions) to insert interview stages
-- Service role bypasses RLS by default, but adding explicit policy for clarity
CREATE POLICY "Service role can insert interview stages" 
  ON public.interview_stages 
  FOR INSERT 
  WITH CHECK (
    -- Allow if no user context (service role) or if user owns the search
    auth.uid() IS NULL OR 
    auth.uid() IN (
      SELECT user_id FROM public.searches WHERE id = search_id
    )
  );

-- Add policy to allow service role (edge functions) to insert interview questions
CREATE POLICY "Service role can insert interview questions" 
  ON public.interview_questions 
  FOR INSERT 
  WITH CHECK (
    -- Allow if no user context (service role) or if user owns the related search
    auth.uid() IS NULL OR 
    auth.uid() IN (
      SELECT s.user_id 
      FROM public.searches s
      JOIN public.interview_stages st ON s.id = st.search_id
      WHERE st.id = stage_id
    )
  );

-- Add policy to allow service role (edge functions) to update search status
CREATE POLICY "Service role can update search status" 
  ON public.searches 
  FOR UPDATE 
  USING (
    -- Allow if no user context (service role) or if user owns the search
    auth.uid() IS NULL OR auth.uid() = user_id
  )
  WITH CHECK (
    -- Allow if no user context (service role) or if user owns the search
    auth.uid() IS NULL OR auth.uid() = user_id
  );

-- Add policy to allow service role (edge functions) to insert resumes during search processing
CREATE POLICY "Service role can insert resumes during processing" 
  ON public.resumes 
  FOR INSERT 
  WITH CHECK (
    -- Allow if no user context (service role) or if user owns the resume
    auth.uid() IS NULL OR auth.uid() = user_id
  );

-- Drop the old policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Users can create searches" ON public.searches; 
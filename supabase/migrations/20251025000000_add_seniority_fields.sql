-- Epic 1.1: Seniority-Based Personalization
-- Add seniority tracking to profiles and searches for experience-level adaptation

-- Create seniority level enum type
DO $$ BEGIN
  CREATE TYPE seniority_level AS ENUM ('junior', 'mid', 'senior');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add seniority to profiles (user's current experience level)
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS seniority seniority_level;

-- Add target_seniority to searches (level they're applying for in this search)
ALTER TABLE public.searches 
  ADD COLUMN IF NOT EXISTS target_seniority seniority_level;

-- Add helpful comments
COMMENT ON COLUMN public.profiles.seniority IS 'User''s current experience level (junior/mid/senior)';
COMMENT ON COLUMN public.searches.target_seniority IS 'Target experience level for this search - can differ from profile seniority when applying for different levels';

-- Add index for common queries
CREATE INDEX IF NOT EXISTS idx_searches_target_seniority ON public.searches(target_seniority);


-- Migration: Enhance resumes table structure for better CV data storage
-- This adds specific columns for structured CV information

-- Add structured columns to resumes table (split into individual statements)
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS current_job_title TEXT;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS experience_years INTEGER;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS professional_summary TEXT;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS technical_skills TEXT[];
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS soft_skills TEXT[];
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS programming_languages TEXT[];
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS frameworks_libraries TEXT[];
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS tools_technologies TEXT[];
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS education JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS work_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS projects JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS achievements TEXT[];
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS languages JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS last_analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_resumes_user_id_created_at ON public.resumes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resumes_full_name ON public.resumes(full_name);
CREATE INDEX IF NOT EXISTS idx_resumes_current_job_title ON public.resumes(current_job_title);
CREATE INDEX IF NOT EXISTS idx_resumes_technical_skills ON public.resumes USING gin(technical_skills);

-- Function to extract and update structured data from parsed_data JSONB
CREATE OR REPLACE FUNCTION update_resume_structured_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract structured data from parsed_data JSONB if available
  IF NEW.parsed_data IS NOT NULL THEN
    -- Personal Information
    NEW.full_name := COALESCE(NEW.full_name, (NEW.parsed_data->'personalInfo'->>'name'));
    NEW.email := COALESCE(NEW.email, (NEW.parsed_data->'personalInfo'->>'email'));
    NEW.phone := COALESCE(NEW.phone, (NEW.parsed_data->'personalInfo'->>'phone'));
    NEW.location := COALESCE(NEW.location, (NEW.parsed_data->'personalInfo'->>'location'));
    NEW.linkedin_url := COALESCE(NEW.linkedin_url, (NEW.parsed_data->'personalInfo'->>'linkedin'));
    NEW.github_url := COALESCE(NEW.github_url, (NEW.parsed_data->'personalInfo'->>'github'));
    NEW.website_url := COALESCE(NEW.website_url, (NEW.parsed_data->'personalInfo'->>'website'));
    
    -- Professional Information
    NEW.current_job_title := COALESCE(NEW.current_job_title, (NEW.parsed_data->'professional'->>'currentRole'));
    NEW.professional_summary := COALESCE(NEW.professional_summary, (NEW.parsed_data->'professional'->>'summary'));
    
    -- Extract experience years from string like "5+ years"
    IF NEW.experience_years IS NULL AND (NEW.parsed_data->'professional'->>'experience') IS NOT NULL THEN
      NEW.experience_years := (regexp_match(NEW.parsed_data->'professional'->>'experience', '(\d+)'))[1]::integer;
    END IF;
    
    -- Skills arrays
    IF NEW.technical_skills IS NULL AND (NEW.parsed_data->'skills'->'technical') IS NOT NULL THEN
      NEW.technical_skills := ARRAY(SELECT jsonb_array_elements_text(NEW.parsed_data->'skills'->'technical'));
    END IF;
    
    IF NEW.soft_skills IS NULL AND (NEW.parsed_data->'skills'->'soft') IS NOT NULL THEN
      NEW.soft_skills := ARRAY(SELECT jsonb_array_elements_text(NEW.parsed_data->'skills'->'soft'));
    END IF;
    
    IF NEW.programming_languages IS NULL AND (NEW.parsed_data->'skills'->'programming') IS NOT NULL THEN
      NEW.programming_languages := ARRAY(SELECT jsonb_array_elements_text(NEW.parsed_data->'skills'->'programming'));
    END IF;
    
    IF NEW.frameworks_libraries IS NULL AND (NEW.parsed_data->'skills'->'frameworks') IS NOT NULL THEN
      NEW.frameworks_libraries := ARRAY(SELECT jsonb_array_elements_text(NEW.parsed_data->'skills'->'frameworks'));
    END IF;
    
    IF NEW.tools_technologies IS NULL AND (NEW.parsed_data->'skills'->'tools') IS NOT NULL THEN
      NEW.tools_technologies := ARRAY(SELECT jsonb_array_elements_text(NEW.parsed_data->'skills'->'tools'));
    END IF;
    
    IF NEW.achievements IS NULL AND (NEW.parsed_data->'achievements') IS NOT NULL THEN
      NEW.achievements := ARRAY(SELECT jsonb_array_elements_text(NEW.parsed_data->'achievements'));
    END IF;
    
    -- Complex JSONB fields
    NEW.education := COALESCE(NEW.education, (NEW.parsed_data->'education'));
    NEW.work_history := COALESCE(NEW.work_history, (NEW.parsed_data->'professional'->'workHistory'));
    NEW.projects := COALESCE(NEW.projects, (NEW.parsed_data->'projects'));
    NEW.certifications := COALESCE(NEW.certifications, (NEW.parsed_data->'certifications'));
    NEW.languages := COALESCE(NEW.languages, (NEW.parsed_data->'languages'));
    
    NEW.last_analyzed_at := now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically extract structured data
CREATE TRIGGER update_resume_structured_data_trigger
  BEFORE INSERT OR UPDATE ON public.resumes
  FOR EACH ROW 
  EXECUTE FUNCTION update_resume_structured_data();

-- Function to get resume with structured data
CREATE OR REPLACE FUNCTION get_resume_with_structured_data(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  search_id UUID,
  content TEXT,
  parsed_data JSONB,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  location TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  website_url TEXT,
  current_job_title TEXT,
  experience_years INTEGER,
  professional_summary TEXT,
  technical_skills TEXT[],
  soft_skills TEXT[],
  programming_languages TEXT[],
  frameworks_libraries TEXT[],
  tools_technologies TEXT[],
  certifications JSONB,
  education JSONB,
  work_history JSONB,
  projects JSONB,
  achievements TEXT[],
  languages JSONB,
  last_analyzed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.user_id,
    r.search_id,
    r.content,
    r.parsed_data,
    r.full_name,
    r.email,
    r.phone,
    r.location,
    r.linkedin_url,
    r.github_url,
    r.website_url,
    r.current_job_title,
    r.experience_years,
    r.professional_summary,
    r.technical_skills,
    r.soft_skills,
    r.programming_languages,
    r.frameworks_libraries,
    r.tools_technologies,
    r.certifications,
    r.education,
    r.work_history,
    r.projects,
    r.achievements,
    r.languages,
    r.last_analyzed_at,
    r.created_at
  FROM public.resumes r
  WHERE r.user_id = p_user_id
  ORDER BY r.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies to include new columns
CREATE POLICY "Users can update their own resumes" 
  ON public.resumes 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create view for easy access to structured resume data
CREATE OR REPLACE VIEW resume_structured_view AS
SELECT 
  id,
  user_id,
  full_name,
  email,
  phone,
  location,
  linkedin_url,
  github_url,
  current_job_title,
  experience_years,
  professional_summary,
  technical_skills,
  soft_skills,
  programming_languages,
  frameworks_libraries,
  tools_technologies,
  certifications,
  education,
  work_history,
  projects,
  achievements,
  languages,
  last_analyzed_at,
  created_at
FROM public.resumes
WHERE user_id = auth.uid()
ORDER BY created_at DESC;

-- Grant permissions
GRANT SELECT ON resume_structured_view TO authenticated;
GRANT EXECUTE ON FUNCTION get_resume_with_structured_data(UUID) TO authenticated;
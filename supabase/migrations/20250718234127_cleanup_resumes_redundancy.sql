-- Clean up redundant columns from resumes table
-- Keep only: id, user_id, search_id, content, parsed_data, created_at
-- Remove all the individual columns that duplicate data already in parsed_data

-- Drop the trigger and function that maintains redundant data
DROP TRIGGER IF EXISTS update_resume_structured_data_trigger ON public.resumes;
DROP FUNCTION IF EXISTS update_resume_structured_data();

-- Drop the view that depends on the redundant columns
DROP VIEW IF EXISTS public.resume_structured_view;

-- Drop the function that returns structured data
DROP FUNCTION IF EXISTS get_resume_with_structured_data(UUID);

-- Remove all redundant columns (keeping core columns + parsed_data)
ALTER TABLE public.resumes 
DROP COLUMN IF EXISTS full_name,
DROP COLUMN IF EXISTS email,
DROP COLUMN IF EXISTS phone,
DROP COLUMN IF EXISTS location,
DROP COLUMN IF EXISTS linkedin_url,
DROP COLUMN IF EXISTS github_url,
DROP COLUMN IF EXISTS website_url,
DROP COLUMN IF EXISTS current_job_title,
DROP COLUMN IF EXISTS experience_years,
DROP COLUMN IF EXISTS professional_summary,
DROP COLUMN IF EXISTS technical_skills,
DROP COLUMN IF EXISTS soft_skills,
DROP COLUMN IF EXISTS programming_languages,
DROP COLUMN IF EXISTS frameworks_libraries,
DROP COLUMN IF EXISTS tools_technologies,
DROP COLUMN IF EXISTS certifications,
DROP COLUMN IF EXISTS education,
DROP COLUMN IF EXISTS work_history,
DROP COLUMN IF EXISTS projects,
DROP COLUMN IF EXISTS achievements,
DROP COLUMN IF EXISTS languages,
DROP COLUMN IF EXISTS last_analyzed_at;

-- Clean up indexes that might reference dropped columns
DROP INDEX IF EXISTS idx_resumes_full_name;
DROP INDEX IF EXISTS idx_resumes_current_job_title;
DROP INDEX IF EXISTS idx_resumes_technical_skills;

-- Keep only the main index
-- The idx_resumes_user_id_created_at index should remain as it only uses kept columns

-- Add a comment to document the simplified structure
COMMENT ON TABLE public.resumes IS 'Stores resume content and parsed data. All structured data is stored in parsed_data JSONB column.';
COMMENT ON COLUMN public.resumes.parsed_data IS 'All structured resume data (personal info, skills, experience, etc.) stored as JSONB';

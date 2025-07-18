-- Migration: Add enhanced research data storage
-- This adds support for storing CV-job comparison and enhanced question banks

-- Add enhanced data columns to searches table
ALTER TABLE public.searches 
ADD COLUMN IF NOT EXISTS cv_job_comparison JSONB,
ADD COLUMN IF NOT EXISTS enhanced_question_bank JSONB,
ADD COLUMN IF NOT EXISTS preparation_priorities TEXT[],
ADD COLUMN IF NOT EXISTS overall_fit_score FLOAT;

-- Table for storing detailed CV-job comparison results
CREATE TABLE IF NOT EXISTS public.cv_job_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID REFERENCES public.searches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Skill gap analysis
  skill_gap_analysis JSONB NOT NULL,
  
  -- Experience gap analysis  
  experience_gap_analysis JSONB NOT NULL,
  
  -- Personalized story bank
  personalized_story_bank JSONB NOT NULL,
  
  -- Interview preparation strategy
  interview_prep_strategy JSONB NOT NULL,
  
  -- Overall assessment
  overall_fit_score FLOAT NOT NULL DEFAULT 0,
  preparation_priorities TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Table for storing enhanced question banks by stage
CREATE TABLE IF NOT EXISTS public.enhanced_question_banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID REFERENCES public.searches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  interview_stage TEXT NOT NULL,
  
  -- Question categories
  behavioral_questions JSONB DEFAULT '[]'::jsonb,
  technical_questions JSONB DEFAULT '[]'::jsonb,
  situational_questions JSONB DEFAULT '[]'::jsonb,
  company_specific_questions JSONB DEFAULT '[]'::jsonb,
  role_specific_questions JSONB DEFAULT '[]'::jsonb,
  experience_based_questions JSONB DEFAULT '[]'::jsonb,
  cultural_fit_questions JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  total_questions INTEGER DEFAULT 0,
  generation_context JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Ensure one record per search per stage
  UNIQUE(search_id, interview_stage)
);

-- Table for storing interview experiences from research
CREATE TABLE IF NOT EXISTS public.interview_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID REFERENCES public.searches(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  role_title TEXT,
  
  -- Experience details
  experience_type TEXT CHECK (experience_type IN ('positive', 'negative', 'neutral')),
  difficulty_rating TEXT CHECK (difficulty_rating IN ('Easy', 'Medium', 'Hard', 'Very Hard')),
  process_duration TEXT,
  
  -- Experience content
  experience_text TEXT,
  interviewer_feedback TEXT,
  questions_asked TEXT[],
  
  -- Source information
  source_url TEXT,
  source_platform TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_cv_job_comparisons_search_id ON public.cv_job_comparisons(search_id);
CREATE INDEX IF NOT EXISTS idx_cv_job_comparisons_user_id ON public.cv_job_comparisons(user_id);
CREATE INDEX IF NOT EXISTS idx_cv_job_comparisons_fit_score ON public.cv_job_comparisons(overall_fit_score DESC);

CREATE INDEX IF NOT EXISTS idx_enhanced_question_banks_search_id ON public.enhanced_question_banks(search_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_question_banks_user_id ON public.enhanced_question_banks(user_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_question_banks_stage ON public.enhanced_question_banks(interview_stage);

CREATE INDEX IF NOT EXISTS idx_interview_experiences_search_id ON public.interview_experiences(search_id);
CREATE INDEX IF NOT EXISTS idx_interview_experiences_company ON public.interview_experiences(company_name);
CREATE INDEX IF NOT EXISTS idx_interview_experiences_type ON public.interview_experiences(experience_type);

-- Enable Row Level Security
ALTER TABLE public.cv_job_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enhanced_question_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_experiences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cv_job_comparisons
CREATE POLICY "Users can view their own CV job comparisons" 
  ON public.cv_job_comparisons 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage CV job comparisons" 
  ON public.cv_job_comparisons 
  FOR ALL 
  USING (auth.uid() IS NULL);

-- RLS Policies for enhanced_question_banks  
CREATE POLICY "Users can view their own enhanced question banks" 
  ON public.enhanced_question_banks 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage enhanced question banks" 
  ON public.enhanced_question_banks 
  FOR ALL 
  USING (auth.uid() IS NULL);

-- RLS Policies for interview_experiences
CREATE POLICY "Users can view their own interview experiences" 
  ON public.interview_experiences 
  FOR SELECT 
  USING (auth.uid() = (SELECT user_id FROM public.searches WHERE id = search_id));

CREATE POLICY "Service role can manage interview experiences" 
  ON public.interview_experiences 
  FOR ALL 
  USING (auth.uid() IS NULL);

-- Function to update enhanced question bank total count
CREATE OR REPLACE FUNCTION update_question_bank_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_questions := (
    COALESCE(jsonb_array_length(NEW.behavioral_questions), 0) +
    COALESCE(jsonb_array_length(NEW.technical_questions), 0) +
    COALESCE(jsonb_array_length(NEW.situational_questions), 0) +
    COALESCE(jsonb_array_length(NEW.company_specific_questions), 0) +
    COALESCE(jsonb_array_length(NEW.role_specific_questions), 0) +
    COALESCE(jsonb_array_length(NEW.experience_based_questions), 0) +
    COALESCE(jsonb_array_length(NEW.cultural_fit_questions), 0)
  );
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update question counts
CREATE TRIGGER update_question_bank_total_trigger
  BEFORE INSERT OR UPDATE ON public.enhanced_question_banks
  FOR EACH ROW 
  EXECUTE FUNCTION update_question_bank_total();

-- Function to get comprehensive search results with enhanced data
CREATE OR REPLACE FUNCTION get_enhanced_search_results(p_search_id UUID)
RETURNS TABLE(
  search_data JSONB,
  interview_stages JSONB,
  interview_questions JSONB,
  cv_job_comparison JSONB,
  enhanced_questions JSONB,
  interview_experiences JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    to_jsonb(s.*) as search_data,
    
    -- Interview stages
    COALESCE(
      jsonb_agg(DISTINCT to_jsonb(ist.*)) FILTER (WHERE ist.id IS NOT NULL),
      '[]'::jsonb
    ) as interview_stages,
    
    -- Interview questions
    COALESCE(
      jsonb_agg(DISTINCT to_jsonb(iq.*)) FILTER (WHERE iq.id IS NOT NULL),
      '[]'::jsonb
    ) as interview_questions,
    
    -- CV job comparison
    COALESCE(
      to_jsonb(cjc.*),
      '{}'::jsonb
    ) as cv_job_comparison,
    
    -- Enhanced questions
    COALESCE(
      jsonb_agg(DISTINCT to_jsonb(eqb.*)) FILTER (WHERE eqb.id IS NOT NULL),
      '[]'::jsonb
    ) as enhanced_questions,
    
    -- Interview experiences
    COALESCE(
      jsonb_agg(DISTINCT to_jsonb(ie.*)) FILTER (WHERE ie.id IS NOT NULL),
      '[]'::jsonb
    ) as interview_experiences
    
  FROM public.searches s
  LEFT JOIN public.interview_stages ist ON s.id = ist.search_id
  LEFT JOIN public.interview_questions iq ON ist.id = iq.stage_id
  LEFT JOIN public.cv_job_comparisons cjc ON s.id = cjc.search_id
  LEFT JOIN public.enhanced_question_banks eqb ON s.id = eqb.search_id
  LEFT JOIN public.interview_experiences ie ON s.id = ie.search_id
  WHERE s.id = p_search_id
  GROUP BY s.id, cjc.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
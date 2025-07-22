-- Intel Prep ACE - Complete Database Schema
-- This represents the final optimized state after all migrations

-- ==============================================
-- CORE APPLICATION TABLES
-- ==============================================

-- User profiles (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- User searches (main entity for research sessions)
CREATE TABLE public.searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  role TEXT,
  country TEXT,
  role_links TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  search_status TEXT DEFAULT 'pending' NOT NULL,
  CHECK (search_status IN ('pending', 'processing', 'completed', 'failed'))
);

-- CV/Resume storage
CREATE TABLE public.resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  search_id UUID REFERENCES public.searches(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parsed_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Interview stages (structure of interview process)
CREATE TABLE public.interview_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID REFERENCES public.searches(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  duration TEXT,
  interviewer TEXT,
  content TEXT,
  guidance TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Interview questions (generated for each stage)
CREATE TABLE public.interview_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID REFERENCES public.interview_stages(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- User practice sessions
CREATE TABLE public.practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  search_id UUID REFERENCES public.searches(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Practice answers (user responses to questions)
CREATE TABLE public.practice_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.practice_sessions(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.interview_questions(id) ON DELETE CASCADE NOT NULL,
  text_answer TEXT,
  audio_url TEXT,
  answer_time_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ==============================================
-- RESEARCH AND SCRAPING TABLES
-- ==============================================

-- Consolidated scraped URLs and content (merged from previous scraped_content table)
CREATE TABLE public.scraped_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID REFERENCES public.searches(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  url_hash TEXT UNIQUE,
  domain TEXT,
  title TEXT,
  description TEXT,
  
  -- Content fields (consolidated from scraped_content)
  full_content TEXT,
  raw_html TEXT,
  structured_data JSONB DEFAULT '{}'::jsonb,
  extracted_questions TEXT[],
  extracted_insights TEXT[],
  word_count INTEGER DEFAULT 0,
  language TEXT DEFAULT 'en',
  content_source TEXT,
  processing_status TEXT DEFAULT 'raw' CHECK (processing_status IN ('raw', 'processed', 'analyzed', 'failed')),
  ai_summary TEXT,
  
  -- Research context
  company_name TEXT,
  role_title TEXT,
  
  -- Quality and usage metrics
  content_quality_score FLOAT DEFAULT 0.0,
  content_staleness_days INTEGER DEFAULT 0,
  times_reused INTEGER DEFAULT 0,
  
  -- Timestamps
  first_scraped_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_reused_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enhanced question banks for advanced question generation
CREATE TABLE public.enhanced_question_banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID REFERENCES public.searches(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  role_title TEXT,
  
  -- Question content
  question_text TEXT NOT NULL,
  question_type TEXT CHECK (question_type IN ('behavioral', 'technical', 'case_study', 'company_specific')),
  difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  
  -- Metadata
  source_urls TEXT[],
  confidence_score FLOAT DEFAULT 0.0,
  usage_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- CV-Job comparison results
CREATE TABLE public.cv_job_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID REFERENCES public.searches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_id UUID REFERENCES public.resumes(id) ON DELETE CASCADE,
  
  -- Comparison data
  job_requirements JSONB,
  cv_analysis JSONB,
  comparison_results JSONB,
  recommendations JSONB,
  overall_match_score FLOAT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ==============================================
-- API LOGGING TABLES
-- ==============================================

-- Tavily API call logging (simplified)
CREATE TABLE public.tavily_searches (
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

-- ==============================================
-- FUNCTIONS
-- ==============================================

-- Handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Find reusable URLs for research
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

-- Increment URL reuse counter
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

-- Update scraped URLs metadata
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

-- ==============================================
-- TRIGGERS
-- ==============================================

-- Create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Update timestamps
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scraped_urls_metadata_trigger
  BEFORE INSERT OR UPDATE ON public.scraped_urls
  FOR EACH ROW
  EXECUTE FUNCTION public.update_scraped_urls_metadata();

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================

CREATE INDEX idx_scraped_urls_company_name_role 
  ON public.scraped_urls(company_name, role_title);

CREATE INDEX idx_scraped_urls_quality_reused 
  ON public.scraped_urls(content_quality_score DESC, times_reused DESC);

CREATE INDEX idx_scraped_urls_processing_status 
  ON public.scraped_urls(processing_status) 
  WHERE processing_status IN ('processed', 'analyzed');

CREATE INDEX idx_tavily_searches_performance 
  ON public.tavily_searches(user_id, api_type, created_at DESC);

CREATE INDEX idx_scraped_urls_content_search 
  ON public.scraped_urls 
  USING gin(to_tsvector('english', COALESCE(full_content, ai_summary, title, '')));

-- ==============================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraped_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enhanced_question_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cv_job_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tavily_searches ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- RLS POLICIES
-- ==============================================

-- Profile policies
CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Search policies
CREATE POLICY "Users can view their own searches" 
  ON public.searches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create searches" 
  ON public.searches FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Resume policies
CREATE POLICY "Users can view their own resumes" 
  ON public.resumes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create resumes" 
  ON public.resumes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Interview stages policies
CREATE POLICY "Users can view interview stages for their searches" 
  ON public.interview_stages FOR SELECT 
  USING (auth.uid() IN (SELECT user_id FROM public.searches WHERE id = interview_stages.search_id));

-- Interview questions policies
CREATE POLICY "Users can view questions for their interview stages" 
  ON public.interview_questions FOR SELECT 
  USING (auth.uid() IN (
    SELECT s.user_id FROM public.searches s
    JOIN public.interview_stages st ON s.id = st.search_id
    WHERE st.id = interview_questions.stage_id
  ));

-- Practice session policies
CREATE POLICY "Users can view their own practice sessions" 
  ON public.practice_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create practice sessions" 
  ON public.practice_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Practice answers policies
CREATE POLICY "Users can view their own practice answers" 
  ON public.practice_answers FOR SELECT 
  USING (auth.uid() IN (SELECT user_id FROM public.practice_sessions WHERE id = practice_answers.session_id));
CREATE POLICY "Users can create practice answers" 
  ON public.practice_answers FOR INSERT 
  WITH CHECK (auth.uid() IN (SELECT user_id FROM public.practice_sessions WHERE id = practice_answers.session_id));

-- Scraped URLs policies (simplified for performance)
CREATE POLICY "Service role can manage scraped URLs" 
  ON public.scraped_urls FOR ALL USING (auth.uid() IS NULL);
CREATE POLICY "Authenticated users can view scraped URLs" 
  ON public.scraped_urls FOR SELECT USING (auth.uid() IS NOT NULL);

-- Enhanced question banks policies
CREATE POLICY "Users can view enhanced questions for their searches" 
  ON public.enhanced_question_banks FOR SELECT 
  USING (auth.uid() IN (SELECT user_id FROM public.searches WHERE id = enhanced_question_banks.search_id));

-- CV job comparisons policies
CREATE POLICY "Users can view their own CV comparisons" 
  ON public.cv_job_comparisons FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create CV comparisons" 
  ON public.cv_job_comparisons FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Tavily searches policies
CREATE POLICY "Users can view their own Tavily searches" 
  ON public.tavily_searches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage Tavily searches" 
  ON public.tavily_searches FOR ALL USING (auth.uid() IS NULL);

-- ==============================================
-- CONSTRAINTS
-- ==============================================

ALTER TABLE public.scraped_urls 
  ADD CONSTRAINT unique_url_hash_company UNIQUE(url_hash, company_name);

-- ==============================================
-- PERMISSIONS
-- ==============================================

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- ==============================================
-- DOCUMENTATION
-- ==============================================

COMMENT ON TABLE public.scraped_urls IS 'Consolidated table storing all scraped URLs and their content (merged from scraped_content)';
COMMENT ON TABLE public.tavily_searches IS 'Simplified logging for Tavily API calls';
COMMENT ON COLUMN public.scraped_urls.full_content IS 'Complete extracted content from the URL';
COMMENT ON COLUMN public.scraped_urls.ai_summary IS 'AI-generated summary of the content';
COMMENT ON COLUMN public.scraped_urls.processing_status IS 'Current processing status: raw, processed, analyzed, failed'; 
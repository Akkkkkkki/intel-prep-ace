-- Create tables for the INT application

-- Table for user searches
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

-- Table for CV/resumes
CREATE TABLE public.resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  search_id UUID REFERENCES public.searches(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parsed_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Table for interview stages
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

-- Table for interview questions
CREATE TABLE public.interview_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID REFERENCES public.interview_stages(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Table for users' practice sessions
CREATE TABLE public.practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  search_id UUID REFERENCES public.searches(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Table for practice answers
CREATE TABLE public.practice_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.practice_sessions(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.interview_questions(id) ON DELETE CASCADE NOT NULL,
  text_answer TEXT,
  audio_url TEXT,
  answer_time_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user profiles table for additional user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create function to set up user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Update updated_at on profile changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profile policies
CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Searches policies
CREATE POLICY "Users can view their own searches" 
  ON public.searches 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create searches" 
  ON public.searches 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Resume policies
CREATE POLICY "Users can view their own resumes" 
  ON public.resumes 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create resumes" 
  ON public.resumes 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Interview stages policies (viewable by search owner)
CREATE POLICY "Users can view interview stages for their searches" 
  ON public.interview_stages 
  FOR SELECT 
  USING (auth.uid() IN (
    SELECT user_id FROM public.searches WHERE id = interview_stages.search_id
  ));

-- Interview questions policies (viewable by stage owner)
CREATE POLICY "Users can view questions for their interview stages" 
  ON public.interview_questions 
  FOR SELECT 
  USING (auth.uid() IN (
    SELECT s.user_id 
    FROM public.searches s
    JOIN public.interview_stages st ON s.id = st.search_id
    WHERE st.id = interview_questions.stage_id
  ));

-- Practice session policies
CREATE POLICY "Users can view their own practice sessions" 
  ON public.practice_sessions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create practice sessions" 
  ON public.practice_sessions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Practice answers policies
CREATE POLICY "Users can view their own practice answers" 
  ON public.practice_answers 
  FOR SELECT 
  USING (auth.uid() IN (
    SELECT user_id 
    FROM public.practice_sessions
    WHERE id = practice_answers.session_id
  ));

CREATE POLICY "Users can create practice answers" 
  ON public.practice_answers 
  FOR INSERT 
  WITH CHECK (auth.uid() IN (
    SELECT user_id 
    FROM public.practice_sessions
    WHERE id = practice_answers.session_id
  ));
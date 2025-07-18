-- Migration: Add Tavily search logging and analytics
-- This enables comprehensive tracking of all Tavily API usage

-- Table for tracking all Tavily API calls
CREATE TABLE public.tavily_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID REFERENCES public.searches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- API call details
  api_type TEXT NOT NULL CHECK (api_type IN ('search', 'extract')),
  endpoint_url TEXT NOT NULL,
  
  -- Request data
  request_payload JSONB NOT NULL,
  query_text TEXT, -- Extracted from payload for easier querying
  search_depth TEXT, -- 'basic' or 'advanced'
  max_results INTEGER,
  include_domains TEXT[], -- Array of targeted domains
  
  -- Response data
  response_payload JSONB,
  response_status INTEGER NOT NULL,
  results_count INTEGER DEFAULT 0,
  
  -- Performance metrics
  request_duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Cost tracking (credits used)
  credits_used INTEGER DEFAULT 1,
  
  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0
);

-- Table for aggregated Tavily usage analytics
CREATE TABLE public.tavily_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Daily aggregates
  total_searches INTEGER DEFAULT 0,
  total_extracts INTEGER DEFAULT 0,
  total_credits_used INTEGER DEFAULT 0,
  total_results_returned INTEGER DEFAULT 0,
  
  -- Performance aggregates
  avg_response_time_ms FLOAT,
  success_rate FLOAT,
  
  -- Company research specific
  companies_researched TEXT[],
  unique_companies_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Ensure one record per user per day
  UNIQUE(date, user_id)
);

-- Indexes for efficient querying
CREATE INDEX idx_tavily_searches_search_id ON public.tavily_searches(search_id);
CREATE INDEX idx_tavily_searches_user_id ON public.tavily_searches(user_id);
CREATE INDEX idx_tavily_searches_api_type ON public.tavily_searches(api_type);
CREATE INDEX idx_tavily_searches_created_at ON public.tavily_searches(created_at DESC);
CREATE INDEX idx_tavily_searches_query_text ON public.tavily_searches USING gin(to_tsvector('english', query_text));

CREATE INDEX idx_tavily_usage_stats_date ON public.tavily_usage_stats(date DESC);
CREATE INDEX idx_tavily_usage_stats_user_id ON public.tavily_usage_stats(user_id);

-- Enable Row Level Security
ALTER TABLE public.tavily_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tavily_usage_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tavily_searches
CREATE POLICY "Users can view their own Tavily searches" 
  ON public.tavily_searches 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert Tavily searches" 
  ON public.tavily_searches 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NULL OR auth.uid() = user_id);

-- RLS Policies for tavily_usage_stats  
CREATE POLICY "Users can view their own usage stats" 
  ON public.tavily_usage_stats 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage usage stats" 
  ON public.tavily_usage_stats 
  FOR ALL 
  USING (auth.uid() IS NULL);

-- Function to update usage stats
CREATE OR REPLACE FUNCTION update_tavily_usage_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process successful searches
  IF NEW.response_status = 200 THEN
    INSERT INTO public.tavily_usage_stats (
      date, 
      user_id,
      total_searches,
      total_extracts, 
      total_credits_used,
      total_results_returned
    )
    VALUES (
      CURRENT_DATE,
      NEW.user_id,
      CASE WHEN NEW.api_type = 'search' THEN 1 ELSE 0 END,
      CASE WHEN NEW.api_type = 'extract' THEN 1 ELSE 0 END,
      COALESCE(NEW.credits_used, 1),
      COALESCE(NEW.results_count, 0)
    )
    ON CONFLICT (date, user_id) DO UPDATE SET
      total_searches = tavily_usage_stats.total_searches + CASE WHEN NEW.api_type = 'search' THEN 1 ELSE 0 END,
      total_extracts = tavily_usage_stats.total_extracts + CASE WHEN NEW.api_type = 'extract' THEN 1 ELSE 0 END,
      total_credits_used = tavily_usage_stats.total_credits_used + COALESCE(NEW.credits_used, 1),
      total_results_returned = tavily_usage_stats.total_results_returned + COALESCE(NEW.results_count, 0),
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update usage stats
CREATE TRIGGER on_tavily_search_completed
  AFTER INSERT ON public.tavily_searches
  FOR EACH ROW 
  EXECUTE FUNCTION update_tavily_usage_stats();

-- Function for efficient search deduplication
CREATE OR REPLACE FUNCTION find_similar_tavily_search(
  p_query_text TEXT,
  p_api_type TEXT,
  p_search_depth TEXT DEFAULT 'basic',
  p_hours_threshold INTEGER DEFAULT 24
)
RETURNS TABLE(
  id UUID,
  response_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  results_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ts.id,
    ts.response_payload,
    ts.created_at,
    ts.results_count
  FROM public.tavily_searches ts
  WHERE 
    ts.query_text = p_query_text
    AND ts.api_type = p_api_type  
    AND ts.search_depth = p_search_depth
    AND ts.response_status = 200
    AND ts.created_at > (now() - INTERVAL '1 hour' * p_hours_threshold)
  ORDER BY ts.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 
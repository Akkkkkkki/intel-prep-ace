-- Comprehensive API and Function Logging
-- Ensures we capture ALL raw data for audit, debugging, and reprocessing

-- 1. Fix/Create Tavily API logging table (if missing)
CREATE TABLE IF NOT EXISTS public.tavily_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID REFERENCES public.searches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- API call details
  api_type TEXT NOT NULL CHECK (api_type IN ('search', 'extract')),
  endpoint_url TEXT NOT NULL,
  
  -- Request data
  request_payload JSONB NOT NULL,
  query_text TEXT,
  search_depth TEXT,
  max_results INTEGER,
  include_domains TEXT[],
  
  -- Response data
  response_payload JSONB,
  response_status INTEGER NOT NULL,
  results_count INTEGER DEFAULT 0,
  
  -- Performance & cost tracking
  request_duration_ms INTEGER,
  credits_used INTEGER DEFAULT 1,
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 2. OpenAI API call logging
CREATE TABLE IF NOT EXISTS public.openai_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID REFERENCES public.searches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- API call details
  function_name TEXT NOT NULL, -- 'company-research', 'cv-analysis', etc.
  model TEXT NOT NULL, -- 'gpt-4o', 'gpt-4o-mini'
  endpoint_url TEXT NOT NULL,
  
  -- Request data
  request_payload JSONB NOT NULL,
  
  -- Response data
  response_payload JSONB,
  response_status INTEGER NOT NULL,
  
  -- Cost tracking
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  
  -- Performance
  request_duration_ms INTEGER,
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3. Function execution logs (captures raw data from each function)
CREATE TABLE IF NOT EXISTS public.function_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID REFERENCES public.searches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Function details
  function_name TEXT NOT NULL,
  
  -- Raw inputs and outputs
  raw_inputs JSONB NOT NULL,
  raw_outputs JSONB, -- The complete raw data arrays
  processed_outputs JSONB, -- The final processed results
  
  -- Execution details
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  execution_time_ms INTEGER,
  error_message TEXT,
  
  -- References to related API calls
  tavily_call_ids UUID[] DEFAULT '{}',
  openai_call_ids UUID[] DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tavily_searches_search_id ON public.tavily_searches(search_id);
CREATE INDEX IF NOT EXISTS idx_tavily_searches_user_id ON public.tavily_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_tavily_searches_created_at ON public.tavily_searches(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_openai_calls_search_id ON public.openai_calls(search_id);
CREATE INDEX IF NOT EXISTS idx_openai_calls_function_name ON public.openai_calls(function_name);
CREATE INDEX IF NOT EXISTS idx_openai_calls_created_at ON public.openai_calls(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_function_executions_search_id ON public.function_executions(search_id);
CREATE INDEX IF NOT EXISTS idx_function_executions_function_name ON public.function_executions(function_name);
CREATE INDEX IF NOT EXISTS idx_function_executions_status ON public.function_executions(status);

-- 5. Enable RLS
ALTER TABLE public.tavily_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.openai_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.function_executions ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
-- Tavily searches
CREATE POLICY "Users can view their own Tavily searches" 
  ON public.tavily_searches FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage Tavily searches" 
  ON public.tavily_searches FOR ALL 
  USING (auth.uid() IS NULL);

-- OpenAI calls
CREATE POLICY "Users can view their own OpenAI calls" 
  ON public.openai_calls FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage OpenAI calls" 
  ON public.openai_calls FOR ALL 
  USING (auth.uid() IS NULL);

-- Function executions
CREATE POLICY "Users can view their own function executions" 
  ON public.function_executions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage function executions" 
  ON public.function_executions FOR ALL 
  USING (auth.uid() IS NULL);

-- 7. Utility function for cost calculation
CREATE OR REPLACE FUNCTION calculate_openai_cost(
  model TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER
) RETURNS NUMERIC AS $$
BEGIN
  -- Simplified cost calculation (can be updated with current pricing)
  CASE model
    WHEN 'gpt-4o' THEN 
      RETURN (prompt_tokens * 0.000015 + completion_tokens * 0.00006);
    WHEN 'gpt-4o-mini' THEN 
      RETURN (prompt_tokens * 0.00000015 + completion_tokens * 0.0000006);
    ELSE 
      RETURN 0;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 8. Comments for documentation
COMMENT ON TABLE public.tavily_searches IS 'Logs all Tavily API calls (search and extract) with full request/response data';
COMMENT ON TABLE public.openai_calls IS 'Logs all OpenAI API calls with token usage and cost tracking';
COMMENT ON TABLE public.function_executions IS 'Logs complete function executions with raw inputs/outputs for each microservice'; 
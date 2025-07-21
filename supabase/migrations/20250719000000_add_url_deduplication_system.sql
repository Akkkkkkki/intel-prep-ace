-- Migration: Add URL deduplication and research caching system
-- This enables intelligent URL reuse and content caching for similar research queries

-- Table for tracking all scraped URLs with metadata
CREATE TABLE public.scraped_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- URL information
  url TEXT NOT NULL,
  domain TEXT NOT NULL, -- Extracted domain for efficient filtering
  url_hash TEXT NOT NULL, -- Hash of URL for fast lookups
  
  -- Research context
  company_name TEXT NOT NULL,
  role_title TEXT, -- Can be NULL for general company research
  country TEXT,
  
  -- Content information
  title TEXT,
  content_summary TEXT, -- Brief summary of what was found
  content_type TEXT CHECK (content_type IN ('interview_review', 'company_info', 'job_posting', 'news', 'other')),
  content_quality_score FLOAT DEFAULT 0, -- 0-1 score based on relevance
  
  -- Source tracking
  tavily_search_id UUID REFERENCES public.tavily_searches(id) ON DELETE SET NULL,
  extraction_method TEXT CHECK (extraction_method IN ('search_result', 'deep_extract', 'manual')),
  
  -- Usage statistics
  times_reused INTEGER DEFAULT 0,
  last_reused_at TIMESTAMP WITH TIME ZONE,
  
  -- Content freshness
  first_scraped_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  last_validated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  content_staleness_days INTEGER DEFAULT 0, -- How many days old the content is
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Ensure no duplicate URLs per company/role combination  
  CONSTRAINT unique_url_per_company_role UNIQUE(url_hash, company_name, role_title)
);

-- Table for storing the actual content extracted from URLs
CREATE TABLE public.scraped_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scraped_url_id UUID REFERENCES public.scraped_urls(id) ON DELETE CASCADE NOT NULL,
  
  -- Raw content
  full_content TEXT, -- Complete extracted content
  raw_html TEXT, -- Original HTML if available
  
  -- Processed content
  structured_data JSONB, -- Parsed interview data, company info, etc.
  extracted_questions TEXT[], -- Questions found in the content
  extracted_insights TEXT[], -- Key insights from the content
  
  -- Content metadata
  word_count INTEGER DEFAULT 0,
  language TEXT DEFAULT 'en',
  content_source TEXT, -- 'tavily_search', 'tavily_extract', etc.
  
  -- Processing status
  processing_status TEXT DEFAULT 'raw' CHECK (processing_status IN ('raw', 'processed', 'analyzed', 'failed')),
  ai_summary TEXT, -- AI-generated summary of the content
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Table for mapping searches to reused content (tracks what content was used for each search)
CREATE TABLE public.search_content_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID REFERENCES public.searches(id) ON DELETE CASCADE NOT NULL,
  scraped_url_id UUID REFERENCES public.scraped_urls(id) ON DELETE CASCADE NOT NULL,
  
  -- Usage context
  usage_type TEXT CHECK (usage_type IN ('reused', 'fresh_scrape', 'validation')) NOT NULL,
  relevance_score FLOAT DEFAULT 0, -- How relevant this content was to the search
  contributed_to_analysis BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Ensure we track each URL usage per search
  UNIQUE(search_id, scraped_url_id)
);

-- Table for caching research results to avoid re-analysis
CREATE TABLE public.research_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Cache key information
  cache_key TEXT NOT NULL, -- Hash of company + role + country combination
  company_name TEXT NOT NULL,
  role_title TEXT,
  country TEXT,
  
  -- Cached research data
  company_insights JSONB NOT NULL, -- Processed company analysis
  raw_search_data JSONB, -- Original search results for reference
  source_urls TEXT[], -- URLs that contributed to this analysis
  
  -- Cache metadata
  cache_freshness_hours INTEGER DEFAULT 0, -- How many hours old this cache is
  confidence_score FLOAT DEFAULT 0, -- 0-1 score for cache reliability
  content_version INTEGER DEFAULT 1, -- Version for cache invalidation
  
  -- Usage tracking
  cache_hits INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Ensure one cache entry per unique company/role/country combo
  UNIQUE(cache_key)
);

-- Indexes for efficient querying
CREATE INDEX idx_scraped_urls_company_role ON public.scraped_urls(company_name, role_title);
CREATE INDEX idx_scraped_urls_domain ON public.scraped_urls(domain);
CREATE INDEX idx_scraped_urls_hash ON public.scraped_urls(url_hash);
CREATE INDEX idx_scraped_urls_content_type ON public.scraped_urls(content_type);
CREATE INDEX idx_scraped_urls_quality ON public.scraped_urls(content_quality_score DESC);
CREATE INDEX idx_scraped_urls_freshness ON public.scraped_urls(first_scraped_at DESC);

CREATE INDEX idx_scraped_content_url_id ON public.scraped_content(scraped_url_id);
CREATE INDEX idx_scraped_content_status ON public.scraped_content(processing_status);
CREATE INDEX idx_scraped_content_word_count ON public.scraped_content(word_count DESC);

CREATE INDEX idx_search_content_usage_search_id ON public.search_content_usage(search_id);
CREATE INDEX idx_search_content_usage_url_id ON public.search_content_usage(scraped_url_id);
CREATE INDEX idx_search_content_usage_relevance ON public.search_content_usage(relevance_score DESC);

CREATE INDEX idx_research_cache_key ON public.research_cache(cache_key);
CREATE INDEX idx_research_cache_company ON public.research_cache(company_name, role_title);
CREATE INDEX idx_research_cache_freshness ON public.research_cache(cache_freshness_hours);
CREATE INDEX idx_research_cache_accessed ON public.research_cache(last_accessed_at DESC);

-- Full-text search indexes
CREATE INDEX idx_scraped_content_fulltext ON public.scraped_content USING gin(to_tsvector('english', full_content));
CREATE INDEX idx_scraped_urls_title_search ON public.scraped_urls USING gin(to_tsvector('english', title));

-- Enable Row Level Security
ALTER TABLE public.scraped_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraped_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_content_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scraped_urls
CREATE POLICY "Service role can manage scraped URLs" 
  ON public.scraped_urls 
  FOR ALL 
  USING (auth.uid() IS NULL);

CREATE POLICY "Users can view scraped URLs through their searches" 
  ON public.scraped_urls 
  FOR SELECT 
  USING (
    id IN (
      SELECT scu.scraped_url_id 
      FROM public.search_content_usage scu
      JOIN public.searches s ON scu.search_id = s.id
      WHERE s.user_id = auth.uid()
    )
  );

-- RLS Policies for scraped_content
CREATE POLICY "Service role can manage scraped content" 
  ON public.scraped_content 
  FOR ALL 
  USING (auth.uid() IS NULL);

CREATE POLICY "Users can view content for their searches" 
  ON public.scraped_content 
  FOR SELECT 
  USING (
    scraped_url_id IN (
      SELECT scu.scraped_url_id 
      FROM public.search_content_usage scu
      JOIN public.searches s ON scu.search_id = s.id
      WHERE s.user_id = auth.uid()
    )
  );

-- RLS Policies for search_content_usage
CREATE POLICY "Users can view their search content usage" 
  ON public.search_content_usage 
  FOR SELECT 
  USING (
    search_id IN (
      SELECT id FROM public.searches WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage search content usage" 
  ON public.search_content_usage 
  FOR ALL 
  USING (auth.uid() IS NULL);

-- RLS Policies for research_cache (generally accessible since it's anonymized)
CREATE POLICY "Research cache is publicly readable" 
  ON public.research_cache 
  FOR SELECT 
  USING (true);

CREATE POLICY "Service role can manage research cache" 
  ON public.research_cache 
  FOR ALL 
  USING (auth.uid() IS NULL);

-- Function to generate cache key for company/role/country combinations
CREATE OR REPLACE FUNCTION generate_cache_key(
  p_company TEXT,
  p_role TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(sha256(
    (LOWER(TRIM(p_company)) || '|' || 
     COALESCE(LOWER(TRIM(p_role)), '') || '|' || 
     COALESCE(LOWER(TRIM(p_country)), ''))::bytea
  ), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to find previously scraped URLs for similar searches
CREATE OR REPLACE FUNCTION find_reusable_urls(
  p_company TEXT,
  p_role TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL,
  p_max_age_days INTEGER DEFAULT 30,
  p_min_quality_score FLOAT DEFAULT 0.3
)
RETURNS TABLE(
  url TEXT,
  domain TEXT,
  title TEXT,
  content_type TEXT,
  content_quality_score FLOAT,
  times_reused INTEGER,
  days_old INTEGER,
  has_content BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    su.url,
    su.domain,
    su.title,
    su.content_type,
    su.content_quality_score,
    su.times_reused,
    EXTRACT(days FROM (now() - su.first_scraped_at))::INTEGER as days_old,
    EXISTS(SELECT 1 FROM public.scraped_content sc WHERE sc.scraped_url_id = su.id) as has_content
  FROM public.scraped_urls su
  WHERE 
    su.company_name = p_company
    AND (p_role IS NULL OR su.role_title = p_role OR su.role_title IS NULL)
    AND (p_country IS NULL OR su.country = p_country OR su.country IS NULL)
    AND su.content_quality_score >= p_min_quality_score
    AND su.first_scraped_at > (now() - INTERVAL '1 day' * p_max_age_days)
  ORDER BY 
    su.content_quality_score DESC, 
    su.times_reused DESC,
    su.first_scraped_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get cached research results
CREATE OR REPLACE FUNCTION get_cached_research(
  p_company TEXT,
  p_role TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL,
  p_max_age_hours INTEGER DEFAULT 48
)
RETURNS TABLE(
  id UUID,
  company_insights JSONB,
  raw_search_data JSONB,
  source_urls TEXT[],
  cache_freshness_hours INTEGER,
  confidence_score FLOAT,
  cache_hits INTEGER
) AS $$
DECLARE
  cache_key_val TEXT;
BEGIN
  cache_key_val := generate_cache_key(p_company, p_role, p_country);
  
  RETURN QUERY
  SELECT 
    rc.id,
    rc.company_insights,
    rc.raw_search_data,
    rc.source_urls,
    rc.cache_freshness_hours,
    rc.confidence_score,
    rc.cache_hits
  FROM public.research_cache rc
  WHERE 
    rc.cache_key = cache_key_val
    AND rc.cache_freshness_hours <= p_max_age_hours
  ORDER BY rc.confidence_score DESC, rc.last_accessed_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update URL reuse statistics
CREATE OR REPLACE FUNCTION increment_url_reuse(p_url_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.scraped_urls 
  SET 
    times_reused = times_reused + 1,
    last_reused_at = now(),
    updated_at = now()
  WHERE id = p_url_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update cache access statistics  
CREATE OR REPLACE FUNCTION increment_cache_access(p_cache_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.research_cache 
  SET 
    cache_hits = cache_hits + 1,
    last_accessed_at = now(),
    updated_at = now()
  WHERE id = p_cache_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get excluded domains for a search (based on previously scraped URLs)
CREATE OR REPLACE FUNCTION get_excluded_domains_for_search(
  p_company TEXT,
  p_role TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL,
  p_min_reuse_count INTEGER DEFAULT 2
)
RETURNS TEXT[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT DISTINCT su.domain
    FROM public.scraped_urls su
    WHERE 
      su.company_name = p_company
      AND (p_role IS NULL OR su.role_title = p_role OR su.role_title IS NULL)
      AND (p_country IS NULL OR su.country = p_country OR su.country IS NULL)
      AND su.times_reused >= p_min_reuse_count
      AND su.content_quality_score < 0.5 -- Only exclude low-quality domains
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_scraped_urls_updated_at
  BEFORE UPDATE ON public.scraped_urls
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scraped_content_updated_at
  BEFORE UPDATE ON public.scraped_content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_research_cache_updated_at
  BEFORE UPDATE ON public.research_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically calculate URL hash
CREATE OR REPLACE FUNCTION calculate_url_hash()
RETURNS TRIGGER AS $$
BEGIN
  NEW.url_hash := encode(sha256(NEW.url::bytea), 'hex');
  NEW.domain := CASE 
    WHEN NEW.url ~ '^https?://([^/]+)' THEN 
      substring(NEW.url from '^https?://([^/]+)')
    ELSE 
      'unknown'
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_url_hash_trigger
  BEFORE INSERT OR UPDATE ON public.scraped_urls
  FOR EACH ROW
  EXECUTE FUNCTION calculate_url_hash();

-- Trigger to calculate content freshness
CREATE OR REPLACE FUNCTION update_content_staleness()
RETURNS TRIGGER AS $$
BEGIN
  NEW.content_staleness_days := EXTRACT(days FROM (now() - NEW.first_scraped_at))::INTEGER;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_content_staleness_trigger
  BEFORE UPDATE ON public.scraped_urls
  FOR EACH ROW
  EXECUTE FUNCTION update_content_staleness();

-- Function to clean up old cached data (maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_cache_data(
  p_max_age_days INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
  rows_deleted INTEGER := 0;
BEGIN
  -- Delete old research cache entries
  DELETE FROM public.research_cache 
  WHERE created_at < (now() - INTERVAL '1 day' * p_max_age_days)
  AND cache_hits < 5; -- Keep frequently accessed caches longer
  
  GET DIAGNOSTICS rows_deleted = ROW_COUNT;
  
  -- Update staleness for remaining URLs
  UPDATE public.scraped_urls 
  SET content_staleness_days = EXTRACT(days FROM (now() - first_scraped_at))::INTEGER;
  
  RETURN rows_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
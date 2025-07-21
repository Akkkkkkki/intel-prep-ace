// URL Deduplication and Content Management System
// Handles intelligent URL reuse and content caching for research optimization

export interface ScrapedUrl {
  id?: string;
  url: string;
  domain: string;
  url_hash: string;
  company_name: string;
  role_title?: string;
  country?: string;
  title?: string;
  content_summary?: string;
  content_type: 'interview_review' | 'company_info' | 'job_posting' | 'news' | 'other';
  content_quality_score: number;
  extraction_method: 'search_result' | 'deep_extract' | 'manual';
  times_reused: number;
  first_scraped_at: string;
  last_reused_at?: string;
}

export interface ScrapedContent {
  id?: string;
  scraped_url_id: string;
  full_content: string;
  raw_html?: string;
  structured_data?: any;
  extracted_questions?: string[];
  extracted_insights?: string[];
  word_count: number;
  language: string;
  content_source: string;
  processing_status: 'raw' | 'processed' | 'analyzed' | 'failed';
  ai_summary?: string;
}

export interface ResearchCache {
  id?: string;
  cache_key: string;
  company_name: string;
  role_title?: string;
  country?: string;
  company_insights: any;
  raw_search_data?: any;
  source_urls: string[];
  cache_freshness_hours: number;
  confidence_score: number;
  cache_hits: number;
}

export interface UrlDeduplicationResult {
  reusable_urls: string[];
  excluded_domains: string[];
  cached_research?: ResearchCache;
  total_cached_urls: number;
}

// URL and Content Management Class
export class UrlDeduplicationService {
  constructor(private supabase: any) {}

  // Store a scraped URL with metadata
  async storeScrapedUrl(
    url: string,
    company: string,
    role?: string,
    country?: string,
    metadata: {
      title?: string;
      content_summary?: string;
      content_type: ScrapedUrl['content_type'];
      quality_score: number;
      extraction_method: ScrapedUrl['extraction_method'];
      tavily_search_id?: string;
    }
  ): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('scraped_urls')
        .insert({
          url,
          company_name: company,
          role_title: role,
          country: country,
          title: metadata.title,
          content_summary: metadata.content_summary,
          content_type: metadata.content_type,
          content_quality_score: metadata.quality_score,
          extraction_method: metadata.extraction_method,
          tavily_search_id: metadata.tavily_search_id,
          times_reused: 0
        })
        .select('id')
        .single();

      if (error) {
        // Handle duplicate URL case
        if (error.code === '23505') {
          console.log(`URL already exists: ${url}`);
          return null;
        }
        throw error;
      }

      return data.id;
    } catch (error) {
      console.error('Error storing scraped URL:', error);
      return null;
    }
  }

  // Store content extracted from a URL
  async storeScrapedContent(
    scrapedUrlId: string,
    content: {
      full_content: string;
      raw_html?: string;
      structured_data?: any;
      extracted_questions?: string[];
      extracted_insights?: string[];
      content_source: string;
      ai_summary?: string;
    }
  ): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('scraped_content')
        .insert({
          scraped_url_id: scrapedUrlId,
          full_content: content.full_content,
          raw_html: content.raw_html,
          structured_data: content.structured_data,
          extracted_questions: content.extracted_questions,
          extracted_insights: content.extracted_insights,
          word_count: content.full_content.length,
          language: 'en', // Could be detected
          content_source: content.content_source,
          processing_status: 'raw',
          ai_summary: content.ai_summary
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error storing scraped content:', error);
      return null;
    }
  }

  // Find reusable URLs for a given company/role/country combination
  async findReusableUrls(
    company: string,
    role?: string,
    country?: string,
    options: {
      maxAgeDays?: number;
      minQualityScore?: number;
      limit?: number;
    } = {}
  ): Promise<UrlDeduplicationResult> {
    const { maxAgeDays = 30, minQualityScore = 0.3, limit = 20 } = options;
    const startTime = Date.now();

    try {
      // Use the new optimized function with strict timeout
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 5000)
      );

      const urlsPromise = this.supabase.rpc('find_reusable_urls_fast', {
        p_company: company,
        p_role: role,
        p_country: country,
        p_max_age_days: maxAgeDays,
        p_min_quality_score: minQualityScore
      });

      const { data: reusableUrls, error: urlsError } = await Promise.race([
        urlsPromise,
        timeoutPromise
      ]);

      if (urlsError) {
        console.warn('URL deduplication failed, using fallback:', urlsError.message);
        return {
          reusable_urls: [],
          excluded_domains: [],
          total_cached_urls: 0
        };
      }

      const responseTime = Date.now() - startTime;
      const urls = reusableUrls?.map((item: any) => item.url)?.slice(0, limit) || [];
      
      // Log performance metrics
      console.log(`URL deduplication completed in ${responseTime}ms, found ${urls.length} reusable URLs`);
      
      // Track metrics for monitoring
      this.trackDeduplicationMetrics({
        cache_hit_count: urls.length,
        total_urls_needed: limit,
        response_time_ms: responseTime,
        api_calls_saved: Math.floor(urls.length * 0.8) // Estimate API savings
      }).catch(err => console.warn('Failed to track metrics:', err));

      return {
        reusable_urls: urls,
        excluded_domains: [], // Simplified for performance
        total_cached_urls: urls.length
      };
    } catch (error) {
      console.warn('URL deduplication failed, using fallback:', error.message);
      return {
        reusable_urls: [],
        excluded_domains: [],
        total_cached_urls: 0
      };
    }
  }

  // Store research results in cache
  async cacheResearchResults(
    company: string,
    role: string | undefined,
    country: string | undefined,
    companyInsights: any,
    rawSearchData: any,
    sourceUrls: string[],
    confidenceScore: number = 0.8
  ): Promise<string | null> {
    try {
      // Generate cache key
      const cacheKey = await this.generateCacheKey(company, role, country);
      
      const { data, error } = await this.supabase
        .from('research_cache')
        .upsert({
          cache_key: cacheKey,
          company_name: company,
          role_title: role,
          country: country,
          company_insights: companyInsights,
          raw_search_data: rawSearchData,
          source_urls: sourceUrls,
          cache_freshness_hours: 0,
          confidence_score: confidenceScore,
          cache_hits: 0
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error caching research results:', error);
      return null;
    }
  }

  // Track URL usage for a search
  async trackUrlUsage(
    searchId: string,
    scrapedUrlId: string,
    usageType: 'reused' | 'fresh_scrape' | 'validation',
    relevanceScore: number = 0.5
  ): Promise<void> {
    try {
      // Record the usage
      await this.supabase
        .from('search_content_usage')
        .insert({
          search_id: searchId,
          scraped_url_id: scrapedUrlId,
          usage_type: usageType,
          relevance_score: relevanceScore,
          contributed_to_analysis: true
        });

      // Increment reuse counter if this is a reuse
      if (usageType === 'reused') {
        await this.supabase
          .rpc('increment_url_reuse', { p_url_id: scrapedUrlId });
      }
    } catch (error) {
      console.error('Error tracking URL usage:', error);
    }
  }

  // Get content for previously scraped URLs
  async getExistingContent(
    urls: string[],
    company: string,
    role?: string,
    country?: string
  ): Promise<{ url: string; content: ScrapedContent; metadata: ScrapedUrl }[]> {
    try {
      // Add safeguards to prevent infinite calls
      if (!urls || urls.length === 0) {
        return [];
      }
      
      // Limit to prevent excessive queries
      const limitedUrls = urls.slice(0, 50);
      
      const { data, error } = await this.supabase
        .from('scraped_urls')
        .select(`
          *,
          scraped_content (*)
        `)
        .in('url', limitedUrls)
        .eq('company_name', company)
        .limit(20); // Further limit results

      if (error) {
        console.warn('Error getting existing content:', error);
        return [];
      }

      return (data || [])
        .filter((item: any) => item.scraped_content && item.scraped_content.length > 0)
        .map((item: any) => ({
          url: item.url,
          content: item.scraped_content[0],
          metadata: item
        }));
    } catch (error) {
      console.error('Error getting existing content:', error);
      return [];
    }
  }

  // Assess content quality based on various factors
  assessContentQuality(
    content: string,
    title: string,
    url: string,
    contentType: ScrapedUrl['content_type']
  ): number {
    let score = 0.5; // Base score

    // Content length factor
    const wordCount = content.split(/\s+/).length;
    if (wordCount > 500) score += 0.2;
    if (wordCount > 1000) score += 0.1;
    if (wordCount < 100) score -= 0.2;

    // Content type factor
    switch (contentType) {
      case 'interview_review':
        score += 0.3;
        break;
      case 'company_info':
        score += 0.2;
        break;
      case 'job_posting':
        score += 0.1;
        break;
      default:
        score += 0.0;
    }

    // URL quality indicators
    if (url.includes('glassdoor') || url.includes('blind') || url.includes('leetcode')) {
      score += 0.2;
    }
    if (url.includes('1point3acres') || url.includes('reddit.com/r/')) {
      score += 0.15;
    }

    // Title quality indicators
    const titleLower = title.toLowerCase();
    if (titleLower.includes('interview') || titleLower.includes('experience')) {
      score += 0.1;
    }
    if (titleLower.includes('question') || titleLower.includes('review')) {
      score += 0.1;
    }

    // Content quality indicators
    const contentLower = content.toLowerCase();
    if (contentLower.includes('interview process') || contentLower.includes('interviewer asked')) {
      score += 0.1;
    }
    if (contentLower.includes('question') && contentLower.includes('answer')) {
      score += 0.1;
    }

    // Ensure score is between 0 and 1
    return Math.max(0, Math.min(1, score));
  }

  // Generate cache key for company/role/country combination
  private async generateCacheKey(company: string, role?: string, country?: string): Promise<string> {
    const { data, error } = await this.supabase
      .rpc('generate_cache_key', {
        p_company: company,
        p_role: role,
        p_country: country
      });

    if (error) {
      console.error('Error generating cache key:', error);
      // Fallback to simple concatenation
      return btoa(`${company}|${role || ''}|${country || ''}`).replace(/[^a-zA-Z0-9]/g, '');
    }

    return data;
  }

  // Classify content type based on URL and content
  classifyContentType(url: string, title: string, content: string): ScrapedUrl['content_type'] {
    const urlLower = url.toLowerCase();
    const titleLower = title.toLowerCase();
    const contentLower = content.toLowerCase();

    // Interview review sites
    if (urlLower.includes('glassdoor') || urlLower.includes('blind') || 
        urlLower.includes('1point3acres') || urlLower.includes('leetcode')) {
      if (titleLower.includes('interview') || contentLower.includes('interview experience')) {
        return 'interview_review';
      }
    }

    // Job posting indicators
    if (urlLower.includes('jobs') || urlLower.includes('careers') || 
        titleLower.includes('job') || titleLower.includes('position')) {
      return 'job_posting';
    }

    // News/blog content
    if (urlLower.includes('blog') || urlLower.includes('news') || 
        urlLower.includes('medium') || urlLower.includes('linkedin')) {
      return 'news';
    }

    // Company info
    if (contentLower.includes('company culture') || contentLower.includes('about us') ||
        titleLower.includes('company') || titleLower.includes('culture')) {
      return 'company_info';
    }

    // Interview-related content
    if (titleLower.includes('interview') || contentLower.includes('interview process')) {
      return 'interview_review';
    }

    return 'other';
  }

  // Extract questions from content using simple pattern matching
  extractQuestions(content: string): string[] {
    const questions: string[] = [];
    
    // Look for common question patterns
    const questionPatterns = [
      /(?:Q\d*[:\.]?\s*|Question\s*\d*[:\.]?\s*)(.*?\?)/gi,
      /(?:They asked|Asked|Question was|The question)[:\s]+(.*?\?)/gi,
      /(?:^|\n)\s*\d+\.\s*(.*?\?)/gm,
      /(?:Interview question|Question)[:\s]+(.*?\?)/gi
    ];

    questionPatterns.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].trim().length > 10) {
          questions.push(match[1].trim());
        }
      }
    });

    // Remove duplicates and filter out very short or very long questions
    const uniqueQuestions = Array.from(new Set(questions))
      .filter(q => q.length > 10 && q.length < 500)
      .slice(0, 20); // Limit to 20 questions per content

    return uniqueQuestions;
  }

  // Extract key insights from content
  extractInsights(content: string): string[] {
    const insights: string[] = [];
    
    // Look for insight patterns
    const insightPatterns = [
      /(?:Key insight|Important|Note|Tip|Advice)[:\s]+(.*?)(?:\.|$)/gi,
      /(?:What I learned|Takeaway|Key point)[:\s]+(.*?)(?:\.|$)/gi,
      /(?:Pro tip|Remember|Important to note)[:\s]+(.*?)(?:\.|$)/gi
    ];

    insightPatterns.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].trim().length > 15) {
          insights.push(match[1].trim());
        }
      }
    });

    // Remove duplicates and limit
    const uniqueInsights = Array.from(new Set(insights))
      .filter(insight => insight.length > 15 && insight.length < 300)
      .slice(0, 10);

    return uniqueInsights;
  }

  // Get cached content using simplified function
  async getCachedContent(urls: string[]): Promise<Array<{ url: string; content: string; title: string }>> {
    if (!urls || urls.length === 0) return [];
    
    try {
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Content timeout')), 3000)
      );

      const contentPromise = this.supabase.rpc('get_cached_content_simple', {
        p_urls: urls.slice(0, 20) // Limit URLs to prevent timeouts
      });

      const { data, error } = await Promise.race([contentPromise, timeoutPromise]);
      
      if (error) {
        console.warn('Failed to get cached content:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.warn('Cached content retrieval failed:', error.message);
      return [];
    }
  }

  // Track deduplication performance metrics
  private async trackDeduplicationMetrics(metrics: {
    cache_hit_count: number;
    total_urls_needed: number;
    response_time_ms: number;
    api_calls_saved: number;
  }): Promise<void> {
    try {
      await this.supabase.from('url_deduplication_metrics').insert({
        cache_hit_count: metrics.cache_hit_count,
        total_urls_needed: metrics.total_urls_needed,
        response_time_ms: metrics.response_time_ms,
        api_calls_saved: metrics.api_calls_saved
      });
    } catch (error) {
      // Silently fail metrics tracking to not impact main flow
    }
  }

  // Clean up old cached data (maintenance function)
  async cleanupOldData(maxAgeDays: number = 90): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .rpc('cleanup_old_cache_data', { p_max_age_days: maxAgeDays });

      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Error cleaning up old data:', error);
      return 0;
    }
  }
}
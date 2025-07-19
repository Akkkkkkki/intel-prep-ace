// Shared Tavily client utility for consistent API interactions
import { RESEARCH_CONFIG } from "./config.ts";

export interface TavilySearchRequest {
  query: string;
  searchDepth?: 'basic' | 'advanced';
  maxResults?: number;
  includeAnswer?: boolean;
  includeRawContent?: boolean;
  includeDomains?: string[];
  timeRange?: 'day' | 'week' | 'month' | 'year';
}

export interface TavilyExtractRequest {
  urls: string[];
}

export interface TavilySearchResult {
  query: string;
  answer?: string;
  results: Array<{
    title: string;
    url: string;
    content: string;
    raw_content?: string;
    score: number;
    published_date?: string;
  }>;
}

export interface TavilyExtractResult {
  url: string;
  content: string;
  raw_content: string;
  status_code: number;
}

// Tavily Search API
export async function searchTavily(
  apiKey: string,
  request: TavilySearchRequest,
  searchId?: string,
  userId?: string,
  supabase?: any
): Promise<TavilySearchResult | null> {
  const startTime = Date.now();
  const endpoint = 'https://api.tavily.com/search';
  
  const requestPayload = {
    query: request.query,
    search_depth: request.searchDepth || 'advanced',
    max_results: request.maxResults || 15,
    include_answer: request.includeAnswer !== false,
    include_raw_content: request.includeRawContent !== false,
    include_domains: request.includeDomains,
    time_range: request.timeRange
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestPayload),
    });

    const duration = Date.now() - startTime;
    const responseData = response.ok ? await response.json() : null;
    const resultsCount = responseData?.results?.length || 0;

    // Log to database if supabase client is available
    if (supabase && searchId && userId) {
      try {
        await supabase
          .from("tavily_searches")
          .insert({
            search_id: searchId,
            user_id: userId,
            api_type: 'search',
            endpoint_url: endpoint,
            request_payload: requestPayload,
            query_text: request.query,
            search_depth: request.searchDepth || 'advanced',
            max_results: request.maxResults || 15,
            include_domains: request.includeDomains,
            response_payload: responseData,
            response_status: response.status,
            results_count: resultsCount,
            request_duration_ms: duration,
            credits_used: 1, // Basic search = 1 credit
            error_message: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`
          });
      } catch (logError) {
        console.error("Failed to log Tavily search:", logError);
      }
    }

    if (response.ok) {
      return responseData;
    }
    return null;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Log error to database if supabase client is available
    if (supabase && searchId && userId) {
      try {
        await supabase
          .from("tavily_searches")
          .insert({
            search_id: searchId,
            user_id: userId,
            api_type: 'search',
            endpoint_url: endpoint,
            request_payload: requestPayload,
            query_text: request.query,
            search_depth: request.searchDepth || 'advanced',
            max_results: request.maxResults || 15,
            include_domains: request.includeDomains,
            response_payload: null,
            response_status: 0,
            results_count: 0,
            request_duration_ms: duration,
            credits_used: 0,
            error_message: (error as Error).message || "Network/API error"
          });
      } catch (logError) {
        console.error("Failed to log Tavily error:", logError);
      }
    }
    
    console.error("Error in Tavily search:", error);
    return null;
  }
}

// Tavily Extract API for deep content extraction
export async function extractTavily(
  apiKey: string,
  request: TavilyExtractRequest,
  searchId?: string,
  userId?: string,
  supabase?: any
): Promise<TavilyExtractResult[]> {
  const startTime = Date.now();
  const endpoint = 'https://api.tavily.com/extract';
  
  const requestPayload = {
    urls: request.urls
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestPayload),
    });

    const duration = Date.now() - startTime;
    const responseData = response.ok ? await response.json() : null;
    const resultsCount = responseData?.results?.length || 0;

    // Log to database if supabase client is available
    if (supabase && searchId && userId) {
      try {
        await supabase
          .from("tavily_searches")
          .insert({
            search_id: searchId,
            user_id: userId,
            api_type: 'extract',
            endpoint_url: endpoint,
            request_payload: requestPayload,
            query_text: `Extract ${request.urls.length} URLs`,
            search_depth: 'advanced',
            max_results: request.urls.length,
            include_domains: [],
            response_payload: responseData,
            response_status: response.status,
            results_count: resultsCount,
            request_duration_ms: duration,
            credits_used: request.urls.length, // Extract = 1 credit per URL
            error_message: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`
          });
      } catch (logError) {
        console.error("Failed to log Tavily extract:", logError);
      }
    }

    if (response.ok) {
      return responseData.results || [];
    }
    return [];
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Log error to database if supabase client is available
    if (supabase && searchId && userId) {
      try {
        await supabase
          .from("tavily_searches")
          .insert({
            search_id: searchId,
            user_id: userId,
            api_type: 'extract',
            endpoint_url: endpoint,
            request_payload: requestPayload,
            query_text: `Extract ${request.urls.length} URLs`,
            search_depth: 'advanced',
            max_results: request.urls.length,
            include_domains: [],
            response_payload: null,
            response_status: 0,
            results_count: 0,
            request_duration_ms: duration,
            credits_used: 0,
            error_message: (error as Error).message || "Network/API error"
          });
      } catch (logError) {
        console.error("Failed to log Tavily error:", logError);
      }
    }
    
    console.error("Error in Tavily extract:", error);
    return [];
  }
}

// Helper function to extract URLs from search results for further processing
export function extractInterviewReviewUrls(searchResults: TavilySearchResult[]): string[] {
  const urls: string[] = [];
  
  searchResults.forEach(result => {
    if (result.results) {
      result.results.forEach(item => {
        // Use configured patterns to identify interview content
        const isInterviewUrl = RESEARCH_CONFIG.content.interviewUrlPatterns.some(pattern => 
          item.url.includes(pattern) || 
          item.title.toLowerCase().includes(pattern.toLowerCase()) ||
          item.content.toLowerCase().includes(pattern.toLowerCase())
        );
        
        if (isInterviewUrl) {
          urls.push(item.url);
        }
      });
    }
  });
  
  // Remove duplicates and limit by configuration
  return Array.from(new Set(urls)).slice(0, RESEARCH_CONFIG.tavily.maxResults.extraction);
}
// Tavily Analytics Service - Monitor API usage, costs, and performance
import { supabase } from "@/integrations/supabase/client";

export interface TavilySearchRecord {
  id: string;
  search_id: string;
  api_type: 'search' | 'extract';
  query_text: string;
  search_depth: string;
  results_count: number;
  request_duration_ms: number;
  credits_used: number;
  response_status: number;
  error_message?: string;
  created_at: string;
}

export interface TavilyUsageStats {
  id: string;
  date: string;
  total_searches: number;
  total_extracts: number;
  total_credits_used: number;
  total_results_returned: number;
  avg_response_time_ms: number;
  success_rate: number;
  companies_researched: string[];
  unique_companies_count: number;
}

export interface TavilyAnalytics {
  totalCreditsUsed: number;
  totalSearches: number;
  totalExtracts: number;
  averageResponseTime: number;
  successRate: number;
  dailyUsage: TavilyUsageStats[];
  recentSearches: TavilySearchRecord[];
  topCompanies: { company: string; searches: number }[];
  errorBreakdown: { error: string; count: number }[];
}

export const tavilyAnalyticsService = {
  // Get user's Tavily usage analytics
  async getUserAnalytics(days: number = 30): Promise<{ analytics?: TavilyAnalytics; success: boolean; error?: any }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error("No authenticated user");
      }

      // Get recent searches
      const { data: recentSearches, error: searchesError } = await supabase
        .from("tavily_searches")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(50);

      if (searchesError) throw searchesError;

      // Note: tavily_usage_stats table was removed in optimization
      // Using empty array for dailyStats since we now use simplified logging
      const dailyStats: any[] = [];

      // Calculate aggregated analytics
      const totalCreditsUsed = recentSearches?.reduce((sum, search) => sum + (search.credits_used || 0), 0) || 0;
      const totalSearches = recentSearches?.filter(s => s.api_type === 'search').length || 0;
      const totalExtracts = recentSearches?.filter(s => s.api_type === 'extract').length || 0;
      
      const successfulSearches = recentSearches?.filter(s => s.response_status === 200) || [];
      const averageResponseTime = successfulSearches.length > 0 
        ? successfulSearches.reduce((sum, s) => sum + (s.request_duration_ms || 0), 0) / successfulSearches.length 
        : 0;
      
      const successRate = recentSearches?.length 
        ? (successfulSearches.length / recentSearches.length) * 100 
        : 0;

      // Get company frequency
      const companyMap = new Map<string, number>();
      await Promise.all(
        (recentSearches || []).map(async (search) => {
          if (search.search_id) {
            const { data: searchData } = await supabase
              .from("searches")
              .select("company")
              .eq("id", search.search_id)
              .single();
            
            if (searchData?.company) {
              companyMap.set(searchData.company, (companyMap.get(searchData.company) || 0) + 1);
            }
          }
        })
      );

      const topCompanies = Array.from(companyMap.entries())
        .map(([company, searches]) => ({ company, searches }))
        .sort((a, b) => b.searches - a.searches)
        .slice(0, 10);

      // Error breakdown
      const errorMap = new Map<string, number>();
      recentSearches?.forEach(search => {
        if (search.error_message) {
          const error = search.error_message.substring(0, 50) + '...';
          errorMap.set(error, (errorMap.get(error) || 0) + 1);
        }
      });

      const errorBreakdown = Array.from(errorMap.entries())
        .map(([error, count]) => ({ error, count }))
        .sort((a, b) => b.count - a.count);

      const analytics: TavilyAnalytics = {
        totalCreditsUsed,
        totalSearches,
        totalExtracts,
        averageResponseTime: Math.round(averageResponseTime),
        successRate: Math.round(successRate * 100) / 100,
        dailyUsage: dailyStats || [],
        recentSearches: recentSearches || [],
        topCompanies,
        errorBreakdown
      };

      return { analytics, success: true };
    } catch (error) {
      console.error("Error fetching Tavily analytics:", error);
      return { error, success: false };
    }
  },

  // Get usage for a specific search
  async getSearchUsage(searchId: string): Promise<{ searches?: TavilySearchRecord[]; success: boolean; error?: any }> {
    try {
      const { data: searches, error } = await supabase
        .from("tavily_searches")
        .select("*")
        .eq("search_id", searchId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      return { searches: searches || [], success: true };
    } catch (error) {
      console.error("Error fetching search usage:", error);
      return { error, success: false };
    }
  },

  // Check for similar previous searches (for caching)
  async findSimilarSearch(
    queryText: string, 
    apiType: 'search' | 'extract', 
    searchDepth: string = 'basic',
    hoursThreshold: number = 24
  ): Promise<{ search?: TavilySearchRecord; success: boolean; error?: any }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error("No authenticated user");
      }

      // Simple query to find similar searches (function was removed in optimization)
      const { data, error } = await supabase
        .from("tavily_searches")
        .select("*")
        .eq("user_id", user.id)
        .eq("query_text", queryText)
        .eq("api_type", apiType)
        .eq("response_status", 200)
        .gte("created_at", new Date(Date.now() - hoursThreshold * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found

      return { search: data || null, success: true };
    } catch (error) {
      console.error("Error finding similar search:", error);
      return { error, success: false };
    }
  },

  // Get cost estimation
  getCostEstimate(analytics: TavilyAnalytics): { estimatedCost: number; breakdown: any } {
    // Tavily pricing: Basic search = 1 credit, Advanced extract = 2 credits per 5 URLs
    // Assume $0.005 per credit (adjust based on actual pricing)
    const creditCost = 0.005;
    const estimatedCost = analytics.totalCreditsUsed * creditCost;

    const breakdown = {
      totalCredits: analytics.totalCreditsUsed,
      estimatedCost: Math.round(estimatedCost * 100) / 100,
      searches: analytics.totalSearches,
      extracts: analytics.totalExtracts,
      avgCostPerSearch: analytics.totalSearches > 0 
        ? Math.round((estimatedCost / analytics.totalSearches) * 100) / 100 
        : 0
    };

    return { estimatedCost, breakdown };
  }
}; 
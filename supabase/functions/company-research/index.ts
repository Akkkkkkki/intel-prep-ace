import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";
import { searchTavily, extractTavily, extractInterviewReviewUrls, TavilySearchRequest } from "../_shared/tavily-client.ts";
import { callOpenAI, parseJsonResponse, OpenAIRequest } from "../_shared/openai-client.ts";
import { SearchLogger } from "../_shared/logger.ts";
import { RESEARCH_CONFIG, getAllSearchQueries } from "../_shared/config.ts";
import { UrlDeduplicationService } from "../_shared/url-deduplication.ts";
import { createHybridScraper, InterviewExperience } from "../_shared/native-scrapers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CompanyResearchRequest {
  company: string;
  role?: string;
  country?: string;
  searchId: string;
}

interface InterviewStage {
  name: string;
  order_index: number;
  duration: string;
  interviewer: string;
  content: string;
  common_questions: string[];
  difficulty_level: string;
  success_tips: string[];
}

interface CompanyInsights {
  name: string;
  industry: string;
  culture: string;
  values: string[];
  interview_philosophy: string;
  recent_hiring_trends: string;
  interview_stages: InterviewStage[];
  interview_experiences: {
    positive_feedback: string[];
    negative_feedback: string[];
    common_themes: string[];
    difficulty_rating: string;
    process_duration: string;
  };
  interview_questions_bank: {
    behavioral: string[];
    technical: string[];
    situational: string[];
    company_specific: string[];
  };
  hiring_manager_insights: {
    what_they_look_for: string[];
    red_flags: string[];
    success_factors: string[];
  };
}

interface CompanyResearchOutput {
  company_insights: CompanyInsights;
  raw_research_data: any[];
}

// Enhanced company research with URL extraction and deep content analysis
async function searchCompanyInfo(
  company: string, 
  role?: string, 
  country?: string, 
  searchId?: string, 
  userId?: string,
  supabase?: any,
  logger?: SearchLogger
): Promise<any> {
  // Set a maximum execution time for the entire function (90 seconds)
  const functionTimeout = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Company research function timeout')), 90000)
  );

  const researchPromise = async () => {
  const tavilyApiKey = Deno.env.get("TAVILY_API_KEY");
  if (!tavilyApiKey) {
    const errorMsg = "TAVILY_API_KEY not found in environment variables. Ensure you're running functions with: supabase functions serve --env-file .env.local";
    logger?.log('CONFIG_ERROR', 'API_KEY_MISSING', { 
      company, 
      role, 
      availableEnvVars: Object.keys(Deno.env.toObject()).filter(key => key.includes('API') || key.includes('KEY')).sort(),
      supabaseEnvVars: Object.keys(Deno.env.toObject()).filter(key => key.includes('SUPABASE')).sort()
    }, errorMsg);
    console.warn("🚨 TAVILY_API_KEY missing!");
    console.warn("💡 Solution: Run functions with environment file:");
    console.warn("   npm run functions:serve");
    console.warn("   or: supabase functions serve --env-file .env.local");
    console.warn("📋 Available environment variables:");
    console.warn(Object.keys(Deno.env.toObject()).filter(key => key.includes('API') || key.includes('KEY')).sort());
    return null;
  }

  logger?.log('CONFIG_SUCCESS', 'API_KEY_FOUND', { company, role, country, tavilyKeyLength: tavilyApiKey.length });

  logger?.log('SEARCH_START', 'COMPANY_INFO', { company, role, country });

  try {
    // Initialize URL deduplication service
    const urlDeduplication = new UrlDeduplicationService(supabase);
    
    // Phase 0: Check for cached research and existing content
    logger?.logPhaseTransition('INIT', 'CACHE_CHECK', { company, role, country });
    console.log("Phase 0: Checking for cached research and existing content...");
    
    // URL Deduplication: Find reusable content to reduce API costs
    let combinedResults = {
      reusableUrls: [],
      cachedResults: [],
      shouldSkipFreshSearch: false,
      excluded_domains: []
    };
    
    try {
      const deduplicationResult = await urlDeduplication.findReusableUrls(company, role, country);
      
      if (deduplicationResult.reusable_urls.length > 0) {
        console.log(`Found ${deduplicationResult.reusable_urls.length} reusable URLs for ${company}`);
        
        // Get cached content for reusable URLs
        const cachedContent = await urlDeduplication.getCachedContent(deduplicationResult.reusable_urls);
        
        combinedResults = {
          reusableUrls: deduplicationResult.reusable_urls,
          cachedResults: cachedContent.map(item => ({
            url: item.url,
            content: {
              title: item.title,
              content: item.content,
              raw_content: item.content,
              score: 0.8 // Default score for cached content
            }
          })),
          shouldSkipFreshSearch: cachedContent.length >= 5, // Use cache if we have enough content
          excluded_domains: []
        };
        
        logger?.log('URL_DEDUPLICATION_SUCCESS', 'CACHE_HIT', {
          reusable_urls_found: deduplicationResult.reusable_urls.length,
          cached_content_retrieved: cachedContent.length,
          will_skip_fresh_search: combinedResults.shouldSkipFreshSearch
        });
      } else {
        console.log('No reusable URLs found, proceeding with fresh search');
      }
    } catch (error) {
      console.warn('URL deduplication failed, proceeding with fresh search:', error.message);
      logger?.log('URL_DEDUPLICATION_FAILED', 'FALLBACK', { error: error.message });
    }
    
    // Store combinedResults for later use in response
    (logger as any).combinedResults = combinedResults;
    logger?.log('CACHE_CHECK_COMPLETE', 'PHASE0', { 
      reusableUrls: combinedResults.reusableUrls.length,
      cachedResults: combinedResults.cachedResults.length,
      shouldSkipFreshSearch: combinedResults.shouldSkipFreshSearch
    });

    let searchResults: any[] = [];
    
    // If we have sufficient cached content, use it and skip fresh searches
    if (combinedResults.shouldSkipFreshSearch) {
      logger?.log('USING_CACHED_CONTENT', 'OPTIMIZATION', { 
        cachedResultsCount: combinedResults.cachedResults.length,
        reason: 'Sufficient high-quality cached content available'
      });
      console.log(`Using ${combinedResults.cachedResults.length} cached results, skipping fresh search...`);
      
      // Convert cached results to search result format
      searchResults = [{
        query: `Cached results for ${company}`,
        answer: `Using cached interview and company data for ${company}`,
        results: combinedResults.cachedResults.map(cached => ({
          title: cached.content.title || 'Cached Content',
          url: cached.url,
          content: cached.content.content,
          raw_content: cached.content.raw_content,
          score: cached.content.score,
          published_date: null
        }))
      }];
    } else {
      // Get search queries from centralized config - Enhanced for comprehensive forum coverage
      const searchQueries = getAllSearchQueries(company, role, country);

      logger?.logPhaseTransition('CACHE_CHECK', 'DISCOVERY', { 
        queriesCount: searchQueries.length,
        cachedUrls: combinedResults.reusableUrls.length
      });
      console.log(`Phase 1: Discovering interview review URLs with enhanced forum targeting...`);
      
      // Phase 1: Discovery - collect URLs with comprehensive search for quality forum content
      const searchPromises = searchQueries.map(async (query, index) => {
      const startTime = Date.now();
      logger?.log('TAVILY_SEARCH_START', 'DISCOVERY', { query, index: index + 1, total: searchQueries.length });
      
      const request: TavilySearchRequest = {
        query: query.trim(),
        searchDepth: RESEARCH_CONFIG.tavily.searchDepth,
        maxResults: RESEARCH_CONFIG.tavily.maxResults.discovery,
        includeAnswer: true,
        includeRawContent: RESEARCH_CONFIG.tavily.includeRawContent,
        includeDomains: RESEARCH_CONFIG.search.allowedDomains,
        timeRange: RESEARCH_CONFIG.tavily.timeRange
      };
      
      try {
        // Use regular search without deduplication to avoid timeouts
        const result = await searchTavily(tavilyApiKey, request, searchId, userId, supabase);
        const duration = Date.now() - startTime;
        
        logger?.logTavilySearch(query, 'DISCOVERY_SUCCESS', request, result, undefined, duration);
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger?.logTavilySearch(query, 'DISCOVERY_ERROR', request, undefined, errorMsg, duration);
        return null;
      }
    });

      const freshSearchResults = await Promise.all(searchPromises);
      const validResults = freshSearchResults.filter(r => r !== null);
      
      logger?.log('DISCOVERY_COMPLETE', 'PHASE1', { 
        totalQueries: 2, // Reduced for speed
        successfulResults: validResults.length,
        failedResults: 2 - validResults.length,
        cachedResultsAvailable: combinedResults.cachedResults.length
      });

      // Combine fresh results with cached content
      if (combinedResults.cachedResults.length > 0) {
        const cachedAsSearchResult = {
          query: `Cached content for ${company}`,
          answer: `Reusing ${combinedResults.cachedResults.length} previously analyzed sources`,
          results: combinedResults.cachedResults.map(cached => ({
            title: cached.content.title || 'Cached Content',
            url: cached.url,
            content: cached.content.content,
            raw_content: cached.content.raw_content,
            score: cached.content.score,
            published_date: null
          }))
        };
        searchResults = [cachedAsSearchResult, ...validResults];
      } else {
        searchResults = validResults;
      }
    }
    
    // Phase 2: Extract URLs for deep content extraction
    logger?.logPhaseTransition('DISCOVERY', 'EXTRACTION', { urlsFound: 0 });
    const interviewUrls = extractInterviewReviewUrls(searchResults);
    logger?.log('URL_EXTRACTION', 'PHASE2', { totalUrls: interviewUrls.length, urls: interviewUrls.slice(0, 10) });
    console.log(`Phase 2: Extracting content from ${interviewUrls.length} interview review URLs...`);
    
    // Skip extraction phase temporarily to speed up response
    console.log(`Phase 2: Skipping URL extraction for faster response (found ${interviewUrls.length} URLs)`);
    const extractedContent: any[] = [];
    logger?.log('EXTRACTION_SKIPPED', 'PHASE2', { reason: 'Disabled for speed', urlsFound: interviewUrls.length });
    
    logger?.logPhaseTransition('EXTRACTION', 'RESULT_AGGREGATION', { 
      searchResults: validResults.length,
      extractedContent: extractedContent.length 
    });
    
    // Combine search results with extracted content
    const result = {
      search_results: validResults,
      extracted_content: extractedContent,
      total_urls_extracted: interviewUrls.length
    };
    
    logger?.log('SEARCH_COMPLETE', 'COMPANY_INFO', result);
    return result;
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger?.log('SEARCH_ERROR', 'COMPANY_INFO', { company, role }, errorMsg);
    console.error("Error in enhanced company search:", error);
    return null;
  }
  }; // End of researchPromise

  try {
    return await Promise.race([researchPromise(), functionTimeout]);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger?.log('SEARCH_TIMEOUT', 'COMPANY_INFO', { company, role }, errorMsg);
    console.error("Company research timed out or failed:", error);
    return null;
  }
}

// AI analysis of company research data
async function analyzeCompanyData(
  company: string,
  role: string | undefined,
  country: string | undefined,
  researchData: any,
  openaiApiKey: string,
  logger?: SearchLogger
): Promise<CompanyInsights> {
  
  logger?.log('ANALYSIS_START', 'COMPANY_DATA', { company, role, country });
  
  let researchContext = `Company: ${company}`;
  if (role) researchContext += `\nRole: ${role}`;
  if (country) researchContext += `\nCountry: ${country}`;
  
  if (researchData) {
    researchContext += `\n\nCompany Research Data:\n`;
    
    // Process search results
    if (researchData.search_results) {
      researchData.search_results.forEach((result: any, index: number) => {
        if (result.answer) {
          researchContext += `Research ${index + 1}: ${result.answer}\n`;
        }
        if (result.results) {
          result.results.forEach((item: any) => {
            researchContext += `- ${item.title}: ${item.content}\n`;
            
            if (item.raw_content) {
              researchContext += `SOURCE-START\n${item.url}\n${item.raw_content.slice(0, RESEARCH_CONFIG.content.maxContentLength.sourceSnippet)}\nSOURCE-END\n\n`;
            }
          });
        }
      });
    }
    
    // Process extracted content from interview review sites
    if (researchData.extracted_content && researchData.extracted_content.length > 0) {
      researchContext += `\n\nDeep Extracted Interview Reviews:\n`;
      researchData.extracted_content.forEach((extract: any, index: number) => {
        if (extract.content && extract.url) {
          researchContext += `DEEP-EXTRACT-START\n${extract.url}\n${extract.content.slice(0, RESEARCH_CONFIG.content.maxContentLength.deepExtract)}\nDEEP-EXTRACT-END\n\n`;
        }
      });
    }
  }

  const openaiRequest: OpenAIRequest = {
    model: RESEARCH_CONFIG.openai.model,
    systemPrompt: `You are an expert company research analyst specializing in interview preparation. Based on the provided research data from Glassdoor, Blind, 1point3acres, Reddit, LinkedIn, and other sources, extract comprehensive company insights with focus on recent interview trends (2024-2025).

Focus on REAL candidate experiences from the raw content provided:
1. ACCURATE interview process stages and rounds (extract specific number of rounds from candidate reports)
2. Interview experiences and feedback from actual candidates (prioritize recent ones)
3. Common interview questions mentioned in reviews (especially recent ones)  
4. What hiring managers look for based on employee feedback
5. Specific red flags and success factors from actual interviews
6. Company culture and values as they relate to interviews
7. Interview timeline and duration from candidate reports

CRITICAL: Pay special attention to the interview process structure - how many rounds, what each round consists of, duration, and who conducts each round. Base this ENTIRELY on actual candidate experiences from the raw content, not generic assumptions.

Extract interview stages with this structure and add them to the response:
"interview_stages": [
  {
    "name": "string",
    "order_index": number,
    "duration": "string (from candidate reports)",
    "interviewer": "string (from candidate reports)",
    "content": "string (what happens in this round)",
    "common_questions": ["array of questions mentioned by candidates"],
    "difficulty_level": "string",
    "success_tips": ["array of tips from successful candidates"]
  }
]

You MUST return ONLY valid JSON in this exact structure:

{
  "name": "string",
  "industry": "string", 
  "culture": "string",
  "values": ["array of company values"],
  "interview_philosophy": "string",
  "recent_hiring_trends": "string",
  "interview_stages": [
    {
      "name": "string",
      "order_index": number,
      "duration": "string",
      "interviewer": "string",
      "content": "string",
      "common_questions": ["array"],
      "difficulty_level": "string",
      "success_tips": ["array"]
    }
  ],
  "interview_experiences": {
    "positive_feedback": ["array of positive interview experiences"],
    "negative_feedback": ["array of negative interview experiences"], 
    "common_themes": ["array of recurring themes from reviews"],
    "difficulty_rating": "string (Easy/Medium/Hard/Very Hard)",
    "process_duration": "string (typical timeline)"
  },
  "interview_questions_bank": {
    "behavioral": ["array of behavioral questions mentioned"],
    "technical": ["array of technical questions mentioned"],
    "situational": ["array of situational questions mentioned"],
    "company_specific": ["array of company-specific questions"]
  },
  "hiring_manager_insights": {
    "what_they_look_for": ["array of qualities mentioned as important"],
    "red_flags": ["array of things that lead to rejection"],
    "success_factors": ["array of factors that lead to success"]
  }
}`,
    prompt: `Analyze this company research data and extract structured insights based on REAL candidate experiences:\n\n${researchContext}`,
    maxTokens: RESEARCH_CONFIG.openai.maxTokens.companyAnalysis,
    temperature: RESEARCH_CONFIG.openai.temperature.analysis,
    useJsonMode: RESEARCH_CONFIG.openai.useJsonMode
  };

  logger?.logDataProcessing('CONTEXT_BUILDING', { 
    company, role, country,
    hasResearchData: !!researchData,
    searchResultsCount: researchData?.search_results?.length || 0,
    extractedContentCount: researchData?.extracted_content?.length || 0
  }, { contextLength: researchContext.length });

  try {
    const startTime = Date.now();
    logger?.logOpenAI('COMPANY_ANALYSIS', 'REQUEST_START', openaiRequest);
    
    const response = await callOpenAI(openaiApiKey, openaiRequest);
    const duration = Date.now() - startTime;
    
    logger?.logOpenAI('COMPANY_ANALYSIS', 'REQUEST_SUCCESS', openaiRequest, response, undefined, duration);
    
    const result = parseJsonResponse(response.content, {
      name: company,
      industry: "Unknown",
      culture: "Research in progress",
      values: [],
      interview_philosophy: "Standard interview process",
      recent_hiring_trends: "Information not available",
      interview_stages: [],
      interview_experiences: {
        positive_feedback: [],
        negative_feedback: [],
        common_themes: [],
        difficulty_rating: "Unknown",
        process_duration: "Unknown"
      },
      interview_questions_bank: {
        behavioral: [],
        technical: [],
        situational: [],
        company_specific: []
      },
      hiring_manager_insights: {
        what_they_look_for: [],
        red_flags: [],
        success_factors: []
      }
    });
    
    logger?.log('ANALYSIS_COMPLETE', 'COMPANY_DATA', { 
      hasInterviewStages: result.interview_stages?.length > 0,
      stagesCount: result.interview_stages?.length || 0
    });
    
    return result;
  } catch (analysisError) {
    const errorMsg = analysisError instanceof Error ? analysisError.message : 'Unknown error';
    logger?.logOpenAI('COMPANY_ANALYSIS', 'REQUEST_ERROR', openaiRequest, undefined, errorMsg);
    console.error("Failed to analyze company data:", analysisError);
    
    // Return fallback structure
    return {
      name: company,
      industry: "Unknown",
      culture: "Research in progress",
      values: [],
      interview_philosophy: "Standard interview process",
      recent_hiring_trends: "Information not available",
      interview_stages: [],
      interview_experiences: {
        positive_feedback: [],
        negative_feedback: [],
        common_themes: [],
        difficulty_rating: "Unknown",
        process_duration: "Unknown"
      },
      interview_questions_bank: {
        behavioral: [],
        technical: [],
        situational: [],
        company_specific: []
      },
      hiring_manager_insights: {
        what_they_look_for: [],
        red_flags: [],
        success_factors: []
      }
    };
  }
}

// Enhanced hybrid research combining native scraping with Tavily discovery
async function conductHybridResearch(
  company: string, 
  role?: string, 
  country?: string, 
  searchId?: string, 
  userId?: string,
  supabase?: any,
  logger?: SearchLogger
): Promise<any> {
  const hybridScraper = createHybridScraper();
  
  logger?.log('HYBRID_RESEARCH_START', 'NATIVE_SCRAPING', { company, role, country });
  console.log(`[HybridResearch] Starting comprehensive research for ${company} ${role || ''}`);
  
  try {
    // Phase 1: Native Scraping of Known High-Value Sources (Exhaustive)
    logger?.logPhaseTransition('INIT', 'NATIVE_SCRAPING', { company, role });
    console.log("Phase 1: Native scraping of structured interview sites...");
    
    const nativeResults = await hybridScraper.scrapeAllSources(company, role);
    
    logger?.log('NATIVE_SCRAPING_COMPLETE', 'PHASE1', {
      totalExperiences: nativeResults.combinedExperiences.length,
      platformBreakdown: nativeResults.executionSummary.platformBreakdown,
      executionTime: nativeResults.executionSummary.totalExecutionTime
    });
    
    console.log(`Phase 1 Complete: Found ${nativeResults.combinedExperiences.length} native experiences`);
    console.log(`Platform breakdown:`, nativeResults.executionSummary.platformBreakdown);
    
    // Phase 2: Tavily Discovery for Unknown/Blog Sources (Supplementary)
    logger?.logPhaseTransition('NATIVE_SCRAPING', 'TAVILY_DISCOVERY', { company, role });
    console.log("Phase 2: Tavily discovery of additional sources (blogs, unknown forums)...");
    
    // Use Tavily for discovering content NOT covered by native scrapers
    const tavilyQueries = [
      `"${company}" interview experience blog 2024`,
      `${company} ${role || 'engineer'} interview tips advice`,
      `"interviewed at ${company}" personal blog experience`,
      `${company} hiring process insights medium linkedin`
    ];
    
    const tavilyResults: any[] = [];
    
    for (const query of tavilyQueries.slice(0, 3)) { // Limit to 3 discovery queries
      try {
        const searchResult = await searchTavily({
          query: query.trim(),
          searchDepth: 'basic',
          maxResults: 8, // Smaller limit since this is supplementary
          includeRawContent: false,
          excludeDomains: ['glassdoor.com', 'reddit.com', 'blind.teamblind.com', 'leetcode.com'] // Exclude sites we already scraped natively
        });
        
        if (searchResult) {
          tavilyResults.push(searchResult);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
      } catch (error) {
        console.warn(`Tavily discovery query failed: ${query}`, error);
      }
    }
    
    logger?.log('TAVILY_DISCOVERY_COMPLETE', 'PHASE2', {
      queriesExecuted: Math.min(tavilyQueries.length, 3),
      supplementaryResults: tavilyResults.length
    });
    
    console.log(`Phase 2 Complete: Found ${tavilyResults.length} supplementary Tavily results`);
    
    // Phase 3: Combine and Analyze All Sources
    logger?.logPhaseTransition('TAVILY_DISCOVERY', 'ANALYSIS', { company, role });
    console.log("Phase 3: Analyzing combined native + discovery results...");
    
    // Merge native experiences with Tavily discoveries
    const combinedData = {
      native_experiences: nativeResults.combinedExperiences,
      tavily_discoveries: tavilyResults,
      execution_summary: {
        native_platforms: nativeResults.executionSummary.platformBreakdown,
        total_native_experiences: nativeResults.combinedExperiences.length,
        supplementary_discoveries: tavilyResults.length,
        total_execution_time: nativeResults.executionSummary.totalExecutionTime
      }
    };
    
    // Convert native experiences to format compatible with existing AI analysis
    const convertedResults = {
      search_results: tavilyResults, // Keep Tavily format for discovery content
      extracted_content: [], // We'll populate this from native experiences
      native_interview_experiences: nativeResults.combinedExperiences // New field for structured experiences
    };
    
    // Convert native experiences to extracted content format for AI analysis
    nativeResults.combinedExperiences.forEach((exp: InterviewExperience) => {
      convertedResults.extracted_content.push({
        url: exp.url,
        title: exp.title,
        content: `${exp.content}\n\nPlatform: ${exp.platform}\nDifficulty: ${exp.difficulty_rating}\nExperience Type: ${exp.experience_type}\nInterview Stages: ${exp.metadata.interview_stages?.join(', ') || 'Not specified'}\nQuestions Asked: ${exp.metadata.questions_asked?.join(', ') || 'Not specified'}`,
        platform: exp.platform,
        metadata: exp.metadata
      });
    });
    
    logger?.log('HYBRID_RESEARCH_COMPLETE', 'SUCCESS', {
      totalNativeExperiences: nativeResults.combinedExperiences.length,
      totalTavilyDiscoveries: tavilyResults.length,
      combinedExtractedContent: convertedResults.extracted_content.length,
      success: true
    });
    
    console.log(`Hybrid Research Complete: ${nativeResults.combinedExperiences.length} native + ${tavilyResults.length} discovery results`);
    
    return convertedResults;
    
  } catch (error) {
    logger?.log('HYBRID_RESEARCH_ERROR', 'FAILURE', { error: error.message, company, role });
    console.error('Hybrid research failed:', error);
    
    // Fallback to traditional Tavily-only approach
    console.log('Falling back to traditional Tavily search...');
    return await searchCompanyInfo(company, role, country, searchId, userId, supabase, logger);
  }
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { company, role, country, searchId } = await req.json() as CompanyResearchRequest;

    if (!company || !searchId) {
      throw new Error("Missing required parameters: company and searchId");
    }

    // Initialize logger
    const logger = new SearchLogger(searchId, 'company-research');
    logger.log('REQUEST_INPUT', 'VALIDATION', { company, role, country, searchId });

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("Missing OpenAI API key");
    }

    console.log("Starting company research for", company, role || "");

    // Get userId from searches table for logging
    const { data: searchData } = await supabase
      .from("searches")
      .select("user_id")
      .eq("id", searchId)
      .single();
    
    const userId = searchData?.user_id;

    // Step 1: Conduct research (Hybrid or Traditional based on feature flag)
    const useHybridApproach = RESEARCH_CONFIG.features.enableHybridScraping;
    
    if (useHybridApproach) {
      logger.log('STEP_START', 'HYBRID_RESEARCH', { step: 1, description: 'Conducting hybrid native + discovery research' });
      console.log("Conducting hybrid research (native scraping + discovery)...");
      var researchData = await conductHybridResearch(company, role, country, searchId, userId, supabase, logger);
    } else {
      logger.log('STEP_START', 'TRADITIONAL_RESEARCH', { step: 1, description: 'Conducting traditional Tavily research' });
      console.log("Conducting traditional Tavily research...");
      var researchData = await searchCompanyInfo(company, role, country, searchId, userId, supabase, logger);
    }

    // Step 2: Analyze research data using AI
    logger.log('STEP_START', 'ANALYSIS', { step: 2, description: 'Analyzing company data' });
    console.log("Analyzing company data...");
    const companyInsights = await analyzeCompanyData(
      company, 
      role, 
      country, 
      researchData,
      openaiApiKey,
      logger
    );

    // Step 3: Skip caching temporarily to avoid timeout issues
    console.log("Skipping research caching to avoid timeouts...");
    
    const researchOutput: CompanyResearchOutput = {
      company_insights: companyInsights,
      raw_research_data: researchData || []
    };

    console.log("Company research completed successfully");

    const responseData = { 
      status: "success", 
      message: "Company research completed",
      company_insights: companyInsights,
      research_sources: researchData ? researchData.search_results?.length || 0 : 0,
      extracted_urls: researchData ? researchData.total_urls_extracted || 0 : 0,
      deep_extracts: researchData ? researchData.extracted_content?.length || 0 : 0,
      optimization_info: {
        cached_urls_reused: 0, // Disabled temporarily
        fresh_searches_performed: 2, // Reduced for speed
        excluded_domains: 0, // Disabled temporarily
        cache_optimization_active: false, // Disabled temporarily
        speed_optimizations: "URL deduplication and extraction disabled for faster response"
      }
    };

    logger.logFunctionEnd(true, responseData);
    
    // Save logs to file for debugging
    await logger.saveToFile();

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error processing company research:", error);

    // Try to get the logger from the request context if available
    try {
      const { searchId } = await req.json();
      if (searchId) {
        const errorLogger = new SearchLogger(searchId, 'company-research');
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errorLogger.logFunctionEnd(false, undefined, errorMsg);
        await errorLogger.saveToFile();
      }
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }

    return new Response(
      JSON.stringify({ 
        status: "error", 
        message: error instanceof Error ? error.message : "Failed to process company research"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
}); 
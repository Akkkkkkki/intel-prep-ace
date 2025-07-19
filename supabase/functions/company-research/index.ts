import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";
import { searchTavily, extractTavily, extractInterviewReviewUrls, TavilySearchRequest } from "../_shared/tavily-client.ts";
import { callOpenAI, parseJsonResponse, OpenAIRequest } from "../_shared/openai-client.ts";
import { SearchLogger } from "../_shared/logger.ts";

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
  const tavilyApiKey = Deno.env.get("TAVILY_API_KEY");
  if (!tavilyApiKey) {
    const errorMsg = "TAVILY_API_KEY not found, skipping company research";
    logger?.log('CONFIG_ERROR', 'API_KEY_MISSING', { company, role }, errorMsg);
    console.warn(errorMsg);
    return null;
  }

  logger?.log('SEARCH_START', 'COMPANY_INFO', { company, role, country });

  try {
    // Get company ticker symbol for Blind searches
    const getCompanyTicker = (companyName: string): string => {
      const tickerMap: Record<string, string> = {
        'amazon': 'AMZN', 'microsoft': 'MSFT', 'google': 'GOOGL', 'alphabet': 'GOOGL',
        'meta': 'META', 'facebook': 'META', 'apple': 'AAPL', 'netflix': 'NFLX',
        'tesla': 'TSLA', 'nvidia': 'NVDA', 'salesforce': 'CRM', 'oracle': 'ORCL',
        'uber': 'UBER', 'airbnb': 'ABNB', 'stripe': 'STRIPE', 'snowflake': 'SNOW',
        'databricks': 'DATABRICKS', 'palantir': 'PLTR', 'coinbase': 'COIN'
      };
      return tickerMap[companyName.toLowerCase()] || companyName.toUpperCase();
    };

    const companyTicker = getCompanyTicker(company);
    
    // Step 1: Discovery searches to collect URLs
    const searchQueries = [
      // Glassdoor interview pages - specific URL slugs for better targeting
      `${company} ${role || ""} Interview Questions & Answers site:glassdoor.com/Interview`,
      `${company} interview process ${role || ""} ${country || ""} 2024 2025 site:glassdoor.com`,
      `${company} interview experience ${role || ""} recent 2024 site:glassdoor.com`,
      
      // Blind boards - use ticker symbols and "interview" keyword
      `${companyTicker} interview ${role || ""} site:blind.teamblind.com`,
      `interview ${companyTicker} ${role || ""} experience site:blind.teamblind.com`,
      
      // 1point3acres for tech interviews (especially for Chinese tech companies)
      `${company} ${role || ""} interview 面试 site:1point3acres.com`,
      `${company} interview experience ${role || ""} site:1point3acres.com`,
      
      // Multi-platform interview insights with recent focus
      `${company} ${role || ""} interview 2024 site:levels.fyi`,
      `${company} ${role || ""} interview process site:leetcode.com`,
      
      // Reddit and forum discussions - recent focus
      `${company} ${role || ""} interview experience 2024 site:reddit.com`,
      `${company} ${role || ""} interview questions recent site:reddit.com`,
      
      // Company culture and values - current practices
      `${company} interview process how many rounds stages`,
      `${company} what do they look for hiring criteria recent`
    ];

    logger?.logPhaseTransition('INIT', 'DISCOVERY', { queriesCount: searchQueries.length });
    console.log("Phase 1: Discovering interview review URLs...");
    
    // Phase 1: Discovery - collect URLs with search
    const searchPromises = searchQueries.map(async (query, index) => {
      const startTime = Date.now();
      logger?.log('TAVILY_SEARCH_START', 'DISCOVERY', { query, index: index + 1, total: searchQueries.length });
      
      const request: TavilySearchRequest = {
        query: query.trim(),
        searchDepth: 'advanced',
        maxResults: 10,
        includeAnswer: true,
        includeRawContent: true,
        includeDomains: ['glassdoor.com', 'levels.fyi', 'blind.teamblind.com', 'linkedin.com', 'indeed.com', '1point3acres.com', 'reddit.com', 'interviewing.io', 'leetcode.com'],
        timeRange: 'year'
      };
      
      try {
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

    const searchResults = await Promise.all(searchPromises);
    const validResults = searchResults.filter(r => r !== null);
    
    logger?.log('DISCOVERY_COMPLETE', 'PHASE1', { 
      totalQueries: searchQueries.length, 
      successfulResults: validResults.length,
      failedResults: searchQueries.length - validResults.length
    });
    
    // Phase 2: Extract URLs for deep content extraction
    logger?.logPhaseTransition('DISCOVERY', 'EXTRACTION', { urlsFound: 0 });
    const interviewUrls = extractInterviewReviewUrls(validResults);
    logger?.log('URL_EXTRACTION', 'PHASE2', { totalUrls: interviewUrls.length, urls: interviewUrls.slice(0, 10) });
    console.log(`Phase 2: Extracting content from ${interviewUrls.length} interview review URLs...`);
    
    let extractedContent: any[] = [];
    if (interviewUrls.length > 0) {
      const startTime = Date.now();
      const urlsToExtract = interviewUrls.slice(0, 15); // Limit to 15 URLs to manage costs
      logger?.log('TAVILY_EXTRACT_START', 'EXTRACTION', { urlCount: urlsToExtract.length, urls: urlsToExtract });
      
      try {
        extractedContent = await extractTavily(
          tavilyApiKey, 
          { urls: urlsToExtract },
          searchId, 
          userId, 
          supabase
        );
        const duration = Date.now() - startTime;
        logger?.logTavilyExtract(urlsToExtract, 'EXTRACTION_SUCCESS', extractedContent, undefined, duration);
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger?.logTavilyExtract(urlsToExtract, 'EXTRACTION_ERROR', undefined, errorMsg, duration);
      }
    } else {
      logger?.log('EXTRACTION_SKIPPED', 'PHASE2', { reason: 'No URLs found' });
    }
    
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
              researchContext += `SOURCE-START\n${item.url}\n${item.raw_content.slice(0, 4500)}\nSOURCE-END\n\n`;
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
          researchContext += `DEEP-EXTRACT-START\n${extract.url}\n${extract.content.slice(0, 6000)}\nDEEP-EXTRACT-END\n\n`;
        }
      });
    }
  }

  const openaiRequest: OpenAIRequest = {
    model: 'gpt-4o',
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
    maxTokens: 2000,
    temperature: 0.3,
    useJsonMode: true
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

    // Step 1: Conduct company research using Tavily
    logger.log('STEP_START', 'RESEARCH', { step: 1, description: 'Conducting company research' });
    console.log("Conducting company research...");
    const researchData = await searchCompanyInfo(company, role, country, searchId, userId, supabase, logger);

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

    // Step 3: Store company insights (for potential future use)
    console.log("Storing company research results...");
    
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
      deep_extracts: researchData ? researchData.extracted_content?.length || 0 : 0
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
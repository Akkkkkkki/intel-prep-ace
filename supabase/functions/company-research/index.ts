import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";

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

interface CompanyInsights {
  name: string;
  industry: string;
  culture: string;
  values: string[];
  interview_philosophy: string;
  recent_hiring_trends: string;
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

// Tavily API function for company research with comprehensive logging
async function searchCompanyInfo(
  company: string, 
  role?: string, 
  country?: string, 
  searchId?: string, 
  userId?: string,
  supabase?: any
): Promise<any> {
  const tavilyApiKey = Deno.env.get("TAVILY_API_KEY");
  if (!tavilyApiKey) {
    console.warn("TAVILY_API_KEY not found, skipping company research");
    return null;
  }

  try {
    // Comprehensive targeted searches for deep company research
    const searches = [
      // Core interview process searches
      `${company} interview process ${role || ""} ${country || ""} site:glassdoor.com`,
      `${company} interview experience ${role || ""} site:glassdoor.com`,
      `${company} interview questions ${role || ""} site:glassdoor.com`,
      `${company} hiring process ${role || ""} site:glassdoor.com`,
      
      // Multi-platform interview insights
      `${company} ${role || ""} interview site:levels.fyi`,
      `${company} ${role || ""} interview site:blind.teamblind.com`,
      `${company} ${role || ""} interview site:leetcode.com`,
      `${company} ${role || ""} interview site:interviewing.io`,
      
      // Reddit and forum discussions
      `${company} ${role || ""} interview experience site:reddit.com`,
      `${company} ${role || ""} interview questions site:reddit.com`,
      
      // Professional network insights
      `${company} ${role || ""} interview tips site:linkedin.com`,
      `${company} hiring manager ${role || ""} interview site:linkedin.com`,
      
      // Company culture and values
      `${company} company culture values interview philosophy`,
      `${company} what do they look for hiring criteria`,
      `${company} interview red flags mistakes to avoid`
    ];

    const searchPromises = searches.map(async (query) => {
      const startTime = Date.now();
      const endpoint = 'https://api.tavily.com/search';
      
      const requestPayload = {
        query: query.trim(),
        search_depth: 'advanced',
        max_results: 15,
        include_answer: true,
        include_raw_content: false,
        include_domains: ['glassdoor.com', 'levels.fyi', 'blind.teamblind.com', 'linkedin.com', 'indeed.com', '1point3acres.com', 'reddit.com', 'interviewing.io', 'leetcode.com', 'geeksforgeeks.org', 'interviewbit.com', 'pramp.com', 'educative.io'],
        time_range: 'year'
      };

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tavilyApiKey}`,
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
                query_text: query.trim(),
                search_depth: 'advanced',
                max_results: 15,
                include_domains: requestPayload.include_domains,
                response_payload: responseData,
                response_status: response.status,
                results_count: resultsCount,
                request_duration_ms: duration,
                credits_used: 1, // Basic search = 1 credit
                error_message: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`
              });
          } catch (logError) {
            console.error("Failed to log Tavily search:", logError);
            // Don't fail the main operation due to logging errors
          }
        }

        if (response.ok) {
          return responseData;
        }
        return null;
      } catch (searchError) {
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
                query_text: query.trim(),
                search_depth: 'advanced',
                max_results: 15,
                include_domains: requestPayload.include_domains,
                response_payload: null,
                response_status: 0,
                results_count: 0,
                request_duration_ms: duration,
                credits_used: 0, // No credits charged for failed requests
                error_message: searchError.message || "Network/API error"
              });
          } catch (logError) {
            console.error("Failed to log Tavily error:", logError);
          }
        }
        
        console.error("Error in individual Tavily search:", searchError);
        return null;
      }
    });

    const results = await Promise.all(searchPromises);
    return results.filter(r => r !== null);
  } catch (error) {
    console.error("Error in Tavily company search:", error);
    return null;
  }
}

// AI analysis of company research data
async function analyzeCompanyData(
  company: string,
  role: string | undefined,
  country: string | undefined,
  researchData: any,
  openaiApiKey: string
): Promise<CompanyInsights> {
  
  let researchContext = `Company: ${company}`;
  if (role) researchContext += `\nRole: ${role}`;
  if (country) researchContext += `\nCountry: ${country}`;
  
  if (researchData) {
    researchContext += `\n\nCompany Research Data:\n`;
    researchData.forEach((result: any, index: number) => {
      if (result.answer) {
        researchContext += `Research ${index + 1}: ${result.answer}\n`;
      }
      if (result.results) {
        result.results.slice(0, 3).forEach((item: any) => {
          researchContext += `- ${item.title}: ${item.content}\n`;
        });
      }
    });
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert company research analyst specializing in interview preparation. Based on the provided research data from Glassdoor, Reddit, LinkedIn, and other sources, extract comprehensive company insights.

Focus on:
1. Interview experiences and feedback from actual candidates
2. Common interview questions mentioned in reviews
3. What hiring managers look for based on employee feedback
4. Specific red flags and success factors
5. Company culture and values as they relate to interviews

You MUST return ONLY valid JSON in this exact structure - no markdown, no additional text:

{
  "name": "string",
  "industry": "string", 
  "culture": "string",
  "values": ["array of company values"],
  "interview_philosophy": "string",
  "recent_hiring_trends": "string",
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
}`
        },
        {
          role: 'user',
          content: `Analyze this company research data and extract structured insights:\n\n${researchContext}`
        }
      ],
      max_tokens: 1500,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`Company analysis failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const analysisResult = data.choices[0].message.content;
  
  try {
    return JSON.parse(analysisResult);
  } catch (parseError) {
    console.error("Failed to parse company analysis JSON:", parseError);
    
    // Return fallback structure
    return {
      name: company,
      industry: "Unknown",
      culture: "Research in progress",
      values: [],
      interview_philosophy: "Standard interview process",
      recent_hiring_trends: "Information not available",
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
    console.log("Conducting company research...");
    const researchData = await searchCompanyInfo(company, role, country, searchId, userId, supabase);

    // Step 2: Analyze research data using AI
    console.log("Analyzing company data...");
    const companyInsights = await analyzeCompanyData(
      company, 
      role, 
      country, 
      researchData,
      openaiApiKey
    );

    // Step 3: Store company insights (for potential future use)
    console.log("Storing company research results...");
    
    const researchOutput: CompanyResearchOutput = {
      company_insights: companyInsights,
      raw_research_data: researchData || []
    };

    console.log("Company research completed successfully");

    return new Response(
      JSON.stringify({ 
        status: "success", 
        message: "Company research completed",
        company_insights: companyInsights,
        research_sources: researchData ? researchData.length : 0
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error processing company research:", error);

    return new Response(
      JSON.stringify({ 
        status: "error", 
        message: error.message || "Failed to process company research"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
}); 
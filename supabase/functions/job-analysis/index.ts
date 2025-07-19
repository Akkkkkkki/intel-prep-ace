import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface JobAnalysisRequest {
  roleLinks: string[];
  searchId: string;
  company?: string;
  role?: string;
}

interface JobRequirements {
  technical_skills: string[];
  soft_skills: string[];
  experience_level: string;
  responsibilities: string[];
  qualifications: string[];
  nice_to_have: string[];
  company_benefits: string[];
  interview_process_hints: string[];
}

interface JobAnalysisOutput {
  job_requirements: JobRequirements;
  raw_job_data: any[];
  urls_processed: number;
}

// Extract job description content using Tavily with comprehensive logging
async function extractJobDescriptions(
  urls: string[], 
  searchId?: string, 
  userId?: string, 
  supabase?: any
): Promise<any> {
  const tavilyApiKey = Deno.env.get("TAVILY_API_KEY");
  if (!tavilyApiKey || !urls.length) {
    if (!tavilyApiKey) {
      console.warn("🚨 TAVILY_API_KEY missing!");
      console.warn("💡 Solution: Run functions with environment file:");
      console.warn("   npm run functions:serve");
      console.warn("   or: supabase functions serve --env-file .env.local");
      console.warn("📋 Available environment variables:");
      console.warn(Object.keys(Deno.env.toObject()).filter(key => key.includes('API') || key.includes('KEY')).sort());
    }
    console.warn("TAVILY_API_KEY not found or no URLs provided, skipping job extraction");
    return null;
  }

  const startTime = Date.now();
  const endpoint = 'https://api.tavily.com/extract';
  const limitedUrls = urls.slice(0, 5); // Limit to 5 URLs for efficiency
  
  const requestPayload = {
    urls: limitedUrls,
    extract_depth: 'advanced',
    include_images: false
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
            api_type: 'extract',
            endpoint_url: endpoint,
            request_payload: requestPayload,
            query_text: `Extract from ${limitedUrls.length} URLs: ${limitedUrls.join(', ')}`,
            search_depth: 'advanced',
            max_results: limitedUrls.length,
            include_domains: [], // Not applicable for extract
            response_payload: responseData,
            response_status: response.status,
            results_count: resultsCount,
            request_duration_ms: duration,
            credits_used: Math.ceil(limitedUrls.length / 5) * 2, // Extract = 2 credits per 5 URLs with advanced depth
            error_message: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`
          });
      } catch (logError) {
        console.error("Failed to log Tavily extract:", logError);
        // Don't fail the main operation due to logging errors
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
            api_type: 'extract',
            endpoint_url: endpoint,
            request_payload: requestPayload,
            query_text: `Extract from ${limitedUrls.length} URLs: ${limitedUrls.join(', ')}`,
            search_depth: 'advanced',
            max_results: limitedUrls.length,
            include_domains: [],
            response_payload: null,
            response_status: 0,
            results_count: 0,
            request_duration_ms: duration,
            credits_used: 0, // No credits charged for failed requests
            error_message: error.message || "Network/API error"
          });
      } catch (logError) {
        console.error("Failed to log Tavily extract error:", logError);
      }
    }
    
    console.error("Error in Tavily job description extraction:", error);
    return null;
  }
}

// AI analysis of job descriptions
async function analyzeJobRequirements(
  company: string | undefined,
  role: string | undefined,
  jobData: any,
  openaiApiKey: string
): Promise<JobRequirements> {
  
  let jobContext = "";
  if (company) jobContext += `Company: ${company}\n`;
  if (role) jobContext += `Role: ${role}\n`;
  
  if (jobData && jobData.results) {
    jobContext += `\n\nJob Description Content:\n`;
    jobData.results.forEach((jd: any, index: number) => {
      if (jd.raw_content) {
        jobContext += `Job Description ${index + 1}:\n${jd.raw_content.slice(0, 3000)}\n\n`;
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
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert job description analyst. Extract structured requirements from job postings for interview preparation.

You MUST return ONLY valid JSON in this exact structure - no markdown, no additional text:

{
  "technical_skills": ["array of required technical skills"],
  "soft_skills": ["array of required soft skills"],
  "experience_level": "string describing experience requirements",
  "responsibilities": ["array of key responsibilities"],
  "qualifications": ["array of required qualifications"],
  "nice_to_have": ["array of preferred but not required skills"],
  "company_benefits": ["array of benefits mentioned"],
  "interview_process_hints": ["array of any interview process clues from the job posting"]
}`
        },
        {
          role: 'user',
          content: `Analyze these job descriptions and extract structured requirements:\n\n${jobContext}`
        }
      ],
      max_tokens: 2000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`Job analysis failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const analysisResult = data.choices[0].message.content;
  
  try {
    return JSON.parse(analysisResult);
  } catch (parseError) {
    console.error("Failed to parse job analysis JSON:", parseError);
    
    // Return fallback structure
    return {
      technical_skills: [],
      soft_skills: [],
      experience_level: "Experience level not specified",
      responsibilities: [],
      qualifications: [],
      nice_to_have: [],
      company_benefits: [],
      interview_process_hints: []
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { roleLinks, searchId, company, role } = await req.json() as JobAnalysisRequest;

    if (!roleLinks || !Array.isArray(roleLinks) || roleLinks.length === 0 || !searchId) {
      throw new Error("Missing required parameters: roleLinks (non-empty array) and searchId");
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

    console.log("Starting job analysis for", roleLinks.length, "URLs");

    // Get userId from searches table for logging
    const { data: searchData } = await supabase
      .from("searches")
      .select("user_id")
      .eq("id", searchId)
      .single();
    
    const userId = searchData?.user_id;

    // Step 1: Extract job description content using Tavily
    console.log("Extracting job descriptions...");
    const jobData = await extractJobDescriptions(roleLinks, searchId, userId, supabase);

    if (!jobData || !jobData.results || jobData.results.length === 0) {
      console.warn("No job description data extracted");
      return new Response(
        JSON.stringify({ 
          status: "warning", 
          message: "No job description content could be extracted from provided URLs",
          job_requirements: {
            technical_skills: [],
            soft_skills: [],
            experience_level: "Unable to extract requirements",
            responsibilities: [],
            qualifications: [],
            nice_to_have: [],
            company_benefits: [],
            interview_process_hints: []
          },
          urls_processed: 0
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Step 2: Analyze job requirements using AI
    console.log("Analyzing job requirements...");
    const jobRequirements = await analyzeJobRequirements(
      company,
      role,
      jobData,
      openaiApiKey
    );

    // Step 3: Prepare output
    const analysisOutput: JobAnalysisOutput = {
      job_requirements: jobRequirements,
      raw_job_data: jobData.results || [],
      urls_processed: jobData.results?.length || 0
    };

    console.log("Job analysis completed successfully");

    return new Response(
      JSON.stringify({ 
        status: "success", 
        message: "Job analysis completed",
        job_requirements: jobRequirements,
        urls_processed: jobData.results.length
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error processing job analysis:", error);

    return new Response(
      JSON.stringify({ 
        status: "error", 
        message: error.message || "Failed to process job analysis"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
}); 
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
}

interface CompanyResearchOutput {
  company_insights: CompanyInsights;
  raw_research_data: any[];
}

// Tavily API function for company research
async function searchCompanyInfo(company: string, role?: string, country?: string): Promise<any> {
  const tavilyApiKey = Deno.env.get("TAVILY_API_KEY");
  if (!tavilyApiKey) {
    console.warn("TAVILY_API_KEY not found, skipping company research");
    return null;
  }

  try {
    // Multiple targeted searches for comprehensive company research
    const searches = [
      `${company} interview process ${role || ""} ${country || ""}`,
      `${company} company culture hiring practices`,
      `${company} interview questions experience ${role || ""}`,
      `${company} career page interview tips guidance`
    ];

    const searchPromises = searches.map(async (query) => {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tavilyApiKey}`,
        },
        body: JSON.stringify({
          query: query.trim(),
          search_depth: 'advanced',
          max_results: 10,
          include_answer: true,
          include_raw_content: false,
          include_domains: ['glassdoor.com', 'levels.fyi', 'blind.teamblind.com', 'linkedin.com', 'indeed.com'],
          time_range: 'year'
        }),
      });

      if (response.ok) {
        return await response.json();
      }
      return null;
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
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert company research analyst. Based on the provided research data, extract structured company insights for interview preparation.

You MUST return ONLY valid JSON in this exact structure - no markdown, no additional text:

{
  "name": "string",
  "industry": "string", 
  "culture": "string",
  "values": ["array of company values"],
  "interview_philosophy": "string",
  "recent_hiring_trends": "string"
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
      recent_hiring_trends: "Information not available"
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

    // Step 1: Conduct company research using Tavily
    console.log("Conducting company research...");
    const researchData = await searchCompanyInfo(company, role, country);

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
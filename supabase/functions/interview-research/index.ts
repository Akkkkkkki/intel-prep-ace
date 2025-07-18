import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResearchRequest {
  company: string;
  role?: string;
  country?: string;
  roleLinks?: string[];
  cv?: string;
  userId: string;
  searchId: string;
}

// Structured interfaces for AI responses
interface CompanyInsights {
  name: string;
  industry: string;
  culture: string;
  values: string[];
  interview_philosophy: string;
  recent_hiring_trends: string;
}

interface InterviewStageStructured {
  name: string;
  order_index: number;
  duration: string;
  interviewer: string;
  content: string;
  guidance: string;
  preparation_tips: string[];
  common_questions: string[];
  red_flags_to_avoid: string[];
}

interface PersonalizedGuidance {
  strengths_to_highlight: string[];
  areas_to_improve: string[];
  suggested_stories: string[];
  skill_gaps: string[];
  competitive_advantages: string[];
}

interface AIResearchOutput {
  company_insights: CompanyInsights;
  interview_stages: InterviewStageStructured[];
  personalized_guidance: PersonalizedGuidance;
  preparation_timeline: {
    weeks_before: string[];
    week_before: string[];
    day_before: string[];
    day_of: string[];
  };
}

interface CVAnalysis {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  current_role?: string;
  experience_years?: number;
  skills: {
    technical: string[];
    soft: string[];
    certifications: string[];
  };
  education: {
    degree?: string;
    institution?: string;
    graduation_year?: number;
  };
  experience: {
    company: string;
    role: string;
    duration: string;
    achievements: string[];
  }[];
  projects: string[];
  key_achievements: string[];
}

// Tavily API functions
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

async function extractJobDescriptions(urls: string[]): Promise<any> {
  const tavilyApiKey = Deno.env.get("TAVILY_API_KEY");
  if (!tavilyApiKey || !urls.length) {
    return null;
  }

  try {
    const response = await fetch('https://api.tavily.com/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tavilyApiKey}`,
      },
      body: JSON.stringify({
        urls: urls.slice(0, 5), // Limit to 5 URLs for efficiency
        extract_depth: 'advanced',
        include_images: false
      }),
    });

    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error("Error in Tavily job description extraction:", error);
    return null;
  }
}

// Advanced CV analysis using AI
async function analyzeCV(cvText: string, openaiApiKey: string): Promise<CVAnalysis> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // Using cheaper model for CV analysis
      messages: [
        {
          role: 'system',
          content: 'You are an expert CV parser and career analyst. Analyze the CV and extract structured information. Return ONLY valid JSON without any markdown formatting or additional text.'
        },
        {
          role: 'user',
          content: `Analyze this CV and return structured data in this exact JSON format:
{
  "name": "string",
  "email": "string",
  "phone": "string", 
  "location": "string",
  "current_role": "string",
  "experience_years": number,
  "skills": {
    "technical": ["array of technical skills"],
    "soft": ["array of soft skills"],
    "certifications": ["array of certifications"]
  },
  "education": {
    "degree": "string",
    "institution": "string", 
    "graduation_year": number
  },
  "experience": [
    {
      "company": "string",
      "role": "string", 
      "duration": "string",
      "achievements": ["array of key achievements"]
    }
  ],
  "projects": ["array of notable projects"],
  "key_achievements": ["array of major accomplishments"]
}

CV Text:
${cvText}`
        }
      ],
      max_tokens: 2000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`CV analysis failed: ${response.status}`);
  }

  const data = await response.json();
  const analysisText = data.choices[0].message.content;
  
  try {
    return JSON.parse(analysisText);
  } catch (parseError) {
    console.error("Failed to parse CV analysis JSON:", parseError);
    // Return minimal fallback structure
    return {
      skills: { technical: [], soft: [], certifications: [] },
      education: {},
      experience: [],
      projects: [],
      key_achievements: []
    };
  }
}

// Main AI research function with structured output
async function conductAIResearch(
  company: string, 
  role: string | undefined, 
  country: string | undefined,
  companyResearch: any,
  jobDescriptions: any,
  cvAnalysis: CVAnalysis | null,
  openaiApiKey: string
): Promise<AIResearchOutput> {
  
  // Build comprehensive research context
  let researchContext = `Company: ${company}`;
  if (role) researchContext += `\nRole: ${role}`;
  if (country) researchContext += `\nCountry: ${country}`;
  
  if (companyResearch) {
    researchContext += `\n\nCompany Research from Web:\n`;
    companyResearch.forEach((result: any, index: number) => {
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
  
  if (jobDescriptions && jobDescriptions.results) {
    researchContext += `\n\nJob Description Content:\n`;
    jobDescriptions.results.forEach((jd: any) => {
      if (jd.raw_content) {
        researchContext += `${jd.raw_content.slice(0, 2000)}\n`;
      }
    });
  }
  
  if (cvAnalysis) {
    researchContext += `\n\nCandidate Profile:\n`;
    researchContext += `Current Role: ${cvAnalysis.current_role || 'Not specified'}\n`;
    researchContext += `Experience: ${cvAnalysis.experience_years || 'Not specified'} years\n`;
    researchContext += `Technical Skills: ${cvAnalysis.skills.technical.join(', ')}\n`;
    researchContext += `Key Achievements: ${cvAnalysis.key_achievements.join(', ')}\n`;
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
          content: `You are an expert interview preparation consultant with deep knowledge of hiring practices across major companies. 

Based on the provided research context, create a comprehensive, personalized interview preparation guide. 

You MUST return ONLY valid JSON in this exact structure - no markdown, no additional text:

{
  "company_insights": {
    "name": "string",
    "industry": "string", 
    "culture": "string",
    "values": ["array of company values"],
    "interview_philosophy": "string",
    "recent_hiring_trends": "string"
  },
  "interview_stages": [
    {
      "name": "string",
      "order_index": number,
      "duration": "string",
      "interviewer": "string", 
      "content": "string",
      "guidance": "string",
      "preparation_tips": ["array of specific tips"],
      "common_questions": ["array of 4-6 questions"],
      "red_flags_to_avoid": ["array of things to avoid"]
    }
  ],
  "personalized_guidance": {
    "strengths_to_highlight": ["array based on candidate profile"],
    "areas_to_improve": ["array of improvement areas"],
    "suggested_stories": ["array of stories to prepare"],
    "skill_gaps": ["array of gaps to address"],
    "competitive_advantages": ["array of advantages"]
  },
  "preparation_timeline": {
    "weeks_before": ["array of tasks"],
    "week_before": ["array of tasks"],
    "day_before": ["array of tasks"], 
    "day_of": ["array of tasks"]
  }
}`
        },
        {
          role: 'user',
          content: `Based on this research context, create a comprehensive interview preparation guide:\n\n${researchContext}`
        }
      ],
      max_tokens: 4000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI research failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const researchResult = data.choices[0].message.content;
  
  try {
    return JSON.parse(researchResult);
  } catch (parseError) {
    console.error("Failed to parse AI research JSON:", parseError);
    console.error("Raw response:", researchResult);
    
    // Return fallback structure
    return {
      company_insights: {
        name: company,
        industry: "Unknown",
        culture: "Research in progress",
        values: [],
        interview_philosophy: "Standard interview process",
        recent_hiring_trends: "Information not available"
      },
      interview_stages: [
        {
          name: "Initial Screening",
          order_index: 1,
          duration: "30-45 minutes",
          interviewer: "HR/Recruiter",
          content: "Resume review and basic qualifications",
          guidance: "Prepare elevator pitch and company research",
          preparation_tips: ["Research company basics", "Prepare STAR stories"],
          common_questions: ["Tell me about yourself", "Why this company?"],
          red_flags_to_avoid: ["Lack of company knowledge", "Unclear career goals"]
        }
      ],
      personalized_guidance: {
        strengths_to_highlight: [],
        areas_to_improve: [],
        suggested_stories: [],
        skill_gaps: [],
        competitive_advantages: []
      },
      preparation_timeline: {
        weeks_before: ["Research company and role"],
        week_before: ["Practice common questions"],
        day_before: ["Review notes"],
        day_of: ["Arrive early"]
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
    // Get the request body
    const { company, role, country, roleLinks, cv, userId, searchId } = await req.json() as ResearchRequest;

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update search status to processing
    await supabase
      .from("searches")
      .update({ search_status: "processing" })
      .eq("id", searchId);

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("Missing OpenAI API key");
    }

    console.log("Starting enhanced interview research for", company, role || "");

    // Step 1: Conduct company research using Tavily
    console.log("Step 1: Conducting company research...");
    const companyResearch = await searchCompanyInfo(company, role, country);

    // Step 2: Extract job description content using Tavily
    console.log("Step 2: Extracting job descriptions...");
    const jobDescriptions = roleLinks && roleLinks.length > 0 
      ? await extractJobDescriptions(roleLinks) 
      : null;

    // Step 3: Analyze CV using AI
    console.log("Step 3: Analyzing CV...");
    const cvAnalysis = cv ? await analyzeCV(cv, openaiApiKey) : null;

    // Step 4: Conduct comprehensive AI research
    console.log("Step 4: Conducting AI research...");
    const aiResearchResult = await conductAIResearch(
      company, 
      role, 
      country, 
      companyResearch,
      jobDescriptions,
      cvAnalysis,
      openaiApiKey
    );

    console.log("Step 5: Storing structured results...");

    // Store interview stages and questions
    for (const stage of aiResearchResult.interview_stages) {
      // Insert stage
      const { data: stageData, error: stageError } = await supabase
        .from("interview_stages")
        .insert({
          search_id: searchId,
          name: stage.name,
          duration: stage.duration,
          interviewer: stage.interviewer,
          content: stage.content,
          guidance: `${stage.guidance}\n\nPreparation Tips:\n${stage.preparation_tips.join('\n')}\n\nRed Flags to Avoid:\n${stage.red_flags_to_avoid.join('\n')}`,
          order_index: stage.order_index
        })
        .select()
        .single();
      
      if (stageError) throw stageError;
      
      // Insert questions for this stage
      const questionsToInsert = stage.common_questions.map(question => ({
        stage_id: stageData.id,
        question
      }));
      
      const { error: questionsError } = await supabase
        .from("interview_questions")
        .insert(questionsToInsert);
      
      if (questionsError) throw questionsError;
    }

    // Save enhanced CV analysis if provided
    if (cv && cvAnalysis) {
      await supabase
        .from("resumes")
        .insert({
          user_id: userId,
          search_id: searchId,
          content: cv,
          parsed_data: cvAnalysis
        });
    }

    // Update search status to completed
    await supabase
      .from("searches")
      .update({ search_status: "completed" })
      .eq("id", searchId);

    console.log("Enhanced interview research completed successfully");

    return new Response(
      JSON.stringify({ 
        status: "success", 
        message: "Enhanced interview research completed",
        insights: {
          company_research_sources: companyResearch ? companyResearch.length : 0,
          job_descriptions_analyzed: jobDescriptions?.results?.length || 0,
          cv_analyzed: !!cvAnalysis,
          stages_created: aiResearchResult.interview_stages.length
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error processing enhanced interview research:", error);

    return new Response(
      JSON.stringify({ 
        status: "error", 
        message: error.message || "Failed to process enhanced interview research"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
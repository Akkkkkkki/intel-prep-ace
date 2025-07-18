import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SynthesisRequest {
  company: string;
  role?: string;
  country?: string;
  roleLinks?: string[];
  cv?: string;
  userId: string;
  searchId: string;
}

// Interfaces for final outputs that users see
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

// Call other microservices for data gathering
async function gatherCompanyData(company: string, role?: string, country?: string, searchId?: string) {
  try {
    console.log("Calling company-research function...");
    
    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/company-research`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        company,
        role,
        country,
        searchId
      }),
    });

    if (response.ok) {
      const result = await response.json();
      return result.company_insights;
    }
    
    console.warn("Company research failed, continuing without data");
    return null;
  } catch (error) {
    console.error("Error calling company-research:", error);
    return null;
  }
}

async function gatherJobData(roleLinks: string[], searchId: string, company?: string, role?: string) {
  if (!roleLinks || roleLinks.length === 0) {
    console.log("No role links provided, skipping job analysis");
    return null;
  }

  try {
    console.log("Calling job-analysis function...");
    
    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/job-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        roleLinks,
        searchId,
        company,
        role
      }),
    });

    if (response.ok) {
      const result = await response.json();
      return result.job_requirements;
    }
    
    console.warn("Job analysis failed, continuing without data");
    return null;
  } catch (error) {
    console.error("Error calling job-analysis:", error);
    return null;
  }
}

async function gatherCVData(cv: string, userId: string) {
  if (!cv) {
    console.log("No CV provided, skipping CV analysis");
    return null;
  }

  try {
    console.log("Calling cv-analysis function...");
    
    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/cv-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        cvText: cv,
        userId
      }),
    });

    if (response.ok) {
      const result = await response.json();
      return result.aiAnalysis;
    }
    
    console.warn("CV analysis failed, continuing without data");
    return null;
  } catch (error) {
    console.error("Error calling cv-analysis:", error);
    return null;
  }
}

// Main AI synthesis function - generates all final user outputs
async function conductInterviewSynthesis(
  company: string, 
  role: string | undefined, 
  country: string | undefined,
  companyInsights: any,
  jobRequirements: any,
  cvAnalysis: any,
  openaiApiKey: string
): Promise<AIResearchOutput> {
  
  // Build comprehensive context from all gathered data
  let synthesisContext = `Company: ${company}`;
  if (role) synthesisContext += `\nRole: ${role}`;
  if (country) synthesisContext += `\nCountry: ${country}`;
  
  if (companyInsights) {
    synthesisContext += `\n\nCompany Insights:\n`;
    synthesisContext += `Industry: ${companyInsights.industry}\n`;
    synthesisContext += `Culture: ${companyInsights.culture}\n`;
    synthesisContext += `Values: ${companyInsights.values?.join(', ')}\n`;
    synthesisContext += `Interview Philosophy: ${companyInsights.interview_philosophy}\n`;
    synthesisContext += `Hiring Trends: ${companyInsights.recent_hiring_trends}\n`;
  }
  
  if (jobRequirements) {
    synthesisContext += `\n\nJob Requirements:\n`;
    synthesisContext += `Technical Skills: ${jobRequirements.technical_skills?.join(', ')}\n`;
    synthesisContext += `Soft Skills: ${jobRequirements.soft_skills?.join(', ')}\n`;
    synthesisContext += `Experience Level: ${jobRequirements.experience_level}\n`;
    synthesisContext += `Responsibilities: ${jobRequirements.responsibilities?.join(', ')}\n`;
    synthesisContext += `Qualifications: ${jobRequirements.qualifications?.join(', ')}\n`;
  }
  
  if (cvAnalysis) {
    synthesisContext += `\n\nCandidate Profile:\n`;
    synthesisContext += `Current Role: ${cvAnalysis.current_role || 'Not specified'}\n`;
    synthesisContext += `Experience: ${cvAnalysis.experience_years || 'Not specified'} years\n`;
    synthesisContext += `Technical Skills: ${cvAnalysis.skills?.technical?.join(', ')}\n`;
    synthesisContext += `Key Achievements: ${cvAnalysis.key_achievements?.join(', ')}\n`;
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
          content: `Based on this research context, create a comprehensive interview preparation guide:\n\n${synthesisContext}`
        }
      ],
      max_tokens: 4000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI synthesis failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const synthesisResult = data.choices[0].message.content;
  
  try {
    return JSON.parse(synthesisResult);
  } catch (parseError) {
    console.error("Failed to parse AI synthesis JSON:", parseError);
    console.error("Raw response:", synthesisResult);
    
    // Return fallback structure with basic interview stages
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
        },
        {
          name: "Technical Interview",
          order_index: 2,
          duration: "60-90 minutes",
          interviewer: "Hiring Manager/Team Lead",
          content: "Technical skills assessment",
          guidance: "Review technical requirements and practice coding",
          preparation_tips: ["Practice coding problems", "Review system design"],
          common_questions: ["Explain your technical approach", "Code this problem"],
          red_flags_to_avoid: ["Unable to explain reasoning", "Poor coding practices"]
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
    const { company, role, country, roleLinks, cv, userId, searchId } = await req.json() as SynthesisRequest;

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

    console.log("Starting interview synthesis for", company, role || "");

    // Step 1: Gather data from microservices (can run in parallel)
    console.log("Gathering data from microservices...");
    const [companyInsights, jobRequirements, cvAnalysis] = await Promise.all([
      gatherCompanyData(company, role, country, searchId),
      gatherJobData(roleLinks || [], searchId, company, role), 
      gatherCVData(cv || "", userId)
    ]);

    // Step 2: Conduct AI synthesis to generate final outputs
    console.log("Conducting AI synthesis...");
    const synthesisResult = await conductInterviewSynthesis(
      company, 
      role, 
      country, 
      companyInsights,
      jobRequirements,
      cvAnalysis,
      openaiApiKey
    );

    console.log("Storing final results...");

    // Step 3: Store interview stages and questions in database
    for (const stage of synthesisResult.interview_stages) {
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

    // Step 4: Save CV analysis if provided
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

    // Step 5: Update search status to completed
    await supabase
      .from("searches")
      .update({ search_status: "completed" })
      .eq("id", searchId);

    console.log("Interview synthesis completed successfully");

    return new Response(
      JSON.stringify({ 
        status: "success", 
        message: "Interview synthesis completed",
        insights: {
          company_data_found: !!companyInsights,
          job_data_found: !!jobRequirements,
          cv_analyzed: !!cvAnalysis,
          stages_created: synthesisResult.interview_stages.length,
          personalized_guidance: synthesisResult.personalized_guidance
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error processing interview synthesis:", error);

    // Update search status to failed
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { searchId } = await req.json();
      if (searchId) {
        await supabase
          .from("searches")
          .update({ search_status: "failed" })
          .eq("id", searchId);
      }
    } catch (updateError) {
      console.error("Failed to update search status:", updateError);
    }

    return new Response(
      JSON.stringify({ 
        status: "error", 
        message: error.message || "Failed to process interview synthesis"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
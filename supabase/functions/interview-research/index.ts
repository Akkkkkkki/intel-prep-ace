import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";
import { SearchLogger } from "../_shared/logger.ts";
import { RESEARCH_CONFIG } from "../_shared/config.ts";

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
  interview_stages?: InterviewStageStructured[];
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
  cv_job_comparison: any;
  enhanced_question_bank: any;
  preparation_priorities: string[];
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
      return result; // Return the full result with both aiAnalysis and parsedData
    }
    
    console.warn("CV analysis failed, continuing without data");
    return null;
  } catch (error) {
    console.error("Error calling cv-analysis:", error);
    return null;
  }
}

async function generateCVJobComparison(
  searchId: string,
  userId: string,
  cvAnalysis: any,
  jobRequirements: any,
  companyInsights: any
) {
  if (!cvAnalysis || !jobRequirements) {
    console.log("Insufficient data for CV-Job comparison");
    return null;
  }

  try {
    console.log("Calling cv-job-comparison function...");
    
    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/cv-job-comparison`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        searchId,
        userId,
        cvAnalysis,
        jobRequirements,
        companyInsights
      }),
    });

    if (response.ok) {
      const result = await response.json();
      return result.comparison_result;
    }
    
    console.warn("CV-Job comparison failed, continuing without data");
    return null;
  } catch (error) {
    console.error("Error calling cv-job-comparison:", error);
    return null;
  }
}

async function generateEnhancedQuestions(
  searchId: string,
  userId: string,
  companyInsights: any,
  jobRequirements: any,
  cvAnalysis: any,
  interviewStages: any[]
) {
  try {
    console.log("Calling interview-question-generator function...");
    
    const questionPromises = interviewStages.map(async (stage) => {
      const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/interview-question-generator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          searchId,
          userId,
          companyInsights,
          jobRequirements,
          cvAnalysis,
          interviewStage: stage.name,
          stageDetails: stage
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return { stage: stage.name, questions: result.question_bank };
      }
      return null;
    });

    const results = await Promise.all(questionPromises);
    return results.filter(r => r !== null);
  } catch (error) {
    console.error("Error calling interview-question-generator:", error);
    return [];
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
    
    // Include interview stages if available from company research
    if (companyInsights.interview_stages && companyInsights.interview_stages.length > 0) {
      synthesisContext += `\nInterview Stages (from candidate reports):\n`;
      companyInsights.interview_stages.forEach((stage: any, index: number) => {
        synthesisContext += `Stage ${index + 1}: ${stage.name}\n`;
        synthesisContext += `Duration: ${stage.duration}\n`;
        synthesisContext += `Interviewer: ${stage.interviewer}\n`;
        synthesisContext += `Content: ${stage.content}\n`;
        if (stage.common_questions && stage.common_questions.length > 0) {
          synthesisContext += `Common Questions: ${stage.common_questions.join(', ')}\n`;
        }
        if (stage.success_tips && stage.success_tips.length > 0) {
          synthesisContext += `Success Tips: ${stage.success_tips.join(', ')}\n`;
        }
        synthesisContext += `\n`;
      });
    }
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
    // Use aiAnalysis for processing context (raw data structure)
    const analysisData = cvAnalysis.aiAnalysis || cvAnalysis;
    synthesisContext += `\n\nCandidate Profile:\n`;
    synthesisContext += `Current Role: ${analysisData.current_role || 'Not specified'}\n`;
    synthesisContext += `Experience: ${analysisData.experience_years || 'Not specified'} years\n`;
    synthesisContext += `Technical Skills: ${analysisData.skills?.technical?.join(', ')}\n`;
    synthesisContext += `Key Achievements: ${analysisData.key_achievements?.join(', ')}\n`;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: RESEARCH_CONFIG.openai.model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: 'system',
          content: `You are an expert interview preparation consultant with deep knowledge of hiring practices across major companies. 

Based on the provided research context, create a comprehensive, personalized interview preparation guide. Use the interview stages from company research if available, otherwise create appropriate stages.

CRITICAL REQUIREMENTS:
1. Use interview stages from company research data if provided
2. Generate personalized guidance based on candidate's CV and job requirements
3. Create specific preparation strategies that align with company culture and values
4. Provide actionable timeline for interview preparation

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
      max_tokens: RESEARCH_CONFIG.openai.maxTokens.interviewSynthesis,
      temperature: RESEARCH_CONFIG.openai.temperature.synthesis,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI synthesis failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const synthesisResult = data.choices[0].message.content;
  
  try {
    const parsedResult = JSON.parse(synthesisResult);
    
    // Use interview stages from company research if available
    if (companyInsights?.interview_stages && companyInsights.interview_stages.length > 0) {
      parsedResult.interview_stages = companyInsights.interview_stages.map((stage: any, index: number) => ({
        name: stage.name,
        order_index: stage.order_index || index + 1,
        duration: stage.duration,
        interviewer: stage.interviewer,
        content: stage.content,
        guidance: `Based on candidate reports: ${stage.content}`,
        preparation_tips: stage.success_tips || [],
        common_questions: stage.common_questions || [],
        red_flags_to_avoid: []
      }));
    }
    
    return parsedResult;
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
          name: "Initial Phone/Video Screening",
          order_index: 1,
          duration: "30-45 minutes",
          interviewer: "HR Recruiter or Talent Acquisition",
          content: "Resume review, basic qualifications check, and cultural fit assessment",
          guidance: "Prepare your elevator pitch, research the company thoroughly, and be ready to discuss your career motivations",
          preparation_tips: ["Practice 2-minute elevator pitch", "Research company mission and values", "Prepare 3-5 STAR stories", "Review job description thoroughly"],
          common_questions: ["Tell me about yourself", "Why are you interested in this role?", "Why this company?", "Walk me through your resume", "What are your salary expectations?"],
          red_flags_to_avoid: ["Lack of company knowledge", "Unclear career goals", "Negative comments about previous employers", "Unrealistic salary expectations"]
        },
        {
          name: "Technical Assessment",
          order_index: 2,
          duration: "60-90 minutes",
          interviewer: "Senior Developer or Technical Lead",
          content: "Technical skills evaluation, coding challenges, and problem-solving assessment",
          guidance: "Review core technical concepts, practice coding problems, and prepare to explain your thought process clearly",
          preparation_tips: ["Practice coding problems on relevant platforms", "Review system design concepts", "Prepare technical questions to ask", "Practice explaining code verbally"],
          common_questions: ["Solve this coding problem", "Explain your approach to system design", "How would you optimize this code?", "Tell me about a challenging technical problem you solved"],
          red_flags_to_avoid: ["Unable to explain reasoning", "Poor coding practices", "Giving up too quickly on problems", "Not asking clarifying questions"]
        },
        {
          name: "Team/Behavioral Interview",
          order_index: 3,
          duration: "45-60 minutes",
          interviewer: "Hiring Manager and/or Team Members",
          content: "Behavioral questions, team fit assessment, and leadership scenarios",
          guidance: "Focus on demonstrating collaboration skills, leadership experience, and alignment with team culture",
          preparation_tips: ["Prepare detailed STAR stories for each core competency", "Research team structure and dynamics", "Think of examples showing leadership and collaboration", "Prepare thoughtful questions about team processes"],
          common_questions: ["Tell me about a time you led a team", "Describe a conflict you resolved", "How do you handle tight deadlines?", "Give an example of learning from failure"],
          red_flags_to_avoid: ["Inability to give specific examples", "Blaming others for failures", "Showing poor communication skills", "Lack of self-awareness"]
        },
        {
          name: "Final Round/Executive Interview",
          order_index: 4,
          duration: "30-45 minutes",
          interviewer: "Senior Manager or Director",
          content: "Strategic thinking, long-term vision, and final cultural fit assessment",
          guidance: "Demonstrate strategic thinking, show understanding of business context, and articulate your long-term career vision",
          preparation_tips: ["Research company strategy and industry trends", "Prepare vision for role and career growth", "Think about strategic challenges the company faces", "Prepare executive-level questions"],
          common_questions: ["Where do you see yourself in 5 years?", "How would you approach the first 90 days?", "What challenges do you see in this industry?", "How do you stay current with industry trends?"],
          red_flags_to_avoid: ["Lack of strategic thinking", "No questions for interviewer", "Unclear long-term goals", "Insufficient business awareness"]
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

    // Initialize logger
    const logger = new SearchLogger(searchId, 'interview-research', userId);
    logger.log('REQUEST_INPUT', 'VALIDATION', { company, role, country, roleLinks: roleLinks?.length, hasCv: !!cv, userId });

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
    logger.log('STEP_START', 'DATA_GATHERING', { step: 1, description: 'Gathering data from microservices' });
    console.log("Gathering data from microservices...");
    
    const startTime = Date.now();
    const [companyInsights, jobRequirements, cvAnalysis] = await Promise.all([
      gatherCompanyData(company, role, country, searchId),
      gatherJobData(roleLinks || [], searchId, company, role), 
      gatherCVData(cv || "", userId)
    ]);
    const duration = Date.now() - startTime;
    
    logger.log('DATA_GATHERING_COMPLETE', 'MICROSERVICES', { 
      duration,
      companyInsightsFound: !!companyInsights,
      jobRequirementsFound: !!jobRequirements,
      cvAnalysisFound: !!cvAnalysis,
      companyInterviewStages: companyInsights?.interview_stages?.length || 0
    });

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

    // Step 3: Generate enhanced CV-Job comparison
    console.log("Generating CV-Job comparison...");
    const cvJobComparison = await generateCVJobComparison(
      searchId,
      userId,
      cvAnalysis?.aiAnalysis || cvAnalysis, // Use aiAnalysis for processing
      jobRequirements,
      companyInsights
    );

    // Step 4: Generate enhanced question bank for each stage
    console.log("Generating enhanced question bank...");
    const enhancedQuestions = await generateEnhancedQuestions(
      searchId,
      userId,
      companyInsights,
      jobRequirements,
      cvAnalysis?.aiAnalysis || cvAnalysis, // Use aiAnalysis for processing
      synthesisResult.interview_stages
    );

    console.log("Storing final results...");

    // Step 5: Store interview stages and questions in database
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

    // Step 6: Save CV analysis if provided
    if (cv && cvAnalysis) {
      try {
        console.log("Saving CV analysis to resumes table...");
        console.log("CV Analysis structure:", Object.keys(cvAnalysis));
        
        const resumeData = {
          user_id: userId,
          search_id: searchId,
          content: cv,
          parsed_data: cvAnalysis.parsedData || cvAnalysis // Use parsedData if available, otherwise fallback to cvAnalysis
        };
        
        console.log("Resume data to save:", {
          user_id: userId,
          search_id: searchId,
          content_length: cv.length,
          has_parsed_data: !!(cvAnalysis.parsedData || cvAnalysis)
        });
        
        const { data: resumeResult, error: resumeError } = await supabase
          .from("resumes")
          .insert(resumeData)
          .select()
          .single();
          
        if (resumeError) {
          console.error("Error saving resume:", resumeError);
          throw resumeError;
        }
        
        console.log("Successfully saved resume with ID:", resumeResult.id);
        logger.log('CV_SAVED', 'DATABASE', { 
          resumeId: resumeResult.id,
          userId,
          searchId,
          hasStructuredData: !!resumeResult.full_name
        });
        
      } catch (error) {
        console.error("Failed to save CV analysis:", error);
        logger.log('CV_SAVE_ERROR', 'DATABASE', { error: error.message, userId, searchId });
        // Continue processing even if CV save fails
      }
    } else {
      console.log("Skipping CV save - cv:", !!cv, "cvAnalysis:", !!cvAnalysis);
    }

    // Step 7: Store enhanced question bank and comparison data
    if (cvJobComparison) {
      await supabase
        .from("cv_job_comparisons")
        .insert({
          search_id: searchId,
          user_id: userId,
          skill_gap_analysis: cvJobComparison.skill_gap_analysis,
          experience_gap_analysis: cvJobComparison.experience_gap_analysis,
          personalized_story_bank: cvJobComparison.personalized_story_bank,
          interview_prep_strategy: cvJobComparison.interview_prep_strategy,
          overall_fit_score: cvJobComparison.overall_fit_score,
          preparation_priorities: cvJobComparison.preparation_priorities
        });
    }

    // Store enhanced question banks for each stage
    if (enhancedQuestions && enhancedQuestions.length > 0) {
      for (const stageQuestions of enhancedQuestions) {
        await supabase
          .from("enhanced_question_banks")
          .insert({
            search_id: searchId,
            user_id: userId,
            interview_stage: stageQuestions.stage,
            behavioral_questions: stageQuestions.questions.behavioral_questions || [],
            technical_questions: stageQuestions.questions.technical_questions || [],
            situational_questions: stageQuestions.questions.situational_questions || [],
            company_specific_questions: stageQuestions.questions.company_specific_questions || [],
            role_specific_questions: stageQuestions.questions.role_specific_questions || [],
            experience_based_questions: stageQuestions.questions.experience_based_questions || [],
            cultural_fit_questions: stageQuestions.questions.cultural_fit_questions || [],
            generation_context: {
              company_insights: !!companyInsights,
              job_requirements: !!jobRequirements,
              cv_analysis: !!cvAnalysis
            }
          });
      }
    }

    // Step 8: Update search status to completed
    await supabase
      .from("searches")
      .update({ 
        search_status: "completed",
        cv_job_comparison: cvJobComparison,
        enhanced_question_bank: enhancedQuestions,
        preparation_priorities: cvJobComparison?.preparation_priorities || [],
        overall_fit_score: cvJobComparison?.overall_fit_score || 0
      })
      .eq("id", searchId);

    console.log("Interview synthesis completed successfully");

    const responseData = { 
      status: "success", 
      message: "Interview synthesis completed",
      insights: {
        company_data_found: !!companyInsights,
        job_data_found: !!jobRequirements,
        cv_analyzed: !!cvAnalysis,
        stages_created: synthesisResult.interview_stages.length,
        personalized_guidance: synthesisResult.personalized_guidance,
        cv_job_comparison: cvJobComparison,
        enhanced_questions: enhancedQuestions,
        preparation_priorities: cvJobComparison?.preparation_priorities || [],
        overall_fit_score: cvJobComparison?.overall_fit_score || 0
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
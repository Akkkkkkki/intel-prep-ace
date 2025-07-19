import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QuestionGenerationRequest {
  searchId: string;
  userId: string;
  companyInsights: any;
  jobRequirements: any;
  cvAnalysis: any;
  interviewStage: string;
  stageDetails: any;
}

interface GeneratedQuestion {
  question: string;
  type: string;
  difficulty: string;
  rationale: string;
  suggested_answer_approach: string;
  evaluation_criteria: string[];
  follow_up_questions: string[];
  star_story_fit: boolean;
  company_context: string;
}

interface QuestionBank {
  behavioral_questions: GeneratedQuestion[];
  technical_questions: GeneratedQuestion[];
  situational_questions: GeneratedQuestion[];
  company_specific_questions: GeneratedQuestion[];
  role_specific_questions: GeneratedQuestion[];
  experience_based_questions: GeneratedQuestion[];
  cultural_fit_questions: GeneratedQuestion[];
}

// AI-powered interview question generation based on all gathered data
async function generateInterviewQuestions(
  companyInsights: any,
  jobRequirements: any,
  cvAnalysis: any,
  interviewStage: string,
  stageDetails: any,
  openaiApiKey: string
): Promise<QuestionBank> {
  
  let questionContext = `Interview Question Generation Context:\n\n`;
  
  questionContext += `INTERVIEW STAGE: ${interviewStage}\n`;
  if (stageDetails) {
    questionContext += `Stage Details: ${JSON.stringify(stageDetails)}\n`;
  }
  
  // Build company context
  if (companyInsights) {
    questionContext += `\nCOMPANY INSIGHTS:\n`;
    questionContext += `Company: ${companyInsights.name}\n`;
    questionContext += `Industry: ${companyInsights.industry}\n`;
    questionContext += `Culture: ${companyInsights.culture}\n`;
    questionContext += `Values: ${companyInsights.values?.join(', ')}\n`;
    questionContext += `Interview Philosophy: ${companyInsights.interview_philosophy}\n`;
    
    if (companyInsights.interview_questions_bank) {
      questionContext += `\nACTUAL QUESTIONS FROM REVIEWS:\n`;
      questionContext += `Behavioral: ${companyInsights.interview_questions_bank.behavioral?.join(', ')}\n`;
      questionContext += `Technical: ${companyInsights.interview_questions_bank.technical?.join(', ')}\n`;
      questionContext += `Situational: ${companyInsights.interview_questions_bank.situational?.join(', ')}\n`;
      questionContext += `Company Specific: ${companyInsights.interview_questions_bank.company_specific?.join(', ')}\n`;
    }
    
    if (companyInsights.hiring_manager_insights) {
      questionContext += `\nHIRING MANAGER INSIGHTS:\n`;
      questionContext += `What They Look For: ${companyInsights.hiring_manager_insights.what_they_look_for?.join(', ')}\n`;
      questionContext += `Red Flags: ${companyInsights.hiring_manager_insights.red_flags?.join(', ')}\n`;
      questionContext += `Success Factors: ${companyInsights.hiring_manager_insights.success_factors?.join(', ')}\n`;
    }
  }
  
  // Build job requirements context
  if (jobRequirements) {
    questionContext += `\nJOB REQUIREMENTS:\n`;
    questionContext += `Technical Skills: ${jobRequirements.technical_skills?.join(', ')}\n`;
    questionContext += `Soft Skills: ${jobRequirements.soft_skills?.join(', ')}\n`;
    questionContext += `Experience Level: ${jobRequirements.experience_level}\n`;
    questionContext += `Key Responsibilities: ${jobRequirements.responsibilities?.join(', ')}\n`;
    questionContext += `Qualifications: ${jobRequirements.qualifications?.join(', ')}\n`;
    questionContext += `Interview Process Hints: ${jobRequirements.interview_process_hints?.join(', ')}\n`;
  }
  
  // Build candidate context
  if (cvAnalysis) {
    const experienceYears = cvAnalysis.experience_years || 0;
    let experienceLevel = 'junior';
    if (experienceYears >= 8) experienceLevel = 'senior';
    else if (experienceYears >= 3) experienceLevel = 'mid';
    
    questionContext += `\nCANDIDATE PROFILE:\n`;
    questionContext += `Current Role: ${cvAnalysis.current_role}\n`;
    questionContext += `Experience: ${experienceYears} years (${experienceLevel} level)\n`;
    questionContext += `Experience Level: ${experienceLevel.toUpperCase()} - Adjust question difficulty and quantity accordingly\n`;
    questionContext += `Technical Skills: ${cvAnalysis.skills?.technical?.join(', ')}\n`;
    questionContext += `Key Achievements: ${cvAnalysis.key_achievements?.join(', ')}\n`;
    questionContext += `Experience History: ${cvAnalysis.experience?.map(exp => `${exp.role} at ${exp.company}`).join(', ')}\n`;
    
    // Add specific guidance based on experience level
    if (experienceLevel === 'junior') {
      questionContext += `\nFOCUS FOR JUNIOR CANDIDATE: Fundamentals, learning ability, potential, adaptability. Generate 6-8 questions per category.\n`;
    } else if (experienceLevel === 'mid') {
      questionContext += `\nFOCUS FOR MID-LEVEL CANDIDATE: Execution, problem-solving, leadership potential, project management. Generate 8-10 questions per category.\n`;
    } else {
      questionContext += `\nFOCUS FOR SENIOR CANDIDATE: Strategic thinking, mentorship, complex problem-solving, system design, team leadership. Generate 10-12 questions per category.\n`;
    }
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
          content: `You are an expert interview preparation specialist with deep knowledge of hiring practices across major companies. Generate comprehensive, realistic interview questions based on the provided context.

Focus on:
1. Generate COMPREHENSIVE question banks based on candidate's experience level (junior: 8-12 per category, mid: 12-15 per category, senior: 15-20 per category)
2. Questions that align with the company's interview philosophy and culture
3. Questions that test for the specific skills and experience required for the role seniority
4. Questions that are appropriate for the interview stage and candidate level
5. Questions that leverage actual interview experiences from reviews
6. Questions that are personalized to the candidate's background and experience
7. Use recent interview trends and current industry practices
8. Ensure total questions across all categories reach AT LEAST 80-120 questions for a comprehensive practice experience

MANDATORY MINIMUM REQUIREMENTS:
- Each category MUST contain at least 8-20 questions depending on experience level
- Total question bank MUST exceed 80 questions for junior, 100+ for mid-level, 120+ for senior
- Include diverse question types within each category (situational, hypothetical, past experience, problem-solving)
- Generate questions of varying difficulty levels within each category

For each question, provide:
- The specific question
- Question type and difficulty (adjust difficulty based on candidate experience)
- Rationale for why this question would be asked
- Suggested answer approach
- Evaluation criteria interviewers would use
- Potential follow-up questions
- Whether it's suitable for STAR method
- Company-specific context

CRITICAL REQUIREMENTS - STRICTLY ENFORCE: 
- For junior candidates (0-2 years): Focus on fundamentals, learning ability, potential. Generate 8-12 questions per category. MINIMUM 80 total questions.
- For mid-level candidates (3-7 years): Focus on execution, problem-solving, leadership potential. Generate 12-15 questions per category. MINIMUM 100 total questions.
- For senior candidates (8+ years): Focus on strategic thinking, mentorship, complex problem-solving. Generate 15-20 questions per category. MINIMUM 120 total questions.
- EACH category must be fully populated - no empty or sparse categories allowed.
- Include mix of difficulty levels: 30% Easy, 50% Medium, 20% Hard within each category.
- ABSOLUTELY NO SHORTCUTS - generate the full question count specified above.

You MUST return ONLY valid JSON in this exact structure - no markdown, no additional text:

{
  "behavioral_questions": [
    {
      "question": "specific question",
      "type": "behavioral",
      "difficulty": "Easy/Medium/Hard",
      "rationale": "why this question is asked",
      "suggested_answer_approach": "how to approach answering",
      "evaluation_criteria": ["what interviewers look for"],
      "follow_up_questions": ["potential follow-ups"],
      "star_story_fit": true/false,
      "company_context": "company-specific context"
    }
  ],
  "technical_questions": [
    {
      "question": "specific question",
      "type": "technical",
      "difficulty": "Easy/Medium/Hard",
      "rationale": "why this question is asked",
      "suggested_answer_approach": "how to approach answering",
      "evaluation_criteria": ["what interviewers look for"],
      "follow_up_questions": ["potential follow-ups"],
      "star_story_fit": true/false,
      "company_context": "company-specific context"
    }
  ],
  "situational_questions": [
    {
      "question": "specific question",
      "type": "situational",
      "difficulty": "Easy/Medium/Hard",
      "rationale": "why this question is asked",
      "suggested_answer_approach": "how to approach answering",
      "evaluation_criteria": ["what interviewers look for"],
      "follow_up_questions": ["potential follow-ups"],
      "star_story_fit": true/false,
      "company_context": "company-specific context"
    }
  ],
  "company_specific_questions": [
    {
      "question": "specific question",
      "type": "company_specific",
      "difficulty": "Easy/Medium/Hard",
      "rationale": "why this question is asked",
      "suggested_answer_approach": "how to approach answering",
      "evaluation_criteria": ["what interviewers look for"],
      "follow_up_questions": ["potential follow-ups"],
      "star_story_fit": true/false,
      "company_context": "company-specific context"
    }
  ],
  "role_specific_questions": [
    {
      "question": "specific question",
      "type": "role_specific",
      "difficulty": "Easy/Medium/Hard",
      "rationale": "why this question is asked",
      "suggested_answer_approach": "how to approach answering",
      "evaluation_criteria": ["what interviewers look for"],
      "follow_up_questions": ["potential follow-ups"],
      "star_story_fit": true/false,
      "company_context": "company-specific context"
    }
  ],
  "experience_based_questions": [
    {
      "question": "specific question",
      "type": "experience_based",
      "difficulty": "Easy/Medium/Hard",
      "rationale": "why this question is asked",
      "suggested_answer_approach": "how to approach answering",
      "evaluation_criteria": ["what interviewers look for"],
      "follow_up_questions": ["potential follow-ups"],
      "star_story_fit": true/false,
      "company_context": "company-specific context"
    }
  ],
  "cultural_fit_questions": [
    {
      "question": "specific question",
      "type": "cultural_fit",
      "difficulty": "Easy/Medium/Hard",
      "rationale": "why this question is asked",
      "suggested_answer_approach": "how to approach answering",
      "evaluation_criteria": ["what interviewers look for"],
      "follow_up_questions": ["potential follow-ups"],
      "star_story_fit": true/false,
      "company_context": "company-specific context"
    }
  ]
}`
        },
        {
          role: 'user',
          content: `Generate comprehensive interview questions based on this context:\n\n${questionContext}`
        }
      ],
      max_tokens: 8000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`Question generation failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const questionResult = data.choices[0].message.content;
  
  try {
    return JSON.parse(questionResult);
  } catch (parseError) {
    console.error("Failed to parse question generation JSON:", parseError);
    
    // Return fallback structure
    return {
      behavioral_questions: [],
      technical_questions: [],
      situational_questions: [],
      company_specific_questions: [],
      role_specific_questions: [],
      experience_based_questions: [],
      cultural_fit_questions: []
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { searchId, userId, companyInsights, jobRequirements, cvAnalysis, interviewStage, stageDetails } = await req.json() as QuestionGenerationRequest;

    if (!searchId || !userId) {
      throw new Error("Missing required parameters: searchId and userId");
    }

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("Missing OpenAI API key");
    }

    console.log("Starting interview question generation for search:", searchId, "stage:", interviewStage);

    // Generate comprehensive question bank
    const questionBank = await generateInterviewQuestions(
      companyInsights,
      jobRequirements,
      cvAnalysis,
      interviewStage,
      stageDetails,
      openaiApiKey
    );

    console.log("Interview question generation completed successfully");

    return new Response(
      JSON.stringify({ 
        status: "success", 
        message: "Interview questions generated successfully",
        question_bank: questionBank,
        total_questions: Object.values(questionBank).reduce((sum, questions) => sum + questions.length, 0)
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error processing interview question generation:", error);

    return new Response(
      JSON.stringify({ 
        status: "error", 
        message: error.message || "Failed to generate interview questions"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
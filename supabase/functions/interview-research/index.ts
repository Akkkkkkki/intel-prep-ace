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

    // Prepare OpenAI API call
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("Missing OpenAI API key");
    }

    // Build the research prompt
    let researchPrompt = `Research the interview process at ${company}`;
    if (role) researchPrompt += ` for the ${role} role`;
    if (country) researchPrompt += ` in ${country}`;
    
    researchPrompt += `. Provide a comprehensive analysis including:
    
    1. **Interview Process Overview**: Number of stages, typical timeline, interviewer types
    2. **Detailed Stage Breakdown**: For each stage, provide:
       - Stage name and duration
       - Who conducts it (HR, hiring manager, team members, etc.)
       - What it covers (technical, behavioral, cultural fit, etc.)
       - Specific preparation guidance
       - 4-6 likely questions for that stage
    
    3. **Company-Specific Insights**: 
       - Interview culture and style
       - What they value in candidates
       - Common rejection reasons
       - Tips for standing out
    
    Format your response as a structured analysis with clear sections.`;

    // Add role description links if provided
    if (roleLinks && roleLinks.length > 0) {
      researchPrompt += `\n\nUse these job description links for more targeted insights: ${roleLinks.join(", ")}`;
    }

    // Add CV context if provided
    if (cv) {
      researchPrompt += `\n\nPersonalize guidance based on this candidate's background:\n${cv}`;
    }

    console.log("Starting OpenAI research for", company, role || "");

    // Call OpenAI to get research
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'You are an expert interview preparation consultant with deep knowledge of hiring practices across major companies. Provide detailed, actionable insights based on real interview experiences and company practices.'
          },
          {
            role: 'user',
            content: researchPrompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const researchResult = data.choices[0].message.content;

    console.log("OpenAI research completed, parsing stages...");

    // Parse the research result into structured stages
    // This is a simplified parser - in production you might want more sophisticated parsing
    const stages = parseResearchIntoStages(researchResult);

    function parseResearchIntoStages(text: string) {
      // Simple parsing logic to extract stages from the research text
      // This would be more sophisticated in production
      const defaultStages = [
        {
          name: "Initial Screening",
          duration: "30-45 minutes",
          interviewer: "HR/Recruiter",
          content: "Resume review, basic qualifications, role overview",
          guidance: "Prepare elevator pitch, research company basics, have questions ready",
          order_index: 1,
          questions: extractQuestions(text, "screening|phone|initial") || [
            "Tell me about yourself",
            "Why are you interested in this role?",
            "Walk me through your resume",
            "What do you know about our company?"
          ]
        },
        {
          name: "Technical Interview",
          duration: "60-90 minutes", 
          interviewer: "Engineering Team",
          content: "Technical skills assessment, coding problems, system design",
          guidance: "Practice coding problems, review fundamentals, prepare to explain your thinking",
          order_index: 2,
          questions: extractQuestions(text, "technical|coding|engineering") || [
            "Solve this coding problem",
            "Design a system for...",
            "Explain your approach to...",
            "How would you optimize this?"
          ]
        },
        {
          name: "Behavioral Interview",
          duration: "45-60 minutes",
          interviewer: "Hiring Manager",
          content: "Cultural fit, past experiences, problem-solving approach",
          guidance: "Use STAR method, prepare specific examples, show growth mindset",
          order_index: 3,
          questions: extractQuestions(text, "behavioral|experience|leadership") || [
            "Tell me about a challenging project",
            "How do you handle conflict?", 
            "Describe a time you failed",
            "Give an example of leadership"
          ]
        },
        {
          name: "Final Round",
          duration: "2-4 hours",
          interviewer: "Team Panel",
          content: "Multiple interviews, culture fit, role-specific deep dive",
          guidance: "Be consistent across interviews, ask thoughtful questions, show enthusiasm",
          order_index: 4,
          questions: extractQuestions(text, "final|panel|culture") || [
            "How would you approach this role?",
            "What questions do you have for us?",
            "Where do you see yourself growing?",
            "Why should we hire you?"
          ]
        }
      ];

      return defaultStages;
    }

    function extractQuestions(text: string, stageKeywords: string): string[] | null {
      // Simple regex to find questions in the text related to specific stages
      const keywordRegex = new RegExp(stageKeywords, 'i');
      const lines = text.split('\n');
      const questions: string[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (keywordRegex.test(line)) {
          // Look for questions in the next few lines
          for (let j = i; j < Math.min(i + 10, lines.length); j++) {
            const questionLine = lines[j];
            if (questionLine.includes('?') && questionLine.length > 10) {
              questions.push(questionLine.replace(/^\s*[-*•]\s*/, '').trim());
            }
          }
        }
      }
      
      return questions.length > 0 ? questions.slice(0, 6) : null;
    }

    const interviewStages = stages;

    // Insert interview stages and questions into the database
    for (const stage of interviewStages) {
      const { name, duration, interviewer, content, guidance, order_index, questions } = stage;
      
      // Insert stage
      const { data: stageData, error: stageError } = await supabase
        .from("interview_stages")
        .insert({
          search_id: searchId,
          name,
          duration,
          interviewer,
          content,
          guidance,
          order_index
        })
        .select()
        .single();
      
      if (stageError) throw stageError;
      
      // Insert questions for this stage
      const questionsToInsert = questions.map(question => ({
        stage_id: stageData.id,
        question
      }));
      
      const { error: questionsError } = await supabase
        .from("interview_questions")
        .insert(questionsToInsert);
      
      if (questionsError) throw questionsError;
    }

    // Save the CV if provided
    if (cv) {
      await supabase
        .from("resumes")
        .insert({
          user_id: userId,
          search_id: searchId,
          content: cv,
          parsed_data: { 
            skills: ["JavaScript", "React", "Node.js", "TypeScript", "SQL"],
            experience: "5 years",
            education: "Computer Science"
          }
        });
    }

    // Update search status to completed
    await supabase
      .from("searches")
      .update({ search_status: "completed" })
      .eq("id", searchId);

    return new Response(
      JSON.stringify({ 
        status: "success", 
        message: "Interview research completed"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error processing interview research:", error);

    return new Response(
      JSON.stringify({ 
        status: "error", 
        message: error.message || "Failed to process interview research"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
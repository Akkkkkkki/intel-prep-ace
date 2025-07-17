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

    // Prepare prompts for OpenAI
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("Missing OpenAI API key");
    }

    // Build the main prompt
    let mainPrompt = `You are an expert interview preparation assistant. Research the interview process at ${company}`;
    if (role) mainPrompt += ` for the ${role} role`;
    if (country) mainPrompt += ` in ${country}`;
    mainPrompt += `. Provide a comprehensive analysis of their interview stages, process, and typical questions.`;
    
    // Add role description links if provided
    if (roleLinks && roleLinks.length > 0) {
      mainPrompt += ` Use these job description links to provide more tailored information: ${roleLinks.join(", ")}`;
    }

    // Add CV context if provided
    if (cv) {
      mainPrompt += ` Here's the candidate's CV, use it to personalize the guidance: ${cv}`;
    }

    console.log("Starting OpenAI research for", company);
    
    // Mock interview stages for now - would be replaced with actual OpenAI API calls
    const interviewStages = [
      {
        name: "Phone Screening",
        duration: "30-45 minutes",
        interviewer: "HR/Recruiter",
        content: "Basic resume validation, behavioral questions, role overview",
        guidance: "Focus on showcasing your interest in the company and role. Prepare your elevator pitch.",
        order_index: 1,
        questions: [
          "Tell me about yourself",
          "Why are you interested in this role?",
          "Walk me through your resume",
          "What are your salary expectations?"
        ]
      },
      {
        name: "Technical Assessment",
        duration: "60-90 minutes",
        interviewer: "Engineer",
        content: "Coding problems, data structures, algorithms, system design",
        guidance: "Review fundamentals, practice with common problems. Be clear in explaining your thought process.",
        order_index: 2,
        questions: [
          "Design a URL shortener service",
          "Implement a function to detect a cycle in a linked list",
          "Write an algorithm to find the kth largest element in an array",
          "How would you scale a database with increasing traffic?"
        ]
      },
      {
        name: "Behavioral Interview",
        duration: "45-60 minutes",
        interviewer: "Hiring Manager",
        content: "Cultural fit, teamwork, conflict resolution",
        guidance: "Use the STAR method (Situation, Task, Action, Result) for behavioral questions.",
        order_index: 3,
        questions: [
          "Describe a time when you had to work with a difficult team member",
          "Tell me about a project that didn't go as planned",
          "How do you handle tight deadlines?",
          "Give an example of when you showed leadership"
        ]
      },
      {
        name: "Final Round",
        duration: "Half day",
        interviewer: "Team Panel",
        content: "Multiple interviews with team members, deeper technical questions",
        guidance: "Be consistent across all interviews. Ask thoughtful questions to each interviewer.",
        order_index: 4,
        questions: [
          "How would you improve our product?",
          "Describe your ideal work environment",
          "What's your approach to learning new technologies?",
          "Where do you see yourself in 5 years?"
        ]
      }
    ];

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
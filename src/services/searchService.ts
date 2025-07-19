import { supabase } from "@/integrations/supabase/client";

interface CreateSearchParams {
  company: string;
  role?: string;
  country?: string;
  roleLinks?: string;
  cv?: string;
}

export const searchService = {
  // Step 1: Create search record only (fast, synchronous)
  async createSearchRecord({ company, role, country, roleLinks, cv }: CreateSearchParams) {
    try {
      // Get the current user first
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error("No authenticated user");
      }

      // Create a search record with user_id (status: pending)
      const { data: searchData, error: searchError } = await supabase
        .from("searches")
        .insert({
          user_id: user.id,
          company,
          role,
          country,
          role_links: roleLinks,
          search_status: "pending",
        })
        .select()
        .single();

      if (searchError) throw searchError;

      return { searchId: searchData.id, success: true };
    } catch (error) {
      console.error("Error creating search record:", error);
      return { error, success: false };
    }
  },

  // Step 2: Start processing asynchronously (can take minutes)
  async startProcessing(searchId: string, { company, role, country, roleLinks, cv }: CreateSearchParams) {
    try {
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("No authenticated user");
      }

      // Update search status to processing
      await supabase
        .from("searches")
        .update({ search_status: "processing" })
        .eq("id", searchId);

      // Call the edge function to process the search (async, no await)
      supabase.functions.invoke("interview-research", {
        body: {
          company,
          role,
          country,
          roleLinks: roleLinks ? roleLinks.split("\n").filter(link => link.trim()) : [],
          cv,
          userId: user.id,
          searchId,
        }
      }).then(response => {
        if (response.error) {
          console.error("Edge function error:", response.error);
          // Update status to failed if edge function fails
          supabase
            .from("searches")
            .update({ search_status: "failed" })
            .eq("id", searchId);
        }
        // If successful, the edge function will update status to "completed"
      }).catch(error => {
        console.error("Error calling edge function:", error);
        // Update status to failed if call fails
        supabase
          .from("searches")
          .update({ search_status: "failed" })
          .eq("id", searchId);
      });

      return { success: true };
    } catch (error) {
      console.error("Error starting processing:", error);
      
      // Update status to failed
      await supabase
        .from("searches")
        .update({ search_status: "failed" })
        .eq("id", searchId);
      
      return { error, success: false };
    }
  },

  // Legacy method for backward compatibility
  async createSearch(params: CreateSearchParams) {
    const recordResult = await this.createSearchRecord(params);
    if (!recordResult.success) return recordResult;
    
    const processResult = await this.startProcessing(recordResult.searchId!, params);
    return { searchId: recordResult.searchId, success: processResult.success, error: processResult.error };
  },

  async getSearchStatus(searchId: string) {
    try {
      const { data, error } = await supabase
        .from("searches")
        .select("id, search_status")
        .eq("id", searchId)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Error getting search status:", error);
      return null;
    }
  },

  async getSearchResults(searchId: string) {
    try {
      // Get the search record with enhanced data
      const { data: search, error: searchError } = await supabase
        .from("searches")
        .select("*")
        .eq("id", searchId)
        .single();

      if (searchError) throw searchError;

      // Get the interview stages for the search
      const { data: stages, error: stagesError } = await supabase
        .from("interview_stages")
        .select("*")
        .eq("search_id", searchId)
        .order("order_index");

      if (stagesError) throw stagesError;

      // Get the questions for each stage
      const stagesWithQuestions = await Promise.all(
        stages.map(async (stage) => {
          const { data: questions, error: questionsError } = await supabase
            .from("interview_questions")
            .select("*")
            .eq("stage_id", stage.id);

          if (questionsError) throw questionsError;

          return {
            ...stage,
            questions: questions || [],
          };
        })
      );

      // Get CV-Job comparison data
      const { data: cvJobComparison, error: cvJobError } = await supabase
        .from("cv_job_comparisons")
        .select("*")
        .eq("search_id", searchId)
        .single();

      if (cvJobError && cvJobError.code !== 'PGRST116') { // PGRST116 is "not found"
        console.warn("CV-Job comparison not found:", cvJobError);
      }

      // Get enhanced question banks
      const { data: enhancedQuestions, error: enhancedError } = await supabase
        .from("enhanced_question_banks")
        .select("*")
        .eq("search_id", searchId);

      if (enhancedError) {
        console.warn("Enhanced questions not found:", enhancedError);
      }

      return { 
        search, 
        stages: stagesWithQuestions, 
        cvJobComparison: cvJobComparison || null,
        enhancedQuestions: enhancedQuestions || [],
        success: true 
      };
    } catch (error) {
      console.error("Error getting search results:", error);
      return { error, success: false };
    }
  },

  async getSearchHistory() {
    try {
      const { data: searches, error } = await supabase
        .from("searches")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return { searches, success: true };
    } catch (error) {
      console.error("Error getting search history:", error);
      return { error, success: false };
    }
  },

  async createPracticeSession(searchId: string) {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user.user) throw new Error("No authenticated user");
      
      const { data: session, error } = await supabase
        .from("practice_sessions")
        .insert({
          search_id: searchId,
          user_id: user.user.id
        })
        .select()
        .single();

      if (error) throw error;

      return { session, success: true };
    } catch (error) {
      console.error("Error creating practice session:", error);
      return { error, success: false };
    }
  },

  async savePracticeAnswer({ sessionId, questionId, textAnswer, audioUrl, answerTime }: {
    sessionId: string;
    questionId: string;
    textAnswer?: string;
    audioUrl?: string;
    answerTime?: number;
  }) {
    try {
      const { data, error } = await supabase
        .from("practice_answers")
        .insert({
          session_id: sessionId,
          question_id: questionId,
          text_answer: textAnswer,
          audio_url: audioUrl,
          answer_time_seconds: answerTime,
        })
        .select()
        .single();

      if (error) throw error;

      return { answer: data, success: true };
    } catch (error) {
      console.error("Error saving practice answer:", error);
      return { error, success: false };
    }
  },

  async getResume(userId: string) {
    try {
      // First try to get basic resume data
      const { data, error } = await supabase
        .from("resumes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      // Return the first resume if exists, otherwise null
      const resume = data && data.length > 0 ? data[0] : null;

      return { resume, success: true };
    } catch (error) {
      console.error("Error getting resume:", error);
      return { error, success: false };
    }
  },

  async analyzeCV(cvText: string) {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user.user) throw new Error("No authenticated user");
      
      const response = await supabase.functions.invoke("cv-analysis", {
        body: {
          cvText,
          userId: user.user.id
        }
      });

      if (response.error) throw new Error(response.error.message);

      return {
        success: true,
        parsedData: response.data.parsedData,
        aiAnalysis: response.data.aiAnalysis
      };
    } catch (error) {
      console.error("Error analyzing CV:", error);
      return { error, success: false };
    }
  },

  async saveResume({ content, parsedData }: { content: string; parsedData?: Record<string, unknown> }) {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user.user) throw new Error("No authenticated user");
      
      const { data, error } = await supabase
        .from("resumes")
        .insert({
          content,
          parsed_data: (parsedData as any) || null,
          user_id: user.user.id
        })
        .select()
        .single();

      if (error) throw error;

      return { resume: data, success: true };
    } catch (error) {
      console.error("Error saving resume:", error);
      return { error, success: false };
    }
  },
};
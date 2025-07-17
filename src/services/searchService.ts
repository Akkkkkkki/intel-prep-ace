import { supabase } from "@/integrations/supabase/client";

interface CreateSearchParams {
  company: string;
  role?: string;
  country?: string;
  roleLinks?: string;
  cv?: string;
}

export const searchService = {
  async createSearch({ company, role, country, roleLinks, cv }: CreateSearchParams) {
    try {
      // Get the current user first
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error("No authenticated user");
      }

      // 1. Create a search record with user_id
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

      const searchId = searchData.id;
      const userId = user.id;

      // 2. Call the edge function to process the search
      const processResponse = await supabase.functions.invoke("interview-research", {
        body: {
          company,
          role,
          country,
          roleLinks: roleLinks ? roleLinks.split("\n").filter(link => link.trim()) : [],
          cv,
          userId: userId,
          searchId,
        }
      });

      if (processResponse.error) throw new Error(processResponse.error.message);

      return { searchId, success: true };
    } catch (error) {
      console.error("Error creating search:", error);
      return { error, success: false };
    }
  },

  async getSearchResults(searchId: string) {
    try {
      // Get the search record
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

      return { search, stages: stagesWithQuestions, success: true };
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
      const { data, error } = await supabase
        .from("resumes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error; // PGRST116 is "no rows returned"

      return { resume: data, success: true };
    } catch (error) {
      console.error("Error getting resume:", error);
      return { error, success: false };
    }
  },

  async saveResume({ content, parsedData }: { content: string; parsedData?: any }) {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user.user) throw new Error("No authenticated user");
      
      const { data, error } = await supabase
        .from("resumes")
        .insert({
          content,
          parsed_data: parsedData || null,
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
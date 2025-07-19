export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      cv_job_comparisons: {
        Row: {
          created_at: string
          experience_gap_analysis: Json
          id: string
          interview_prep_strategy: Json
          overall_fit_score: number
          personalized_story_bank: Json
          preparation_priorities: string[] | null
          search_id: string | null
          skill_gap_analysis: Json
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          experience_gap_analysis: Json
          id?: string
          interview_prep_strategy: Json
          overall_fit_score?: number
          personalized_story_bank: Json
          preparation_priorities?: string[] | null
          search_id?: string | null
          skill_gap_analysis: Json
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          experience_gap_analysis?: Json
          id?: string
          interview_prep_strategy?: Json
          overall_fit_score?: number
          personalized_story_bank?: Json
          preparation_priorities?: string[] | null
          search_id?: string | null
          skill_gap_analysis?: Json
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cv_job_comparisons_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["id"]
          },
        ]
      }
      enhanced_question_banks: {
        Row: {
          behavioral_questions: Json | null
          company_specific_questions: Json | null
          created_at: string
          cultural_fit_questions: Json | null
          experience_based_questions: Json | null
          generation_context: Json | null
          id: string
          interview_stage: string
          role_specific_questions: Json | null
          search_id: string | null
          situational_questions: Json | null
          technical_questions: Json | null
          total_questions: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          behavioral_questions?: Json | null
          company_specific_questions?: Json | null
          created_at?: string
          cultural_fit_questions?: Json | null
          experience_based_questions?: Json | null
          generation_context?: Json | null
          id?: string
          interview_stage: string
          role_specific_questions?: Json | null
          search_id?: string | null
          situational_questions?: Json | null
          technical_questions?: Json | null
          total_questions?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          behavioral_questions?: Json | null
          company_specific_questions?: Json | null
          created_at?: string
          cultural_fit_questions?: Json | null
          experience_based_questions?: Json | null
          generation_context?: Json | null
          id?: string
          interview_stage?: string
          role_specific_questions?: Json | null
          search_id?: string | null
          situational_questions?: Json | null
          technical_questions?: Json | null
          total_questions?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enhanced_question_banks_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["id"]
          },
        ]
      }
      function_executions: {
        Row: {
          created_at: string
          error_message: string | null
          execution_time_ms: number | null
          function_name: string
          id: string
          openai_call_ids: string[] | null
          processed_outputs: Json | null
          raw_inputs: Json
          raw_outputs: Json | null
          search_id: string | null
          status: string | null
          tavily_call_ids: string[] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          function_name: string
          id?: string
          openai_call_ids?: string[] | null
          processed_outputs?: Json | null
          raw_inputs: Json
          raw_outputs?: Json | null
          search_id?: string | null
          status?: string | null
          tavily_call_ids?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          function_name?: string
          id?: string
          openai_call_ids?: string[] | null
          processed_outputs?: Json | null
          raw_inputs?: Json
          raw_outputs?: Json | null
          search_id?: string | null
          status?: string | null
          tavily_call_ids?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "function_executions_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_experiences: {
        Row: {
          company_name: string
          created_at: string
          difficulty_rating: string | null
          experience_text: string | null
          experience_type: string | null
          id: string
          interviewer_feedback: string | null
          process_duration: string | null
          questions_asked: string[] | null
          role_title: string | null
          search_id: string | null
          source_platform: string | null
          source_url: string | null
        }
        Insert: {
          company_name: string
          created_at?: string
          difficulty_rating?: string | null
          experience_text?: string | null
          experience_type?: string | null
          id?: string
          interviewer_feedback?: string | null
          process_duration?: string | null
          questions_asked?: string[] | null
          role_title?: string | null
          search_id?: string | null
          source_platform?: string | null
          source_url?: string | null
        }
        Update: {
          company_name?: string
          created_at?: string
          difficulty_rating?: string | null
          experience_text?: string | null
          experience_type?: string | null
          id?: string
          interviewer_feedback?: string | null
          process_duration?: string | null
          questions_asked?: string[] | null
          role_title?: string | null
          search_id?: string | null
          source_platform?: string | null
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_experiences_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_questions: {
        Row: {
          created_at: string
          id: string
          question: string
          stage_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question: string
          stage_id: string
        }
        Update: {
          created_at?: string
          id?: string
          question?: string
          stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_questions_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "interview_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_stages: {
        Row: {
          content: string | null
          created_at: string
          duration: string | null
          guidance: string | null
          id: string
          interviewer: string | null
          name: string
          order_index: number
          search_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          duration?: string | null
          guidance?: string | null
          id?: string
          interviewer?: string | null
          name: string
          order_index: number
          search_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          duration?: string | null
          guidance?: string | null
          id?: string
          interviewer?: string | null
          name?: string
          order_index?: number
          search_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_stages_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["id"]
          },
        ]
      }
      openai_calls: {
        Row: {
          completion_tokens: number | null
          created_at: string
          endpoint_url: string
          error_message: string | null
          function_name: string
          id: string
          model: string
          prompt_tokens: number | null
          request_duration_ms: number | null
          request_payload: Json
          response_payload: Json | null
          response_status: number
          search_id: string | null
          total_tokens: number | null
          user_id: string | null
        }
        Insert: {
          completion_tokens?: number | null
          created_at?: string
          endpoint_url: string
          error_message?: string | null
          function_name: string
          id?: string
          model: string
          prompt_tokens?: number | null
          request_duration_ms?: number | null
          request_payload: Json
          response_payload?: Json | null
          response_status: number
          search_id?: string | null
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          completion_tokens?: number | null
          created_at?: string
          endpoint_url?: string
          error_message?: string | null
          function_name?: string
          id?: string
          model?: string
          prompt_tokens?: number | null
          request_duration_ms?: number | null
          request_payload?: Json
          response_payload?: Json | null
          response_status?: number
          search_id?: string | null
          total_tokens?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "openai_calls_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_answers: {
        Row: {
          answer_time_seconds: number | null
          audio_url: string | null
          created_at: string
          id: string
          question_id: string
          session_id: string
          text_answer: string | null
        }
        Insert: {
          answer_time_seconds?: number | null
          audio_url?: string | null
          created_at?: string
          id?: string
          question_id: string
          session_id: string
          text_answer?: string | null
        }
        Update: {
          answer_time_seconds?: number | null
          audio_url?: string | null
          created_at?: string
          id?: string
          question_id?: string
          session_id?: string
          text_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "interview_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "practice_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_sessions: {
        Row: {
          completed_at: string | null
          id: string
          search_id: string
          started_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          search_id: string
          started_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          search_id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_sessions_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      resumes: {
        Row: {
          content: string
          created_at: string
          id: string
          parsed_data: Json | null
          search_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parsed_data?: Json | null
          search_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parsed_data?: Json | null
          search_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resumes_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["id"]
          },
        ]
      }
      searches: {
        Row: {
          company: string
          country: string | null
          created_at: string
          cv_job_comparison: Json | null
          enhanced_question_bank: Json | null
          id: string
          overall_fit_score: number | null
          preparation_priorities: string[] | null
          role: string | null
          role_links: string | null
          search_status: string
          user_id: string | null
        }
        Insert: {
          company: string
          country?: string | null
          created_at?: string
          cv_job_comparison?: Json | null
          enhanced_question_bank?: Json | null
          id?: string
          overall_fit_score?: number | null
          preparation_priorities?: string[] | null
          role?: string | null
          role_links?: string | null
          search_status?: string
          user_id?: string | null
        }
        Update: {
          company?: string
          country?: string | null
          created_at?: string
          cv_job_comparison?: Json | null
          enhanced_question_bank?: Json | null
          id?: string
          overall_fit_score?: number | null
          preparation_priorities?: string[] | null
          role?: string | null
          role_links?: string | null
          search_status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tavily_searches: {
        Row: {
          api_type: string
          created_at: string
          credits_used: number | null
          endpoint_url: string
          error_message: string | null
          id: string
          include_domains: string[] | null
          max_results: number | null
          query_text: string | null
          request_duration_ms: number | null
          request_payload: Json
          response_payload: Json | null
          response_status: number
          results_count: number | null
          search_depth: string | null
          search_id: string | null
          user_id: string | null
        }
        Insert: {
          api_type: string
          created_at?: string
          credits_used?: number | null
          endpoint_url: string
          error_message?: string | null
          id?: string
          include_domains?: string[] | null
          max_results?: number | null
          query_text?: string | null
          request_duration_ms?: number | null
          request_payload: Json
          response_payload?: Json | null
          response_status: number
          results_count?: number | null
          search_depth?: string | null
          search_id?: string | null
          user_id?: string | null
        }
        Update: {
          api_type?: string
          created_at?: string
          credits_used?: number | null
          endpoint_url?: string
          error_message?: string | null
          id?: string
          include_domains?: string[] | null
          max_results?: number | null
          query_text?: string | null
          request_duration_ms?: number | null
          request_payload?: Json
          response_payload?: Json | null
          response_status?: number
          results_count?: number | null
          search_depth?: string | null
          search_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tavily_searches_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_openai_cost: {
        Args: {
          model: string
          prompt_tokens: number
          completion_tokens: number
        }
        Returns: number
      }
      get_enhanced_search_results: {
        Args: { p_search_id: string }
        Returns: {
          search_data: Json
          interview_stages: Json
          interview_questions: Json
          cv_job_comparison: Json
          enhanced_questions: Json
          interview_experiences: Json
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

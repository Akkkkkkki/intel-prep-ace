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
      api_call_logs: {
        Row: {
          api_method: string
          api_provider: string
          created_at: string
          credits_used: number | null
          duration_ms: number | null
          error_message: string | null
          estimated_cost_usd: number | null
          id: string
          request_summary: Json | null
          response_status: number
          results_count: number | null
          search_id: string | null
          success: boolean | null
        }
        Insert: {
          api_method: string
          api_provider: string
          created_at?: string
          credits_used?: number | null
          duration_ms?: number | null
          error_message?: string | null
          estimated_cost_usd?: number | null
          id?: string
          request_summary?: Json | null
          response_status: number
          results_count?: number | null
          search_id?: string | null
          success?: boolean | null
        }
        Update: {
          api_method?: string
          api_provider?: string
          created_at?: string
          credits_used?: number | null
          duration_ms?: number | null
          error_message?: string | null
          estimated_cost_usd?: number | null
          id?: string
          request_summary?: Json | null
          response_status?: number
          results_count?: number | null
          search_id?: string | null
          success?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "api_call_logs_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["id"]
          },
        ]
      }
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
      native_interview_experiences: {
        Row: {
          ai_summary: string | null
          author_info: Json | null
          company_name: string
          content: string
          content_processed: boolean | null
          created_at: string
          difficulty_rating: string | null
          engagement_metrics: Json | null
          experience_type: string | null
          id: string
          interview_stages: string[] | null
          offer_outcome: string | null
          platform: string
          platform_metadata: Json | null
          posted_date: string | null
          preparation_tips: string[] | null
          quality_score: number | null
          questions_asked: string[] | null
          role_title: string | null
          salary_mentioned: boolean | null
          scraped_at: string
          search_id: string
          source_url: string
          title: string
        }
        Insert: {
          ai_summary?: string | null
          author_info?: Json | null
          company_name: string
          content: string
          content_processed?: boolean | null
          created_at?: string
          difficulty_rating?: string | null
          engagement_metrics?: Json | null
          experience_type?: string | null
          id?: string
          interview_stages?: string[] | null
          offer_outcome?: string | null
          platform: string
          platform_metadata?: Json | null
          posted_date?: string | null
          preparation_tips?: string[] | null
          quality_score?: number | null
          questions_asked?: string[] | null
          role_title?: string | null
          salary_mentioned?: boolean | null
          scraped_at?: string
          search_id: string
          source_url: string
          title: string
        }
        Update: {
          ai_summary?: string | null
          author_info?: Json | null
          company_name?: string
          content?: string
          content_processed?: boolean | null
          created_at?: string
          difficulty_rating?: string | null
          engagement_metrics?: Json | null
          experience_type?: string | null
          id?: string
          interview_stages?: string[] | null
          offer_outcome?: string | null
          platform?: string
          platform_metadata?: Json | null
          posted_date?: string | null
          preparation_tips?: string[] | null
          quality_score?: number | null
          questions_asked?: string[] | null
          role_title?: string | null
          salary_mentioned?: boolean | null
          scraped_at?: string
          search_id?: string
          source_url?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "native_interview_experiences_search_id_fkey"
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
      research_cache: {
        Row: {
          cache_freshness_hours: number | null
          cache_hits: number | null
          cache_key: string
          company_insights: Json
          company_name: string
          confidence_score: number | null
          content_version: number | null
          country: string | null
          created_at: string
          id: string
          last_accessed_at: string
          raw_search_data: Json | null
          role_title: string | null
          source_urls: string[] | null
          updated_at: string
        }
        Insert: {
          cache_freshness_hours?: number | null
          cache_hits?: number | null
          cache_key: string
          company_insights: Json
          company_name: string
          confidence_score?: number | null
          content_version?: number | null
          country?: string | null
          created_at?: string
          id?: string
          last_accessed_at?: string
          raw_search_data?: Json | null
          role_title?: string | null
          source_urls?: string[] | null
          updated_at?: string
        }
        Update: {
          cache_freshness_hours?: number | null
          cache_hits?: number | null
          cache_key?: string
          company_insights?: Json
          company_name?: string
          confidence_score?: number | null
          content_version?: number | null
          country?: string | null
          created_at?: string
          id?: string
          last_accessed_at?: string
          raw_search_data?: Json | null
          role_title?: string | null
          source_urls?: string[] | null
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
      scraped_content: {
        Row: {
          ai_summary: string | null
          content_source: string | null
          created_at: string
          extracted_insights: string[] | null
          extracted_questions: string[] | null
          full_content: string | null
          id: string
          language: string | null
          processing_status: string | null
          raw_html: string | null
          scraped_url_id: string
          structured_data: Json | null
          updated_at: string
          word_count: number | null
        }
        Insert: {
          ai_summary?: string | null
          content_source?: string | null
          created_at?: string
          extracted_insights?: string[] | null
          extracted_questions?: string[] | null
          full_content?: string | null
          id?: string
          language?: string | null
          processing_status?: string | null
          raw_html?: string | null
          scraped_url_id: string
          structured_data?: Json | null
          updated_at?: string
          word_count?: number | null
        }
        Update: {
          ai_summary?: string | null
          content_source?: string | null
          created_at?: string
          extracted_insights?: string[] | null
          extracted_questions?: string[] | null
          full_content?: string | null
          id?: string
          language?: string | null
          processing_status?: string | null
          raw_html?: string | null
          scraped_url_id?: string
          structured_data?: Json | null
          updated_at?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scraped_content_scraped_url_id_fkey"
            columns: ["scraped_url_id"]
            isOneToOne: false
            referencedRelation: "scraped_urls"
            referencedColumns: ["id"]
          },
        ]
      }
      scraped_urls: {
        Row: {
          company_name: string
          content_quality_score: number | null
          content_staleness_days: number | null
          content_summary: string | null
          content_type: string | null
          country: string | null
          created_at: string
          domain: string
          experience_metadata: Json | null
          extraction_method: string | null
          first_scraped_at: string
          id: string
          last_reused_at: string | null
          last_validated_at: string
          platform_specific_data: Json | null
          role_title: string | null
          scraping_method: string | null
          times_reused: number | null
          title: string | null
          updated_at: string
          url: string
          url_hash: string
        }
        Insert: {
          company_name: string
          content_quality_score?: number | null
          content_staleness_days?: number | null
          content_summary?: string | null
          content_type?: string | null
          country?: string | null
          created_at?: string
          domain: string
          experience_metadata?: Json | null
          extraction_method?: string | null
          first_scraped_at?: string
          id?: string
          last_reused_at?: string | null
          last_validated_at?: string
          platform_specific_data?: Json | null
          role_title?: string | null
          scraping_method?: string | null
          times_reused?: number | null
          title?: string | null
          updated_at?: string
          url: string
          url_hash: string
        }
        Update: {
          company_name?: string
          content_quality_score?: number | null
          content_staleness_days?: number | null
          content_summary?: string | null
          content_type?: string | null
          country?: string | null
          created_at?: string
          domain?: string
          experience_metadata?: Json | null
          extraction_method?: string | null
          first_scraped_at?: string
          id?: string
          last_reused_at?: string | null
          last_validated_at?: string
          platform_specific_data?: Json | null
          role_title?: string | null
          scraping_method?: string | null
          times_reused?: number | null
          title?: string | null
          updated_at?: string
          url?: string
          url_hash?: string
        }
        Relationships: []
      }
      scraping_metrics: {
        Row: {
          average_quality_score: number | null
          blind_experiences: number | null
          cache_hit_rate: number | null
          cache_hits: number | null
          created_at: string
          deduplication_removals: number | null
          glassdoor_experiences: number | null
          high_quality_experiences: number | null
          id: string
          leetcode_experiences: number | null
          other_platform_experiences: number | null
          reddit_experiences: number | null
          search_id: string
          total_api_calls: number | null
          total_api_cost_usd: number | null
          total_execution_time_ms: number | null
          total_native_experiences: number | null
          total_tavily_results: number | null
        }
        Insert: {
          average_quality_score?: number | null
          blind_experiences?: number | null
          cache_hit_rate?: number | null
          cache_hits?: number | null
          created_at?: string
          deduplication_removals?: number | null
          glassdoor_experiences?: number | null
          high_quality_experiences?: number | null
          id?: string
          leetcode_experiences?: number | null
          other_platform_experiences?: number | null
          reddit_experiences?: number | null
          search_id: string
          total_api_calls?: number | null
          total_api_cost_usd?: number | null
          total_execution_time_ms?: number | null
          total_native_experiences?: number | null
          total_tavily_results?: number | null
        }
        Update: {
          average_quality_score?: number | null
          blind_experiences?: number | null
          cache_hit_rate?: number | null
          cache_hits?: number | null
          created_at?: string
          deduplication_removals?: number | null
          glassdoor_experiences?: number | null
          high_quality_experiences?: number | null
          id?: string
          leetcode_experiences?: number | null
          other_platform_experiences?: number | null
          reddit_experiences?: number | null
          search_id?: string
          total_api_calls?: number | null
          total_api_cost_usd?: number | null
          total_execution_time_ms?: number | null
          total_native_experiences?: number | null
          total_tavily_results?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scraping_metrics_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: true
            referencedRelation: "searches"
            referencedColumns: ["id"]
          },
        ]
      }
      search_content_usage: {
        Row: {
          contributed_to_analysis: boolean | null
          created_at: string
          id: string
          relevance_score: number | null
          scraped_url_id: string
          search_id: string
          usage_type: string
        }
        Insert: {
          contributed_to_analysis?: boolean | null
          created_at?: string
          id?: string
          relevance_score?: number | null
          scraped_url_id: string
          search_id: string
          usage_type: string
        }
        Update: {
          contributed_to_analysis?: boolean | null
          created_at?: string
          id?: string
          relevance_score?: number | null
          scraped_url_id?: string
          search_id?: string
          usage_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_content_usage_scraped_url_id_fkey"
            columns: ["scraped_url_id"]
            isOneToOne: false
            referencedRelation: "scraped_urls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_content_usage_search_id_fkey"
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
      url_deduplication_metrics: {
        Row: {
          api_calls_saved: number | null
          cache_hit_count: number | null
          created_at: string | null
          id: string
          response_time_ms: number | null
          search_id: string | null
          total_urls_needed: number | null
        }
        Insert: {
          api_calls_saved?: number | null
          cache_hit_count?: number | null
          created_at?: string | null
          id?: string
          response_time_ms?: number | null
          search_id?: string | null
          total_urls_needed?: number | null
        }
        Update: {
          api_calls_saved?: number | null
          cache_hit_count?: number | null
          created_at?: string | null
          id?: string
          response_time_ms?: number | null
          search_id?: string | null
          total_urls_needed?: number | null
        }
        Relationships: []
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
      cleanup_old_cache_data: {
        Args: { p_max_age_days?: number }
        Returns: number
      }
      find_reusable_urls: {
        Args: {
          p_company: string
          p_role?: string
          p_country?: string
          p_max_age_days?: number
          p_min_quality_score?: number
        }
        Returns: {
          url: string
          domain: string
          title: string
          content_type: string
          content_quality_score: number
          times_reused: number
          days_old: number
          has_content: boolean
        }[]
      }
      find_reusable_urls_fast: {
        Args: {
          p_company: string
          p_role?: string
          p_country?: string
          p_max_age_days?: number
          p_min_quality_score?: number
        }
        Returns: {
          url: string
          domain: string
          title: string
          content_type: string
          content_quality_score: number
          times_reused: number
        }[]
      }
      find_similar_experiences: {
        Args: {
          p_company: string
          p_role?: string
          p_content_sample?: string
          p_similarity_threshold?: number
        }
        Returns: {
          id: string
          platform: string
          title: string
          similarity_score: number
        }[]
      }
      generate_cache_key: {
        Args: { p_company: string; p_role?: string; p_country?: string }
        Returns: string
      }
      get_cached_content_simple: {
        Args: { p_urls: string[] }
        Returns: {
          url: string
          content: string
          title: string
          content_type: string
        }[]
      }
      get_cached_research: {
        Args: {
          p_company: string
          p_role?: string
          p_country?: string
          p_max_age_hours?: number
        }
        Returns: {
          id: string
          company_insights: Json
          raw_search_data: Json
          source_urls: string[]
          cache_freshness_hours: number
          confidence_score: number
          cache_hits: number
        }[]
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
      get_excluded_domains_for_search: {
        Args: {
          p_company: string
          p_role?: string
          p_country?: string
          p_min_reuse_count?: number
        }
        Returns: string[]
      }
      get_hybrid_search_results: {
        Args: { p_search_id: string }
        Returns: {
          search_data: Json
          interview_stages: Json
          native_experiences: Json
          scraping_metrics: Json
          cv_job_comparison: Json
          enhanced_questions: Json
        }[]
      }
      get_platform_scraping_stats: {
        Args: { p_days_back?: number }
        Returns: {
          platform: string
          total_experiences: number
          avg_quality_score: number
          total_searches: number
          avg_experiences_per_search: number
        }[]
      }
      increment_cache_access: {
        Args: { p_cache_id: string }
        Returns: undefined
      }
      increment_url_reuse: {
        Args: { p_url_id: string }
        Returns: undefined
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

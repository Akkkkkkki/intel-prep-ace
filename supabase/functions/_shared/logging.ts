// Shared logging utilities for comprehensive API and function tracking
// Used by all Supabase Edge Functions for audit trails and debugging

interface TavilyLogData {
  searchId: string;
  userId: string;
  apiType: 'search' | 'extract';
  endpointUrl: string;
  requestPayload: any;
  queryText?: string;
  searchDepth?: string;
  maxResults?: number;
  includeDomains?: string[];
  responsePayload?: any;
  responseStatus: number;
  resultsCount?: number;
  requestDurationMs: number;
  creditsUsed: number;
  errorMessage?: string;
}

interface OpenAILogData {
  searchId: string;
  userId: string;
  functionName: string;
  model: string;
  endpointUrl: string;
  requestPayload: any;
  responsePayload?: any;
  responseStatus: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  requestDurationMs: number;
  errorMessage?: string;
}

interface FunctionExecutionData {
  searchId: string;
  userId: string;
  functionName: string;
  rawInputs: any;
  rawOutputs?: any;
  processedOutputs?: any;
  status: 'running' | 'completed' | 'failed';
  executionTimeMs?: number;
  errorMessage?: string;
  tavilyCallIds?: string[];
  openaiCallIds?: string[];
}

export class Logger {
  constructor(private supabase: any) {}

  // Log Tavily API calls
  async logTavilyCall(data: TavilyLogData): Promise<string | null> {
    try {
      const { data: result, error } = await this.supabase
        .from('tavily_searches')
        .insert({
          search_id: data.searchId,
          user_id: data.userId,
          api_type: data.apiType,
          endpoint_url: data.endpointUrl,
          request_payload: data.requestPayload,
          query_text: data.queryText,
          search_depth: data.searchDepth,
          max_results: data.maxResults,
          include_domains: data.includeDomains,
          response_payload: data.responsePayload,
          response_status: data.responseStatus,
          results_count: data.resultsCount || 0,
          request_duration_ms: data.requestDurationMs,
          credits_used: data.creditsUsed,
          error_message: data.errorMessage
        })
        .select('id')
        .single();

      if (error) {
        console.error('Failed to log Tavily call:', error);
        return null;
      }
      
      return result?.id || null;
    } catch (error) {
      console.error('Error logging Tavily call:', error);
      return null;
    }
  }

  // Log OpenAI API calls
  async logOpenAICall(data: OpenAILogData): Promise<string | null> {
    try {
      const { data: result, error } = await this.supabase
        .from('openai_calls')
        .insert({
          search_id: data.searchId,
          user_id: data.userId,
          function_name: data.functionName,
          model: data.model,
          endpoint_url: data.endpointUrl,
          request_payload: data.requestPayload,
          response_payload: data.responsePayload,
          response_status: data.responseStatus,
          prompt_tokens: data.promptTokens || 0,
          completion_tokens: data.completionTokens || 0,
          total_tokens: data.totalTokens || 0,
          request_duration_ms: data.requestDurationMs,
          error_message: data.errorMessage
        })
        .select('id')
        .single();

      if (error) {
        console.error('Failed to log OpenAI call:', error);
        return null;
      }
      
      return result?.id || null;
    } catch (error) {
      console.error('Error logging OpenAI call:', error);
      return null;
    }
  }

  // Log function execution
  async logFunctionExecution(data: FunctionExecutionData): Promise<string | null> {
    try {
      const { data: result, error } = await this.supabase
        .from('function_executions')
        .insert({
          search_id: data.searchId,
          user_id: data.userId,
          function_name: data.functionName,
          raw_inputs: data.rawInputs,
          raw_outputs: data.rawOutputs,
          processed_outputs: data.processedOutputs,
          status: data.status,
          execution_time_ms: data.executionTimeMs,
          error_message: data.errorMessage,
          tavily_call_ids: data.tavilyCallIds || [],
          openai_call_ids: data.openaiCallIds || []
        })
        .select('id')
        .single();

      if (error) {
        console.error('Failed to log function execution:', error);
        return null;
      }
      
      return result?.id || null;
    } catch (error) {
      console.error('Error logging function execution:', error);
      return null;
    }
  }

  // Update function execution status
  async updateFunctionExecution(
    executionId: string, 
    updates: Partial<FunctionExecutionData>
  ): Promise<boolean> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.rawOutputs !== undefined) updateData.raw_outputs = updates.rawOutputs;
      if (updates.processedOutputs !== undefined) updateData.processed_outputs = updates.processedOutputs;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.executionTimeMs !== undefined) updateData.execution_time_ms = updates.executionTimeMs;
      if (updates.errorMessage !== undefined) updateData.error_message = updates.errorMessage;
      if (updates.tavilyCallIds !== undefined) updateData.tavily_call_ids = updates.tavilyCallIds;
      if (updates.openaiCallIds !== undefined) updateData.openai_call_ids = updates.openaiCallIds;

      const { error } = await this.supabase
        .from('function_executions')
        .update(updateData)
        .eq('id', executionId);

      if (error) {
        console.error('Failed to update function execution:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error updating function execution:', error);
      return false;
    }
  }

  // Helper: Create a wrapped fetch for OpenAI calls with automatic logging
  async fetchOpenAI(
    url: string,
    options: RequestInit,
    logData: {
      searchId: string;
      userId: string;
      functionName: string;
      model: string;
    }
  ): Promise<Response> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(url, options);
      const duration = Date.now() - startTime;
      
      // Parse response for token usage if successful
      let responseData: any = null;
      let promptTokens = 0;
      let completionTokens = 0;
      let totalTokens = 0;

      if (response.ok) {
        const responseClone = response.clone();
        try {
          responseData = await responseClone.json();
          if (responseData?.usage) {
            promptTokens = responseData.usage.prompt_tokens || 0;
            completionTokens = responseData.usage.completion_tokens || 0;
            totalTokens = responseData.usage.total_tokens || 0;
          }
        } catch (parseError) {
          console.warn('Failed to parse OpenAI response for logging:', parseError);
        }
      }

      // Log the API call
      await this.logOpenAICall({
        searchId: logData.searchId,
        userId: logData.userId,
        functionName: logData.functionName,
        model: logData.model,
        endpointUrl: url,
        requestPayload: options.body ? JSON.parse(options.body as string) : {},
        responsePayload: responseData,
        responseStatus: response.status,
        promptTokens,
        completionTokens,
        totalTokens,
        requestDurationMs: duration,
        errorMessage: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log the failed API call
      await this.logOpenAICall({
        searchId: logData.searchId,
        userId: logData.userId,
        functionName: logData.functionName,
        model: logData.model,
        endpointUrl: url,
        requestPayload: options.body ? JSON.parse(options.body as string) : {},
        responseStatus: 0,
        requestDurationMs: duration,
        errorMessage: error instanceof Error ? error.message : 'Network error'
      });

      throw error;
    }
  }
}

export type { TavilyLogData, OpenAILogData, FunctionExecutionData }; 
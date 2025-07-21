// DISABLED: Shared logging utilities for comprehensive API and function tracking
// Temporarily disabled to fix 409 constraint errors during function execution

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

  // DISABLED: Log Tavily API calls
  async logTavilyCall(data: TavilyLogData): Promise<string | null> {
    // Temporarily disabled to prevent 409 constraint errors
    console.log('Tavily call logged (console only):', data.apiType, data.queryText);
    return null;
  }

  // DISABLED: Log OpenAI API calls
  async logOpenAICall(data: OpenAILogData): Promise<string | null> {
    // Temporarily disabled to prevent 409 constraint errors
    console.log('OpenAI call logged (console only):', data.functionName, data.model);
    return null;
  }

  // DISABLED: Log function execution
  async logFunctionExecution(data: FunctionExecutionData): Promise<string | null> {
    // Temporarily disabled to prevent 409 constraint errors
    console.log('Function execution logged (console only):', data.functionName, data.status);
    return null;
  }

  // DISABLED: Update function execution status
  async updateFunctionExecution(
    executionId: string, 
    updates: Partial<FunctionExecutionData>
  ): Promise<boolean> {
    // Temporarily disabled to prevent 409 constraint errors
    console.log('Function execution update logged (console only):', executionId, updates.status);
    return true;
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
    // DISABLED: Temporarily disabled logging to prevent 409 constraint errors
    console.log('OpenAI fetch logged (console only):', logData.functionName, logData.model);
    return fetch(url, options);
  }
}

export type { TavilyLogData, OpenAILogData, FunctionExecutionData }; 
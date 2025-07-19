// Comprehensive logging system for debugging search execution

export interface LogEntry {
  timestamp: string;
  searchId: string;
  userId?: string;
  functionName: string;
  operation: string;
  phase: string;
  input?: any;
  output?: any;
  error?: string;
  duration?: number;
  metadata?: any;
}

export class SearchLogger {
  private logs: LogEntry[] = [];
  private searchId: string;
  private userId?: string;
  private functionName: string;

  constructor(searchId: string, functionName: string, userId?: string) {
    this.searchId = searchId;
    this.functionName = functionName;
    this.userId = userId;
    
    // Log the start of the function
    this.log('FUNCTION_START', 'INIT', {
      searchId,
      functionName,
      userId,
      timestamp: new Date().toISOString()
    });
  }

  log(operation: string, phase: string, data?: any, error?: string, duration?: number): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      searchId: this.searchId,
      userId: this.userId,
      functionName: this.functionName,
      operation,
      phase,
      duration,
      error
    };

    // Separate input/output for better debugging
    if (data) {
      if (operation.includes('INPUT') || operation.includes('START') || operation.includes('REQUEST')) {
        logEntry.input = data;
      } else if (operation.includes('OUTPUT') || operation.includes('RESULT') || operation.includes('RESPONSE')) {
        logEntry.output = data;
      } else {
        logEntry.metadata = data;
      }
    }

    this.logs.push(logEntry);
    
    // Also log to console for immediate debugging
    const logLevel = error ? 'ERROR' : (operation.includes('WARN') ? 'WARN' : 'INFO');
    const message = `[${logLevel}] ${this.functionName}:${operation}:${phase}`;
    
    if (error) {
      console.error(message, { error, data });
    } else {
      console.log(message, data ? { data } : '');
    }
  }

  logTavilySearch(query: string, phase: string, requestPayload: any, response?: any, error?: string, duration?: number): void {
    this.log('TAVILY_SEARCH', phase, {
      query,
      requestPayload,
      response: response ? {
        status: response.status || 'unknown',
        resultsCount: response.results?.length || 0,
        hasAnswer: !!response.answer,
        extractedUrls: response.results?.map((r: any) => r.url) || []
      } : null
    }, error, duration);
  }

  logTavilyExtract(urls: string[], phase: string, response?: any, error?: string, duration?: number): void {
    this.log('TAVILY_EXTRACT', phase, {
      urlCount: urls.length,
      urls: urls.slice(0, 5), // Log first 5 URLs only
      response: response ? {
        extractedCount: response.length || 0,
        extractedUrls: response.map((r: any) => ({ url: r.url, contentLength: r.content?.length || 0 }))
      } : null
    }, error, duration);
  }

  logOpenAI(operation: string, phase: string, request?: any, response?: any, error?: string, duration?: number): void {
    this.log('OPENAI_CALL', phase, {
      operation,
      model: request?.model,
      promptLength: request?.prompt?.length || 0,
      systemPromptLength: request?.systemPrompt?.length || 0,
      useJsonMode: request?.useJsonMode,
      response: response ? {
        contentLength: response.content?.length || 0,
        hasValidJson: response.content ? this.isValidJson(response.content) : false
      } : null
    }, error, duration);
  }

  logPhaseTransition(fromPhase: string, toPhase: string, data?: any): void {
    this.log('PHASE_TRANSITION', `${fromPhase}_TO_${toPhase}`, data);
  }

  logDataProcessing(operation: string, inputData: any, outputData?: any, error?: string): void {
    this.log('DATA_PROCESSING', operation, {
      input: {
        type: typeof inputData,
        length: Array.isArray(inputData) ? inputData.length : (inputData ? Object.keys(inputData).length : 0)
      },
      output: outputData ? {
        type: typeof outputData,
        length: Array.isArray(outputData) ? outputData.length : (outputData ? Object.keys(outputData).length : 0)
      } : null
    }, error);
  }

  private isValidJson(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  async saveToFile(): Promise<void> {
    try {
      // Create logs directory if it doesn't exist
      const logsDir = './logs';
      try {
        await Deno.stat(logsDir);
      } catch {
        await Deno.mkdir(logsDir, { recursive: true });
      }

      // Save detailed log file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${logsDir}/${this.functionName}_${this.searchId}_${timestamp}.json`;
      
      const logData = {
        searchId: this.searchId,
        userId: this.userId,
        functionName: this.functionName,
        startTime: this.logs[0]?.timestamp,
        endTime: this.logs[this.logs.length - 1]?.timestamp,
        totalDuration: this.calculateTotalDuration(),
        summary: this.generateSummary(),
        logs: this.logs
      };

      await Deno.writeTextFile(filename, JSON.stringify(logData, null, 2));
      console.log(`📝 Detailed logs saved to: ${filename}`);
      
      // Also save a summary file for quick debugging
      const summaryFilename = `${logsDir}/${this.functionName}_${this.searchId}_summary.json`;
      await Deno.writeTextFile(summaryFilename, JSON.stringify({
        searchId: this.searchId,
        functionName: this.functionName,
        summary: this.generateSummary(),
        keyEvents: this.logs.filter(log => 
          log.operation.includes('START') || 
          log.operation.includes('RESULT') || 
          log.operation.includes('ERROR') ||
          log.operation.includes('PHASE_TRANSITION')
        )
      }, null, 2));
      
    } catch (error) {
      console.error('Failed to save logs to file:', error);
    }
  }

  private calculateTotalDuration(): number {
    const start = new Date(this.logs[0]?.timestamp || '').getTime();
    const end = new Date(this.logs[this.logs.length - 1]?.timestamp || '').getTime();
    return end - start;
  }

  private generateSummary(): any {
    const errors = this.logs.filter(log => log.error).length;
    const tavilySearches = this.logs.filter(log => log.operation === 'TAVILY_SEARCH').length;
    const tavilyExtracts = this.logs.filter(log => log.operation === 'TAVILY_EXTRACT').length;
    const openaiCalls = this.logs.filter(log => log.operation === 'OPENAI_CALL').length;
    
    return {
      totalLogs: this.logs.length,
      errors,
      tavilySearches,
      tavilyExtracts,
      openaiCalls,
      hasErrors: errors > 0,
      completedSuccessfully: !this.logs.some(log => log.error && log.operation.includes('FUNCTION'))
    };
  }

  // Helper method to log the end of function execution
  logFunctionEnd(success: boolean, result?: any, error?: string): void {
    this.log('FUNCTION_END', success ? 'SUCCESS' : 'ERROR', {
      success,
      result: result ? {
        type: typeof result,
        hasData: !!result
      } : null
    }, error);
  }
}
/**
 * Progress tracking utilities for async job processing
 * Provides real-time status updates for long-running research operations
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

export interface ProgressStep {
  step: string;
  percentage: number;
  message?: string;
}

export const PROGRESS_STEPS = {
  INITIALIZING: { step: 'Initializing research...', percentage: 5 },
  COMPANY_RESEARCH_START: { step: 'Analyzing company background...', percentage: 15 },
  COMPANY_RESEARCH_COMPLETE: { step: 'Company research completed', percentage: 30 },
  JOB_ANALYSIS_START: { step: 'Processing job requirements...', percentage: 35 },
  JOB_ANALYSIS_COMPLETE: { step: 'Job analysis completed', percentage: 50 },
  CV_ANALYSIS_START: { step: 'Evaluating CV match...', percentage: 55 },
  CV_ANALYSIS_COMPLETE: { step: 'CV analysis completed', percentage: 70 },
  QUESTION_GENERATION_START: { step: 'Generating interview questions...', percentage: 75 },
  QUESTION_GENERATION_COMPLETE: { step: 'Questions generated successfully', percentage: 90 },
  FINALIZING: { step: 'Finalizing results...', percentage: 95 },
  COMPLETED: { step: 'Research completed successfully!', percentage: 100 }
} as const;

/**
 * Progress tracker class for managing async job status
 */
export class ProgressTracker {
  private supabase: any;
  private searchId: string;

  constructor(searchId: string) {
    this.searchId = searchId;
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
  }

  /**
   * Update search progress with predefined step
   */
  async updateStep(stepKey: keyof typeof PROGRESS_STEPS, customMessage?: string): Promise<void> {
    const step = PROGRESS_STEPS[stepKey];
    await this.updateProgress('processing', step.step, step.percentage, customMessage);
  }

  /**
   * Update search progress with custom values
   */
  async updateProgress(
    status: 'pending' | 'processing' | 'completed' | 'failed',
    step: string,
    percentage: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('update_search_progress', {
        search_uuid: this.searchId,
        new_status: status,
        new_step: step,
        new_percentage: percentage,
        error_msg: errorMessage
      });

      if (error) {
        console.error('Failed to update progress:', error);
      } else {
        console.log(`Progress updated: ${step} (${percentage}%)`);
      }
    } catch (error) {
      console.error('Error updating search progress:', error);
      // Don't throw - progress updates shouldn't break the main flow
    }
  }

  /**
   * Mark search as completed
   */
  async markCompleted(finalMessage?: string): Promise<void> {
    await this.updateProgress(
      'completed', 
      finalMessage || PROGRESS_STEPS.COMPLETED.step, 
      100
    );
  }

  /**
   * Mark search as failed with error
   */
  async markFailed(errorMessage: string, step?: string): Promise<void> {
    await this.updateProgress(
      'failed',
      step || 'Research failed',
      0,
      errorMessage
    );
  }

  /**
   * Create a progress wrapper for async operations
   */
  async withProgress<T>(
    operation: () => Promise<T>,
    startStep: keyof typeof PROGRESS_STEPS,
    endStep: keyof typeof PROGRESS_STEPS,
    errorMessage?: string
  ): Promise<T> {
    try {
      await this.updateStep(startStep);
      const result = await operation();
      await this.updateStep(endStep);
      return result;
    } catch (error) {
      const message = errorMessage || `Failed during ${PROGRESS_STEPS[startStep].step}`;
      await this.markFailed(message, PROGRESS_STEPS[startStep].step);
      throw error;
    }
  }
}

/**
 * Concurrent processing timeout configuration
 * Optimized for parallel execution to prevent cascade failures
 */
export const CONCURRENT_TIMEOUTS = {
  companyResearch: 15000,      // 20s → 15s (concurrent execution)
  jobAnalysis: 15000,          // 30s → 15s (concurrent execution)  
  cvAnalysis: 10000,           // 20s → 10s (concurrent execution)
  questionGeneration: 20000,   // Keep existing for AI processing
  totalOperation: 25000        // Maximum time for entire operation
} as const;

/**
 * Create timeout promise for concurrent operations
 */
export function createTimeoutPromise(ms: number, operation: string): Promise<never> {
  return new Promise((_, reject) => 
    setTimeout(() => reject(new Error(`${operation} timeout after ${ms}ms`)), ms)
  );
}

/**
 * Execute operation with timeout and progress tracking
 */
export async function executeWithTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  operationName: string,
  tracker?: ProgressTracker
): Promise<T> {
  try {
    return await Promise.race([
      operation(),
      createTimeoutPromise(timeoutMs, operationName)
    ]);
  } catch (error) {
    if (tracker) {
      await tracker.markFailed(`${operationName} failed: ${error.message}`);
    }
    throw error;
  }
}
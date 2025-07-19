// Example configuration customizations
// Copy this file to config.ts and modify values as needed

import { RESEARCH_CONFIG } from "./config.ts";

// Example: Reduce API costs by limiting searches and extractions
export const COST_OPTIMIZED_CONFIG = {
  ...RESEARCH_CONFIG,
  tavily: {
    ...RESEARCH_CONFIG.tavily,
    maxResults: {
      discovery: 5,        // Reduced from 10
      extraction: 8,       // Reduced from 15
    },
  },
  openai: {
    ...RESEARCH_CONFIG.openai,
    model: 'gpt-4o-mini',  // Use cheaper model
    maxTokens: {
      ...RESEARCH_CONFIG.openai.maxTokens,
      companyAnalysis: 1000, // Reduced tokens
    },
  },
};

// Example: High-quality configuration for premium research
export const PREMIUM_CONFIG = {
  ...RESEARCH_CONFIG,
  tavily: {
    ...RESEARCH_CONFIG.tavily,
    maxResults: {
      discovery: 15,       // Increased from 10
      extraction: 20,      // Increased from 15
    },
  },
  content: {
    ...RESEARCH_CONFIG.content,
    maxContentLength: {
      sourceSnippet: 6000, // Increased from 4500
      deepExtract: 8000,   // Increased from 6000
      contextBuilding: 48000, // Increased from 32000
    },
  },
};

// Example: Debug configuration for development
export const DEBUG_CONFIG = {
  ...RESEARCH_CONFIG,
  logging: {
    ...RESEARCH_CONFIG.logging,
    logLevel: 'DEBUG' as const,
    enableFileLogging: true,
    enableConsoleLogging: true,
    logApiRequests: true,
    logContentSamples: true,
  },
  development: {
    ...RESEARCH_CONFIG.development,
    verboseLogging: true,
    saveRawResponses: true,
  },
};

// Example: Test configuration with limited API calls
export const TEST_CONFIG = {
  ...RESEARCH_CONFIG,
  development: {
    ...RESEARCH_CONFIG.development,
    testMode: {
      enabled: true,
      limitSearches: 2,
      limitExtractions: 3,
      useMockData: false,
    },
  },
  tavily: {
    ...RESEARCH_CONFIG.tavily,
    maxResults: {
      discovery: 3,
      extraction: 3,
    },
  },
};

// Example: Add new company tickers
export const EXTENDED_TICKERS_CONFIG = {
  ...RESEARCH_CONFIG,
  search: {
    ...RESEARCH_CONFIG.search,
    companyTickers: {
      ...RESEARCH_CONFIG.search.companyTickers,
      // Add your custom company mappings
      'my-company': 'MYCO',
      'startup-name': 'STUP',
    },
  },
};

// Example: Custom search domains
export const CUSTOM_DOMAINS_CONFIG = {
  ...RESEARCH_CONFIG,
  search: {
    ...RESEARCH_CONFIG.search,
    allowedDomains: [
      ...RESEARCH_CONFIG.search.allowedDomains,
      // Add your custom domains
      'techcrunch.com',
      'hackernews.com',
      'stackoverflow.com',
    ],
  },
};
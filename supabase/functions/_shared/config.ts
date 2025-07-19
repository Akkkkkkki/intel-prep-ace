// Centralized configuration for interview research system
// Adjust these values to fine-tune the research process

export const RESEARCH_CONFIG = {
  // OpenAI Configuration
  openai: {
    model: 'gpt-4o',
    fallbackModel: 'gpt-4o-mini', // Used for less critical operations
    maxTokens: {
      companyAnalysis: 5000,
      interviewSynthesis: 5000,
      cvAnalysis: 3000,
      questionGeneration: 3000,
    },
    temperature: {
      analysis: 0.3,      // More deterministic for factual analysis
      synthesis: 0.5,     // More creative for personalized guidance
      questions: 0.5,     // Balanced for question generation
    },
    useJsonMode: true,    // Force JSON responses for reliability
  },

  // Tavily API Configuration
  tavily: {
    searchDepth: 'advanced' as const,
    maxResults: {
      discovery: 20,      // Results per search query in discovery phase
      extraction: 30,     // Maximum URLs to extract content from
    },
    timeRange: 'year' as const,  // Focus on recent data (year/month/week/day)
    includeRawContent: true,     // Essential for deep content analysis
    
    // Credit usage limits (1 credit per search, 1 per extraction)
    maxCreditsPerSearch: 55,     // Safety limit (20 searches + 30 extractions + buffer)
  },

  // Search Target Configuration
  search: {
    // Pre-approved domains for interview research
    allowedDomains: [
      'glassdoor.com',
      'levels.fyi', 
      'blind.teamblind.com',
      'linkedin.com',
      'indeed.com',
      '1point3acres.com',
      'reddit.com',
      'interviewing.io',
      'leetcode.com',
      'geeksforgeeks.org',
      'interviewbit.com',
      'pramp.com',
      'educative.io',
    ],

    // Company ticker symbols for Blind searches
    companyTickers: {
      'amazon': 'AMZN',
      'microsoft': 'MSFT', 
      'google': 'GOOGL',
      'alphabet': 'GOOGL',
      'meta': 'META',
      'facebook': 'META',
      'apple': 'AAPL',
      'netflix': 'NFLX',
      'tesla': 'TSLA',
      'nvidia': 'NVDA',
      'salesforce': 'CRM',
      'oracle': 'ORCL',
      'uber': 'UBER',
      'airbnb': 'ABNB',
      'stripe': 'STRIPE',
      'snowflake': 'SNOW',
      'databricks': 'DATABRICKS',
      'palantir': 'PLTR',
      'coinbase': 'COIN',
      'shopify': 'SHOP',
      'zoom': 'ZM',
      'slack': 'CRM', // Part of Salesforce
      'github': 'MSFT', // Part of Microsoft
      'linkedin': 'MSFT', // Part of Microsoft
      'bytedance': 'BDNCE',
      'tiktok': 'BDNCE',
      'openai': 'OPENAI',
      'anthropic': 'ANTHROPIC',
    },

    // Search query templates
    queryTemplates: {
      glassdoor: [
        '{company} {role} Interview Questions & Answers site:glassdoor.com/Interview',
        '{company} interview process {role} {country} 2024 2025 site:glassdoor.com',
        '{company} interview experience {role} recent 2024 site:glassdoor.com',
        '{company} interview rounds stages {role} site:glassdoor.com',
      ],
      blind: [
        '{ticker} interview {role} site:blind.teamblind.com',
        'interview {ticker} {role} experience site:blind.teamblind.com',
        '{company} {role} interview recent site:blind.teamblind.com',
      ],
      international: [
        '{company} {role} interview 面试 site:1point3acres.com',
        '{company} interview experience {role} site:1point3acres.com',
      ],
      general: [
        '{company} {role} interview 2024 site:levels.fyi',
        '{company} {role} interview process site:leetcode.com',
        '{company} {role} interview experience 2024 site:reddit.com',
        '{company} {role} interview questions recent site:reddit.com',
        '{company} interview process how many rounds stages',
        '{company} what do they look for hiring criteria recent',
      ],
    },
  },

  // Content Processing Configuration
  content: {
    maxContentLength: {
      sourceSnippet: 4500,    // Characters per raw content source
      deepExtract: 6000,      // Characters per deep extracted content
      contextBuilding: 32000, // Total context length for AI analysis
    },
    
    // URL filtering for interview content
    interviewUrlPatterns: [
      '/Interview',           // Glassdoor interview pages
      'blind.teamblind.com',  // Blind discussion boards
      '1point3acres.com',     // International forum
      'levels.fyi',           // Compensation and interview data
      'interview',            // General interview keyword in URL/content
    ],
  },

  // Performance and Reliability Configuration
  performance: {
    timeouts: {
      tavilySearch: 30000,    // 30 seconds per search
      tavilyExtract: 45000,   // 45 seconds for extraction
      openaiCall: 60000,      // 60 seconds for AI analysis
    },
    
    retries: {
      maxRetries: 2,          // Maximum retry attempts for failed API calls
      retryDelay: 1000,       // Delay between retries (milliseconds)
    },
    
    concurrency: {
      maxParallelSearches: 12, // Maximum concurrent Tavily searches
      maxParallelExtracts: 8,  // Maximum concurrent extractions
    },
    
    // Target performance metrics
    targetDuration: {
      discoveryPhase: 30000,   // 30 seconds for discovery searches
      extractionPhase: 20000,  // 20 seconds for content extraction
      analysisPhase: 15000,    // 15 seconds for AI analysis
      totalEndToEnd: 60000,    // 60 seconds total target
    },
  },

  // Logging Configuration
  logging: {
    enableFileLogging: true,    // Save detailed logs to file system
    enableConsoleLogging: true, // Console output for debugging
    logLevel: 'INFO' as const,  // DEBUG | INFO | WARN | ERROR
    
    maxLogFileSize: 10 * 1024 * 1024, // 10MB max log file size
    keepLogFiles: 60,           // Keep logs for 30 days
    
    // What to log for debugging
    logApiRequests: true,       // Full API request/response data
    logPhaseTransitions: true,  // Phase-by-phase progress
    logPerformanceMetrics: true, // Timing and performance data
    logContentSamples: true,    // Sample content for debugging (first 500 chars)
  },

  // Feature Flags
  features: {
    enableDeepExtraction: true,     // Use Tavily extract API for full content
    enableCompanyTickers: true,     // Use ticker symbols for Blind searches
    enableInternationalSearch: true, // Include 1point3acres and international sites
    enableRecentTimeFilter: true,   // Apply recent time filters (2024-2025)
    enableInterviewStageExtraction: true, // Extract stages from candidate reports
    enableJsonMode: true,           // Force JSON responses from OpenAI
    enableFallbackResponses: true,  // Provide fallback data when APIs fail
  },

  // Development and Testing Configuration
  development: {
    mockApiResponses: false,    // Use mock data instead of real API calls
    verboseLogging: true,       // Extra detailed logging for development
    saveRawResponses: true,     // Save raw API responses for analysis
    skipCache: false,           // Bypass any caching mechanisms
    
    // Test configuration
    testMode: {
      enabled: false,           // Enable test mode
      limitSearches: 3,         // Limit to 3 searches in test mode
      limitExtractions: 5,      // Limit to 5 extractions in test mode
      useMockData: false,       // Use predefined mock responses
    },
  },
};

// Utility functions for configuration
export const getCompanyTicker = (companyName: string): string => {
  return RESEARCH_CONFIG.search.companyTickers[companyName.toLowerCase()] || companyName.toUpperCase();
};

export const buildSearchQuery = (
  template: string, 
  company: string, 
  role?: string, 
  country?: string,
  ticker?: string
): string => {
  return template
    .replace('{company}', company)
    .replace('{role}', role || '')
    .replace('{country}', country || '')
    .replace('{ticker}', ticker || getCompanyTicker(company))
    .replace(/\s+/g, ' ')  // Clean up extra spaces
    .trim();
};

export const getAllSearchQueries = (company: string, role?: string, country?: string): string[] => {
  const ticker = getCompanyTicker(company);
  const { queryTemplates } = RESEARCH_CONFIG.search;
  
  const queries: string[] = [];
  
  // Add Glassdoor queries
  queryTemplates.glassdoor.forEach(template => {
    queries.push(buildSearchQuery(template, company, role, country, ticker));
  });
  
  // Add Blind queries
  queryTemplates.blind.forEach(template => {
    queries.push(buildSearchQuery(template, company, role, country, ticker));
  });
  
  // Add international queries if enabled
  if (RESEARCH_CONFIG.features.enableInternationalSearch) {
    queryTemplates.international.forEach(template => {
      queries.push(buildSearchQuery(template, company, role, country, ticker));
    });
  }
  
  // Add general queries
  queryTemplates.general.forEach(template => {
    queries.push(buildSearchQuery(template, company, role, country, ticker));
  });
  
  return queries;
};

// Configuration validation
export const validateConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Validate required configurations
  if (RESEARCH_CONFIG.tavily.maxResults.extraction > 20) {
    errors.push('Tavily extraction limit should not exceed 20 URLs to manage costs');
  }
  
  if (RESEARCH_CONFIG.openai.maxTokens.companyAnalysis > 4000) {
    errors.push('OpenAI max tokens for company analysis should not exceed 4000');
  }
  
  if (RESEARCH_CONFIG.search.allowedDomains.length === 0) {
    errors.push('At least one allowed domain must be specified');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};
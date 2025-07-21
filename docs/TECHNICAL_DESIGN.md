# Technical Design Document: INT - Interview Prep Tool

## Table of Contents
1. [System Architecture Overview](#1-system-architecture-overview)
2. [Database Schema](#2-database-schema)
3. [API Design](#3-api-design)
4. [Authentication Architecture](#4-authentication-architecture)
5. [Component Architecture](#5-component-architecture)
6. [State Management Strategy](#6-state-management-strategy)
7. [Design System](#7-design-system)
8. [Real-time Features](#8-real-time-features)
9. [Error Handling Strategy](#9-error-handling-strategy)
10. [Security Architecture](#10-security-architecture)
11. [Performance Optimization](#11-performance-optimization)
12. [Development Environment](#12-development-environment)
13. [Testing Strategy](#13-testing-strategy)
14. [Scalability Considerations](#14-scalability-considerations)
15. [Risk Mitigation](#15-risk-mitigation)
16. [Quick Reference](#16-quick-reference)

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Client  │    │  Supabase Stack  │    │  OpenAI API     │
│                 │    │                  │    │                 │
│ • React + Vite  │◄──►│ • PostgreSQL     │    │ • GPT-4o        │
│ • TypeScript    │    │ • Auth           │◄──►│ • Deep Research │
│ • Tailwind CSS  │    │ • Edge Functions │    │ • Completions   │
│ • shadcn/ui     │    │ • Storage        │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### 1.2 Technology Stack

#### Frontend
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite for fast development and optimized builds
- **Styling:** Tailwind CSS with custom design system
- **UI Components:** shadcn/ui for consistent, accessible components
- **State Management:** React Context for auth, React Query for server state
- **Routing:** React Router v6 for client-side navigation

#### Backend
- **Database:** Supabase PostgreSQL with Row Level Security (RLS)
- **Authentication:** Supabase Auth (email/password)
- **API Layer:** Supabase Edge Functions (Deno runtime)
- **File Storage:** Supabase Storage for CV uploads (future)

#### External Services
- **AI Research:** OpenAI API (GPT-4o) with JSON mode for reliable parsing
- **Internet Research:** Tavily API for real candidate experience extraction
- **Deployment:** Lovable hosting platform

### 1.3 Key Design Decisions

#### Why Supabase Over Custom Backend?
- **Rapid Development:** Built-in auth, real-time, and database
- **Row Level Security:** Database-level access control
- **Edge Functions:** Serverless API endpoints with global distribution
- **Type Generation:** Automatic TypeScript types from schema

#### Why shadcn/ui Over Other UI Libraries?
- **Accessibility First:** Built on Radix UI primitives
- **Customizable:** Copy-paste approach allows full customization
- **TypeScript Native:** Excellent type safety and developer experience
- **Design System:** Consistent variant system with CVA

## 2. Database Schema

> **📋 Complete Schema Documentation**: See [Optimized Database Schema](./OPTIMIZED_DATABASE_SCHEMA.md) for the full hybrid scraping schema documentation.

### 2.1 Hybrid Scraping Architecture

The database has been completely optimized for **hybrid native + Tavily scraping** approach:

#### **Key Improvements:**
- ✅ **Native scraping tables** for structured forum data (Glassdoor, Reddit, Blind, LeetCode)
- ✅ **Quality scoring system** with automated content assessment  
- ✅ **Cost optimization** through intelligent URL deduplication and caching
- ✅ **Performance indexes** for sub-second query response times
- ✅ **Real-time analytics** for scraping performance monitoring

#### **Core New Tables:**
- `native_interview_experiences` - Structured forum experiences with metadata
- `api_call_logs` - Unified logging for all API providers (Tavily, Reddit, OpenAI)  
- `scraping_metrics` - Real-time performance and quality analytics
- Enhanced `scraped_urls` - Native source tracking and quality scoring

### 2.2 Entity Relationship Diagram

```mermaid
erDiagram
    profiles ||--o{ searches : creates
    searches ||--o{ interview_stages : contains
    searches ||--o{ resumes : includes
    searches ||--o{ practice_sessions : generates
    searches ||--o{ cv_job_comparisons : has
    searches ||--o{ enhanced_question_banks : contains
    searches ||--o{ native_interview_experiences : stores
    searches ||--o{ api_call_logs : tracks
    searches ||--o{ scraping_metrics : monitors
    interview_stages ||--o{ interview_questions : has
    practice_sessions ||--o{ practice_answers : records
    interview_questions ||--o{ practice_answers : answers
    
    profiles {
        uuid id PK
        text email
        text full_name
        text avatar_url
        timestamp created_at
        timestamp updated_at
    }
    
    searches {
        uuid id PK
        uuid user_id FK
        text company
        text role
        text country
        text role_links
        text search_status
        jsonb cv_job_comparison
        jsonb enhanced_question_bank
        text[] preparation_priorities
        float overall_fit_score
        timestamp created_at
    }
    
    interview_stages {
        uuid id PK
        uuid search_id FK
        text name
        text duration
        text interviewer
        text content
        text guidance
        integer order_index
        timestamp created_at
    }
    
    interview_questions {
        uuid id PK
        uuid stage_id FK
        text question
        timestamp created_at
    }
    
    resumes {
        uuid id PK
        uuid user_id FK
        uuid search_id FK
        text content
        jsonb parsed_data
        timestamp created_at
    }
    
    cv_job_comparisons {
        uuid id PK
        uuid search_id FK
        uuid user_id FK
        jsonb skill_gap_analysis
        jsonb experience_gap_analysis
        jsonb personalized_story_bank
        jsonb interview_prep_strategy
        float overall_fit_score
        text[] preparation_priorities
        timestamp created_at
        timestamp updated_at
    }
    
    enhanced_question_banks {
        uuid id PK
        uuid search_id FK
        uuid user_id FK
        text interview_stage
        jsonb behavioral_questions
        jsonb technical_questions
        jsonb situational_questions
        jsonb company_specific_questions
        jsonb role_specific_questions
        jsonb experience_based_questions
        jsonb cultural_fit_questions
        integer total_questions
        jsonb generation_context
        timestamp created_at
        timestamp updated_at
    }
    
    interview_experiences {
        uuid id PK
        uuid search_id FK
        text company_name
        text role_title
        text experience_type
        text difficulty_rating
        text process_duration
        text experience_text
        text interviewer_feedback
        text[] questions_asked
        text source_url
        text source_platform
        timestamp created_at
    }
    
    tavily_searches {
        uuid id PK
        uuid search_id FK
        uuid user_id FK
        text api_type
        text endpoint_url
        jsonb request_payload
        text query_text
        text search_depth
        integer max_results
        text[] include_domains
        jsonb response_payload
        integer response_status
        integer results_count
        integer request_duration_ms
        integer credits_used
        text error_message
        timestamp created_at
    }
    
    openai_calls {
        uuid id PK
        uuid search_id FK
        uuid user_id FK
        text function_name
        text model
        text endpoint_url
        jsonb request_payload
        jsonb response_payload
        integer response_status
        integer prompt_tokens
        integer completion_tokens
        integer total_tokens
        integer request_duration_ms
        text error_message
        timestamp created_at
    }
    
    function_executions {
        uuid id PK
        uuid search_id FK
        uuid user_id FK
        text function_name
        jsonb raw_inputs
        jsonb raw_outputs
        jsonb processed_outputs
        text status
        integer execution_time_ms
        text error_message
        uuid[] tavily_call_ids
        uuid[] openai_call_ids
        timestamp created_at
        timestamp updated_at
    }
    
    practice_sessions {
        uuid id PK
        uuid user_id FK
        uuid search_id FK
        timestamp started_at
        timestamp completed_at
    }
    
    practice_answers {
        uuid id PK
        uuid session_id FK
        uuid question_id FK
        text text_answer
        text audio_url
        integer answer_time_seconds
        timestamp created_at
    }
```

### 2.2 Table Specifications

#### Core Workflow Tables

##### profiles
- **Purpose:** Store user profile information with auto-creation trigger
- **RLS Policies:** Users can view/update their own profile only
- **Indexes:** Primary key on id, unique on email

##### searches
- **Purpose:** Track user search queries and aggregated results
- **Status Flow:** `pending` → `processing` → `completed` | `failed`
- **Enhanced Data:** Stores final processed results from all functions
- **RLS Policies:** Users can create/view their own searches only

##### interview_stages & interview_questions
- **Purpose:** Store structured interview process and questions
- **Generation:** AI-generated during search processing
- **RLS Policies:** Users can view data for their searches only

##### resumes
- **Purpose:** Store user CVs with parsed data (cleaned up - no redundant columns)
- **Structure:** Only essential fields: id, user_id, search_id, content, parsed_data, created_at
- **Parsing:** All structured data stored in `parsed_data` JSONB field

#### Enhanced Data Tables

##### cv_job_comparisons
- **Purpose:** Store detailed CV-job fit analysis results
- **Data:** Skill gaps, experience analysis, preparation strategies

##### enhanced_question_banks
- **Purpose:** Store categorized interview questions by stage
- **Categories:** Behavioral, technical, situational, company-specific, etc.

##### interview_experiences
- **Purpose:** Store research data from interview experiences
- **Sources:** Glassdoor, Reddit, LinkedIn, etc.

#### Comprehensive Logging Tables

##### tavily_searches
- **Purpose:** Log ALL Tavily API calls (search/extract) with full audit trail
- **Data:** Complete request/response payloads, performance metrics, cost tracking
- **Benefits:** Cost monitoring, debugging, reprocessing capability

##### openai_calls
- **Purpose:** Log ALL OpenAI API calls with token usage tracking
- **Data:** Full request/response, token counts, cost calculation
- **Benefits:** Cost optimization, performance monitoring

##### function_executions
- **Purpose:** Log complete function executions with raw and processed data
- **Data:** Raw inputs, raw API responses, final processed outputs
- **Benefits:** Complete audit trail, debugging, data reprocessing

### 2.3 Data Flow Architecture

```
User Input → Function Execution → Multiple API Calls → Raw Data Storage → Processed Results
     ↓              ↓                    ↓                   ↓                 ↓
  searches    function_executions   tavily_searches    raw_outputs      final tables
                                   openai_calls       raw_inputs       (cv_job_comparisons,
                                                                       enhanced_question_banks)
```

### 2.4 Logging & Audit Trail Strategy

- **Complete API Coverage:** Every external API call logged
- **Cost Tracking:** Real-time monitoring of Tavily credits and OpenAI tokens
- **Performance Metrics:** Response times, success rates, error tracking
- **Data Preservation:** Raw API responses stored for reprocessing
- **Debugging Support:** Full request/response history for troubleshooting

## 3. API Design - Microservices Architecture

### 3.1 Overview

The INT application uses a microservices architecture with four specialized Edge Functions:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   cv-analysis   │    │ company-research │    │  job-analysis   │
│                 │    │                  │    │                 │
│ • CV parsing    │    │ • Tavily search  │    │ • URL extraction│
│ • AI analysis   │    │ • Company data   │    │ • Requirements  │
│ • Skills extract│    │ • Culture info   │    │ • Analysis      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                    ┌──────────────────┐
                    │interview-research│
                    │                  │
                    │ • Orchestrator   │
                    │ • AI synthesis   │
                    │ • Final outputs  │
                    └──────────────────┘
```

### 3.2 Edge Function: cv-analysis

#### Endpoint
`POST /functions/v1/cv-analysis`

#### Purpose
Independent CV parsing and analysis using AI.

#### Request Schema
```typescript
interface CVAnalysisRequest {
  cvText: string;
  userId: string;
}
```

#### Response Schema
```typescript
interface CVAnalysisResponse {
  success: boolean;
  parsedData: ProfileParsedData;
  aiAnalysis: CVAnalysis;
}
```

#### Processing Flow
1. **AI Analysis**: Uses LLM for CV parsing
2. **Skill Categorization**: Intelligent extraction by type
3. **Data Transformation**: Converts to UI-compatible format
4. **Return Results**: Both raw analysis and formatted data

### 3.3 Edge Function: company-research (Enhanced)

#### Endpoint
`POST /functions/v1/company-research`

#### Purpose
**Real candidate experience research** using enhanced Tavily API integration with deep content extraction.

#### Request Schema
```typescript
interface CompanyResearchRequest {
  company: string;
  role?: string;
  country?: string;
  searchId: string;
}
```

#### Response Schema
```typescript
interface CompanyResearchResponse {
  status: "success" | "error";
  company_insights: CompanyInsights;
  research_sources: number;
  extracted_urls: number;
  deep_extracts: number;
}
```

#### Enhanced Processing Flow (Retrieve-then-Extract Pattern)

**Phase 1: Discovery Searches (12 targeted queries)**
- Glassdoor interview pages: `site:glassdoor.com/Interview`
- Blind boards with company tickers: `AMZN interview`, `GOOGL interview`  
- 1point3acres for international: `interview 面试`
- Role-specific recent searches: `2024 2025`
- Raw content enabled: `include_raw_content: true`

**Phase 2: Deep Content Extraction**
- Extract URLs from discovery results
- Tavily `/extract` API for full page content (4-6k chars vs 200 char snippets)
- Focus on interview review sites (Glassdoor, Blind, 1point3acres, Reddit)
- Process up to 15 URLs for comprehensive data

**Phase 3: AI Analysis with Real Data**
- JSON mode: `response_format: { type: "json_object" }`
- Extract interview stages from actual candidate reports
- Process raw content from interview reviews
- Generate structured insights based on real experiences

#### Key Improvements
- **Real Data**: Actual candidate experiences vs LLM speculation
- **Better Targeting**: Company ticker symbols, role-specific queries
- **Deeper Analysis**: 4-6k characters per source vs previous 200 chars
- **Reliability**: JSON mode prevents parsing errors

### 3.4 Edge Function: job-analysis

#### Endpoint
`POST /functions/v1/job-analysis`

#### Purpose
Extract and analyze job requirements from URLs.

#### Request Schema
```typescript
interface JobAnalysisRequest {
  roleLinks: string[];
  searchId: string;
  company?: string;
  role?: string;
}
```

#### Response Schema
```typescript
interface JobAnalysisResponse {
  status: "success" | "error";
  job_requirements: JobRequirements;
  urls_processed: number;
}
```

#### Processing Flow
1. **URL Extraction**: Tavily extract from job posting URLs
2. **AI Analysis**: Extract structured requirements
3. **Return Data**: Skills, qualifications, responsibilities

### 3.5 Edge Function: interview-research (Orchestrator)

#### Endpoint
`POST /functions/v1/interview-research`

#### Purpose
**Synthesis orchestrator** that generates all final user outputs.

#### Request Schema
```typescript
interface SynthesisRequest {
  company: string;
  role?: string;
  country?: string;
  roleLinks?: string[];
  cv?: string;
  userId: string;
  searchId: string;
}
```

#### Response Schema
```typescript
interface SynthesisResponse {
  status: "success" | "error";
  message: string;
  insights: {
    company_data_found: boolean;
    job_data_found: boolean;
    cv_analyzed: boolean;
    stages_created: number;
    personalized_guidance: PersonalizedGuidance;
  };
}
```

#### Processing Flow
1. **Data Gathering**: Call other microservices in parallel
2. **AI Synthesis**: Generate personalized interview guidance
3. **Database Storage**: Store stages, questions, guidance
4. **Status Update**: Mark search as completed

#### Final Outputs Generated
- **Interview Stages**: Company-specific process breakdown
- **Targeted Questions**: 4-6 questions per stage
- **Personalized Guidance**: Based on CV analysis
- **Preparation Timeline**: Week-by-week action plan

### 3.6 Advanced CV Analysis

#### Endpoint
`POST /functions/v1/cv-analysis`

#### Advanced AI-Powered CV Analysis
The CV analysis system uses GPT-4o-mini for sophisticated resume parsing with structured output.

#### Request Schema
```typescript
interface CVAnalysisRequest {
  cvText: string;
  userId: string;
}
```

#### Response Schema
```typescript
interface CVAnalysisResponse {
  success: boolean;
  parsedData: ProfileParsedData;
  aiAnalysis: CVAnalysis;
}

interface CVAnalysis {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  current_role?: string;
  experience_years?: number;
  skills: {
    technical: string[];
    soft: string[];
    certifications: string[];
  };
  education: {
    degree?: string;
    institution?: string;
    graduation_year?: number;
  };
  experience: {
    company: string;
    role: string;
    duration: string;
    achievements: string[];
  }[];
  projects: string[];
  key_achievements: string[];
}
```

#### Processing Flow
1. **AI Analysis**: Uses GPT-4o-mini with structured prompts for comprehensive parsing
2. **Skill Categorization**: Intelligent extraction of technical, programming, frameworks, tools, and soft skills
3. **Data Transformation**: Converts AI output to Profile component format
4. **Structured Storage**: Saves both raw AI analysis and formatted data

#### Key Features
- **15+ Data Fields**: Personal info, professional summary, work history, skills, education, projects, certifications
- **Intelligent Categorization**: Automatically categorizes skills by type (programming languages, frameworks, tools)
- **Fallback Handling**: Graceful error recovery with minimal data structures
- **Format Conversion**: Transforms AI output to UI-compatible format

### 3.3 Client-Side API Layer

#### Search Service
```typescript
// src/services/searchService.ts
export const searchService = {
  // Core search operations
  async createSearch(params: CreateSearchParams): Promise<{ searchId?: string; success: boolean; error?: any }>
  async getSearchResults(searchId: string): Promise<{ search: any; stages: any[]; success: boolean; error?: any }>
  async getSearchHistory(): Promise<{ searches?: SearchHistoryItem[]; success: boolean; error?: any }>
  
  // Practice operations
  async createPracticeSession(searchId: string): Promise<{ session?: any; success: boolean; error?: any }>
  async savePracticeAnswer(params: SaveAnswerParams): Promise<{ success: boolean; error?: any }>
  
  // Resume operations
  async saveResume(params: SaveResumeParams): Promise<{ resume?: any; success: boolean; error?: any }>
  async getResume(userId: string): Promise<{ resume?: any; success: boolean; error?: any }>
  
  // Advanced CV analysis operations
  async analyzeCV(cvText: string): Promise<{ success: boolean; parsedData?: any; aiAnalysis?: any; error?: any }>
}
```

#### Advanced CV Analysis Integration
```typescript
// Enhanced CV analysis workflow
const analyzeCV = async (cvText: string) => {
  try {
    // Call edge function for AI analysis
    const response = await supabase.functions.invoke("cv-analysis", {
      body: { cvText, userId: user.user.id }
    });

    if (response.error) throw new Error(response.error.message);

    return {
      success: true,
      parsedData: response.data.parsedData,  // UI-compatible format
      aiAnalysis: response.data.aiAnalysis   // Raw AI analysis
    };
  } catch (error) {
    return { error, success: false };
  }
};
```

#### Service Layer Features
- **Comprehensive Error Handling**: Consistent error patterns across all methods
- **User Context Management**: Automatic authentication validation
- **Type-Safe Responses**: Structured response formats for reliability
- **AI Integration**: Seamless edge function integration for CV analysis
- **State Synchronization**: Real-time updates with local state management

#### Error Handling Pattern
```typescript
// Consistent error handling across all service methods
try {
  const { data, error } = await supabase.from('table').operation();
  if (error) throw error;
  return { data, success: true };
} catch (error) {
  console.error("Operation failed:", error);
  return { error, success: false };
}
```

## 4. Authentication Architecture

### 4.1 Authentication Flow

#### Context-Based Authentication
```typescript
// src/components/AuthProvider.tsx
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}

// Critical pattern: Set up listener BEFORE checking session
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  (event, session) => {
    setSession(session);
    setUser(session?.user ?? null);
    setLoading(false);
  }
);

// THEN check for existing session
supabase.auth.getSession().then(({ data: { session } }) => {
  setSession(session);
  setUser(session?.user ?? null);
  setLoading(false);
});
```

#### Protected Routes Pattern
```typescript
// src/App.tsx
const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuthContext();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    // Preserve intended destination for post-login redirect
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return children;
};
```

#### Session Management
- **Persistence:** Uses `localStorage` for session persistence
- **Auto-refresh:** Automatic token refresh enabled
- **Redirect Handling:** Preserves intended route after authentication

### 4.2 Authorization Strategy

#### Row Level Security (RLS) Policies
```sql
-- User data isolation
CREATE POLICY "Users can view own data" ON searches
  FOR SELECT USING (auth.uid() = user_id);

-- Service role access for Edge Functions
CREATE POLICY "Service role can insert interview questions" 
  ON interview_questions 
  FOR INSERT 
  WITH CHECK (
    auth.uid() IS NULL OR 
    auth.uid() IN (
      SELECT s.user_id 
      FROM searches s
      JOIN interview_stages st ON s.id = st.search_id
      WHERE st.id = stage_id
    )
  );
```

#### Client-Side Authorization
- **Route Protection:** All routes except `/auth` and `/` require authentication
- **API Calls:** All service methods verify user authentication
- **UI Components:** Conditional rendering based on auth state

## 5. Component Architecture

### 5.1 Component Hierarchy

```
App
├── AuthProvider (Context)
├── QueryClientProvider (React Query)
├── TooltipProvider (shadcn/ui)
├── Router
│   ├── Home
│   │   └── SearchForm
│   ├── Dashboard
│   │   ├── ProcessOverview
│   │   ├── PreparationTable
│   │   ├── LoadingState
│   │   └── ErrorState
│   ├── Practice
│   │   ├── QuestionCard
│   │   ├── RecordingControls
│   │   ├── Timer
│   │   └── ProgressIndicator
│   ├── Profile
│   │   ├── CVUpload
│   │   ├── CVParsingDisplay
│   │   └── UserSettings
│   ├── Auth
│   │   ├── SignInForm
│   │   └── SignUpForm
│   └── Navigation
│       ├── DesktopNav
│       ├── MobileNav
│       └── SearchHistory
└── Toaster (Global notifications)
```

### 5.2 Advanced Navigation System

#### Smart Context Management
The navigation system implements sophisticated state management and context preservation:

```typescript
// Advanced Navigation Features
interface NavigationProps {
  showHistory?: boolean;
  showSearchSelector?: boolean;
}

interface SearchHistoryItem {
  id: string;
  company: string;
  role: string | null;
  country: string | null;
  search_status: string;
  created_at: string;
}
```

#### Key Features
- **Real-time Search Selector**: Dropdown for switching between active searches
- **Context-Aware URL Management**: Preserves search context across all routes
- **Status-Based History**: Visual indicators for search states (Completed, Processing, Pending, Failed)
- **Mobile-Responsive Design**: Adaptive layout for desktop and mobile
- **Progressive Loading**: Lazy-loaded history with error handling

#### Smart URL State Management
```typescript
// Context preservation across navigation
const getNavigationPath = (path: string) => {
  // For practice page, always include searchId to ensure questions load
  if (path === "/practice" && currentSearchId) {
    return `${path}?searchId=${currentSearchId}`;
  }
  return currentSearchId ? `${path}?searchId=${currentSearchId}` : path;
};

// Real-time search switching
const handleSearchSelection = (searchId: string) => {
  const currentPath = location.pathname;
  if (searchId === "none") {
    navigate(currentPath);
  } else {
    navigate(`${currentPath}?searchId=${searchId}`);
  }
};
```

#### Real-time Status Management
- **Live Status Updates**: Real-time polling integration with navigation
- **Visual Status Indicators**: Color-coded badges for search states
- **Contextual Actions**: State-specific navigation options

### 5.3 Component Patterns

#### Error Boundary Pattern
```typescript
// Consistent error UI across pages
if (error) {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Error Loading Content</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={retryFunction} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

#### Loading State Pattern
```typescript
// Consistent loading UI
if (isLoading) {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <Card className="w-full max-w-md mx-auto text-center">
          <CardHeader>
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <CardTitle>Loading Content</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Please wait while we prepare your data...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

## 6. State Management Strategy

### 6.1 Global State (React Context)

#### AuthContext
```typescript
// Global authentication state
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Usage pattern
const { user, session, loading, signIn, signOut } = useAuthContext();
```

#### Toast Context
```typescript
// Global notification system using reducer pattern
const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }
    // ... other cases
  }
}
```

### 6.2 URL-Based State Management

#### Search State
```typescript
// Dashboard uses URL parameters for state persistence
const [searchParams] = useSearchParams();
const searchId = searchParams.get('searchId');

// Navigation preserves search context
const getNavigationPath = (path: string) => {
  return currentSearchId ? `${path}?searchId=${currentSearchId}` : path;
};
```

#### Practice State
```typescript
// Practice mode receives state via URL
const searchId = searchParams.get('searchId');
const stageIds = searchParams.get('stages')?.split(',') || [];

// Navigation to practice with selected stages
navigate(`/practice?searchId=${searchId}&stages=${selectedStageIds.join(',')}`);
```

### 6.3 Local State Patterns

#### Form State Management
```typescript
// Consistent form state pattern
const [formData, setFormData] = useState({
  company: "",
  role: "",
  country: "",
  cv: "",
  roleLinks: ""
});

const handleInputChange = (field: string, value: string) => {
  setFormData(prev => ({ ...prev, [field]: value }));
  setError(""); // Clear errors on input change
};
```

#### Complex Local State (Practice Page)
```typescript
// Multi-state management for practice session
const [questions, setQuestions] = useState<Question[]>([]);
const [currentIndex, setCurrentIndex] = useState(0);
const [answer, setAnswer] = useState("");
const [timeElapsed, setTimeElapsed] = useState(0);
const [isTimerRunning, setIsTimerRunning] = useState(false);
const [savedAnswers, setSavedAnswers] = useState<Map<string, boolean>>(new Map());
```

### 6.4 Server State (React Query)

#### Query Client Setup
```typescript
// App.tsx
const queryClient = new QueryClient();

// Wraps entire app for server state management
<QueryClientProvider client={queryClient}>
  <AuthProvider>
    {/* App content */}
  </AuthProvider>
</QueryClientProvider>
```

## 7. Design System

### 7.1 Color System

#### CSS Custom Properties (HSL-based)
```css
/* src/index.css - Fresh Green Theme */
:root {
  /* Primary: Fresh Green (#28A745) */
  --primary: 134 61% 41%;
  --primary-foreground: 0 0% 100%;

  /* Accent: Deep Green (#1B5E20) */
  --accent: 125 54% 24%;
  --accent-foreground: 0 0% 100%;

  /* Semantic colors */
  --success: 134 61% 41%;
  --warning: 38 92% 50%;
  --destructive: 0 84% 60%;
  
  /* Neutral system */
  --background: 0 0% 100%;
  --foreground: 220 13% 15%;
  --muted: 210 17% 98%;
  --muted-foreground: 220 9% 46%;
}
```

#### Tailwind Integration
```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        // ... other colors
      }
    }
  }
}
```

### 7.2 Component Variants

#### Button System
```typescript
// src/components/ui/button.tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    }
  }
)
```

### 7.3 Typography System

#### Font Stack
```css
/* System font stack for performance */
body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
```

#### Heading Hierarchy
- **H1:** `text-5xl font-bold` (Brand name, hero headings)
- **H2:** `text-3xl font-bold` (Page titles)
- **H3:** `text-2xl font-semibold` (Card titles)
- **Body:** `text-sm` / `text-base` (Content)
- **Caption:** `text-xs text-muted-foreground` (Helper text)

### 7.4 Accessibility Features

#### Focus Management
```css
/* Custom focus rings */
.focus-visible {
  @apply ring-2 ring-primary ring-offset-2 outline-none;
}
```

#### ARIA Labels & Semantic HTML
```typescript
// Carousel component with accessibility
<div
  role="region"
  aria-roledescription="carousel"
  onKeyDownCapture={handleKeyDown}
>
  {/* Carousel content with proper ARIA attributes */}
</div>
```

#### Screen Reader Support
- Proper heading hierarchy
- ARIA labels for interactive elements
- Screen reader only content with `sr-only` class
- Semantic HTML elements (`nav`, `main`, `section`)

## 8. Real-time Features

### 8.1 Advanced Search Status Polling

#### Intelligent Polling Strategy
```typescript
// Enhanced polling with automatic cleanup and progress simulation
useEffect(() => {
  if (!searchId) return;

  // Initial load
  loadSearchData();

  // Set up polling for pending/processing searches
  const poll = setInterval(async () => {
    if (searchData?.search_status === 'pending' || searchData?.search_status === 'processing') {
      await loadSearchData();
      setProgress(prev => Math.min(prev + 5, 95)); // Progressive updates
    }
  }, 3000); // Poll every 3 seconds

  setPollingInterval(poll);

  return () => {
    if (pollingInterval) clearInterval(pollingInterval);
    clearInterval(poll);
  };
}, [searchId]);
```

#### Progressive Progress Management
```typescript
// Multi-layered progress system with simulation
const [progress, setProgress] = useState(0);

// Progress simulation during polling
useEffect(() => {
  if (searchData?.search_status === 'pending' || searchData?.search_status === 'processing') {
    const timer = setInterval(() => {
      setProgress(prev => Math.min(prev + 1, 95));
    }, 500);

    return () => clearInterval(timer);
  }
}, [searchData?.search_status]);
```

#### Status-Specific Messaging
```typescript
const statusMessages = {
  pending: "Initializing research...",
  processing: "Analyzing company data and generating personalized guidance...",
  completed: "Research complete!"
};
```

#### Key Features
- **Memory Leak Prevention**: Automatic cleanup of polling intervals
- **Progressive UI Updates**: Real-time progress simulation
- **Status-Based Messaging**: Context-aware user feedback
- **Efficient Resource Management**: Conditional polling based on status

### 8.2 Advanced Practice Session Management

#### Real-time Answer Persistence
```typescript
// Immediate answer persistence with state updates
const handleSaveAnswer = async () => {
  if (!answer.trim() || !practiceSession) return;

  try {
    const result = await searchService.savePracticeAnswer({
      sessionId: practiceSession.id,
      questionId: currentQuestion.id,
      textAnswer: answer.trim(),
      answerTime: timeElapsed
    });

    if (result.success) {
      // Update local state immediately for responsive UX
      setQuestions(prev => 
        prev.map(q => 
          q.id === questionId ? { ...q, answered: true } : q
        )
      );
      setSavedAnswers(prev => new Map(prev).set(questionId, true));
    }
  } catch (err) {
    console.error("Error saving answer:", err);
  }
};
```

#### Dynamic Stage Selection with URL Persistence
```typescript
// Real-time stage filtering with URL synchronization
const handleStageToggle = (stageId: string) => {
  const updatedStages = allStages.map(stage => 
    stage.id === stageId 
      ? { ...stage, selected: !stage.selected }
      : stage
  );
  setAllStages(updatedStages);
  
  // Update URL with new stage selection
  const selectedStageIds = updatedStages.filter(stage => stage.selected).map(stage => stage.id);
  if (selectedStageIds.length > 0) {
    setSearchParams({ searchId: searchId!, stages: selectedStageIds.join(',') });
  }
};
```

#### Session Continuation Features
- **Question Shuffling**: Randomized question order for varied practice
- **Progress Tracking**: Real-time answered/unanswered state management
- **Timer Persistence**: Continuous timing across question navigation
- **State Recovery**: Session restoration after page reloads

### 8.3 Navigation Context Preservation

#### Real-time Search History Loading
```typescript
// Enhanced history management with error handling
useEffect(() => {
  const loadSearchHistory = async () => {
    if (!user) return;

    setIsLoadingHistory(true);
    try {
      const result = await searchService.getSearchHistory();
      
      if (result.success && result.searches) {
        setSearchHistory(result.searches);
      }
    } catch (err) {
      console.error("Error loading search history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  loadSearchHistory();
}, [user]);
```

#### Context-Aware Navigation
- **Smart URL Management**: Automatic search context preservation
- **Progressive Disclosure**: Lazy-loaded components with proper loading states
- **Error Recovery**: Graceful fallbacks for failed operations

## 8.5 Enhanced Logging and Debugging Infrastructure

### 8.1 Comprehensive Search Execution Logging

#### SearchLogger Architecture
```typescript
// supabase/functions/_shared/logger.ts
export class SearchLogger {
  constructor(searchId: string, functionName: string, userId?: string);
  
  // Core logging methods
  log(operation: string, phase: string, data?: any, error?: string, duration?: number): void;
  logTavilySearch(query: string, phase: string, requestPayload: any, response?: any): void;
  logTavilyExtract(urls: string[], phase: string, response?: any): void;
  logOpenAI(operation: string, phase: string, request?: any, response?: any): void;
  
  // Phase transition tracking
  logPhaseTransition(fromPhase: string, toPhase: string, data?: any): void;
  logDataProcessing(operation: string, inputData: any, outputData?: any): void;
  
  // Function lifecycle
  logFunctionEnd(success: boolean, result?: any, error?: string): void;
  saveToFile(): Promise<void>;
}
```

#### Shared Utilities for Consistency

**Tavily Client** (`supabase/functions/_shared/tavily-client.ts`)
- Unified Tavily API interactions (search + extract)
- Automatic logging integration
- Error handling and retry logic
- Credit usage tracking

**OpenAI Client** (`supabase/functions/_shared/openai-client.ts`)
- Consistent OpenAI API calls with JSON mode
- Automatic error parsing
- Response validation
- Token usage tracking

### 8.2 Debugging with Log Files

#### Log File Structure
```bash
supabase/functions/logs/
├── company-research_<searchId>_<timestamp>.json     # Detailed execution log
├── company-research_<searchId>_summary.json        # Quick summary
├── interview-research_<searchId>_<timestamp>.json  # Orchestration log
└── ...
```

#### Detailed Log Format
```typescript
{
  "searchId": "uuid",
  "functionName": "company-research",
  "startTime": "2024-01-01T00:00:00Z",
  "endTime": "2024-01-01T00:05:23Z",
  "totalDuration": 323000,
  "summary": {
    "totalLogs": 45,
    "errors": 0,
    "tavilySearches": 12,
    "tavilyExtracts": 1,
    "openaiCalls": 1,
    "completedSuccessfully": true
  },
  "logs": [
    {
      "timestamp": "2024-01-01T00:00:00Z",
      "operation": "TAVILY_SEARCH",
      "phase": "DISCOVERY",
      "input": { "query": "Amazon software engineer interview site:glassdoor.com" },
      "output": { "resultsCount": 8, "extractedUrls": [...] },
      "duration": 2500
    }
    // ... all execution steps
  ]
}
```

### 8.3 Troubleshooting Fast Responses

#### Common Issues and Log Indicators

**1. Missing Tavily API Key**
```typescript
// Look for this in logs:
{
  "operation": "CONFIG_ERROR",
  "phase": "API_KEY_MISSING", 
  "error": "TAVILY_API_KEY not found"
}
```

**2. No Search Execution**
```typescript
// Should see these entries:
{
  "operation": "TAVILY_SEARCH",
  "phase": "DISCOVERY_SUCCESS",
  "output": { "resultsCount": 8 }
}
```

**3. Failed URL Extraction**
```typescript
// Check for:
{
  "operation": "URL_EXTRACTION",
  "phase": "PHASE2",
  "metadata": { "totalUrls": 0 }  // Problem if 0
}
```

**4. No Deep Content Extraction**
```typescript
// Should see:
{
  "operation": "TAVILY_EXTRACT",
  "phase": "EXTRACTION_SUCCESS",
  "output": { "extractedCount": 5 }
}
```

### 8.4 Performance Monitoring

#### Function Execution Metrics
- **Discovery Phase**: Target 15-30 seconds for 12 parallel searches
- **Extraction Phase**: Target 10-20 seconds for 15 URLs
- **AI Analysis**: Target 5-15 seconds depending on content volume
- **Total Duration**: Target under 60 seconds end-to-end

#### Credit Usage Tracking
- **Tavily Search**: 1 credit per query (12 credits per search)
- **Tavily Extract**: 1 credit per URL (up to 15 credits per search)
- **OpenAI**: Variable based on tokens (tracked in separate table)

## 9. Error Handling Strategy

### 9.1 Consistent Error Patterns

#### Service Layer Error Handling
```typescript
// src/services/searchService.ts - Standardized error pattern
export const searchService = {
  async createSearch(params: CreateSearchParams) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error("No authenticated user");
      }

      // Operation logic...
      
      return { searchId, success: true };
    } catch (error) {
      console.error("Error creating search:", error);
      return { error, success: false };
    }
  }
}
```

#### Component Error Handling
```typescript
// Consistent error state management
const [error, setError] = useState<string | null>(null);

// Clear errors on user action
const handleInputChange = (field: string, value: string) => {
  setFormData(prev => ({ ...prev, [field]: value }));
  setError(""); // Clear error on input change
};

// Display user-friendly error messages
if (error) {
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}
```

### 9.2 Error Recovery Mechanisms

#### Automatic Retry
```typescript
// Dashboard.tsx - Retry mechanism
<Button 
  onClick={() => {
    setError(null);
    setIsLoading(true);
    loadSearchData();
  }}
  className="w-full"
>
  <RefreshCw className="h-4 w-4 mr-2" />
  Try Again
</Button>
```

#### Graceful Degradation
```typescript
// Practice.tsx - Fallback for failed question loading
if (error) {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <Card className="w-full max-w-md mx-auto text-center">
          <CardHeader>
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
            <CardTitle>Practice Session Error</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button 
                onClick={() => navigate(`/dashboard${searchId ? `?searchId=${searchId}` : ''}`)}
                className="w-full"
              >
                Back to Dashboard
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/')}
                className="w-full"
              >
                Start New Search
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

### 9.3 Error Classification

#### User Errors
- **Authentication Required:** Redirect to login
- **Invalid Input:** Form validation messages
- **Not Found:** 404 with navigation options

#### System Errors
- **API Failures:** Retry mechanisms with user feedback
- **Network Issues:** Offline detection and caching
- **AI Processing Failures:** Status-based error handling

#### Edge Function Errors
```typescript
// supabase/functions/interview-research/index.ts
try {
  // Processing logic...
  
  await supabase
    .from("searches")
    .update({ search_status: "completed" })
    .eq("id", searchId);

} catch (error) {
  console.error("Research processing failed:", error);
  
  // Update search status to failed
  await supabase
    .from("searches")
    .update({ search_status: "failed" })
    .eq("id", searchId);
    
  return new Response(
    JSON.stringify({ error: "Research processing failed" }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
  );
}
```

## 10. Security Architecture

### 10.1 Authentication & Authorization

#### Authentication Flow
1. **User Registration:** Email/password via Supabase Auth
2. **Session Management:** JWT tokens with automatic refresh
3. **Route Protection:** Private routes require valid session
4. **Email Verification:** Optional for faster testing (configurable)

#### Authorization Model
- **Row Level Security (RLS):** Database-level access control
- **User Isolation:** All data scoped to authenticated user
- **API Security:** Edge functions validate user context

#### RLS Policy Examples
```sql
-- Basic user data isolation
CREATE POLICY "Users can view own searches" ON searches
  FOR SELECT USING (auth.uid() = user_id);

-- Complex cross-table authorization
CREATE POLICY "Users can view own practice answers" ON practice_answers
  FOR SELECT USING (
    auth.uid() IN (
      SELECT ps.user_id 
      FROM practice_sessions ps 
      WHERE ps.id = session_id
    )
  );

-- Service role access for Edge Functions
CREATE POLICY "Service role can insert interview stages" 
  ON interview_stages 
  FOR INSERT 
  WITH CHECK (
    auth.uid() IS NULL OR 
    auth.uid() IN (
      SELECT user_id FROM searches WHERE id = search_id
    )
  );
```

### 10.2 Data Protection

#### Sensitive Data Handling
- **CV Content:** Encrypted at rest, user-deletable
- **Search History:** User-scoped, automatic cleanup policies
- **API Keys:** Stored in Supabase secrets, not exposed to client

#### Privacy Measures
- **Data Minimization:** Only collect necessary information
- **User Control:** Full data export and deletion capabilities
- **Secure Transport:** HTTPS/TLS for all communications

#### Environment Variables
```bash
# Client-side (public)
VITE_SUPABASE_URL=<project-url>
VITE_SUPABASE_ANON_KEY=<anon-key>

# Server-side (Supabase Secrets)
OPENAI_API_KEY=<openai-key>
SUPABASE_SERVICE_ROLE_KEY=<service-key>
```

## 11. Performance Optimization

### 11.1 Timeout Prevention & Function Orchestration

The application implements comprehensive timeout handling to prevent Supabase Edge Function 504 errors and optimize microservice orchestration.

#### Microservice Timeout Configuration
```typescript
// supabase/functions/_shared/config.ts
RESEARCH_CONFIG.performance = {
  timeouts: {
    tavilySearch: 30000,    // 30 seconds per search
    tavilyExtract: 45000,   // 45 seconds for extraction  
    openaiCall: 60000,      // 60 seconds for AI analysis
  },
  
  retries: {
    maxRetries: 2,          // Maximum retry attempts
    retryDelay: 1000,       // Delay between retries
  },
  
  concurrency: {
    maxParallelSearches: 12, // Maximum concurrent searches
    maxParallelExtracts: 8,  // Maximum concurrent extractions
  }
};
```

#### Optimized Function Orchestration
```typescript
// interview-research/index.ts - Timeout prevention patterns
async function gatherCompanyData(company: string, role?: string, country?: string, searchId?: string) {
  try {
    // Set timeout for company research (60 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/company-research`, {
      method: 'POST',
      headers: { /* headers */ },
      body: JSON.stringify({ company, role, country, searchId }),
      signal: controller.signal // Abort on timeout
    });

    clearTimeout(timeoutId);
    
    if (response.ok) {
      return await response.json();
    }
    
    console.warn("Company research failed, continuing without data");
    return null;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn("Company research timed out after 60 seconds, continuing without data");
    }
    return null; // Graceful degradation
  }
}
```

#### Parallel Processing Flow
```typescript
// Restructured for parallel processing and timeout prevention
async function optimizedDataGathering() {
  // Step 1: Start company research immediately (most time-consuming)
  const companyDataPromise = gatherCompanyData(company, role, country, searchId);
  
  // Step 2: Run faster operations in parallel
  const [jobRequirements, cvAnalysis] = await Promise.all([
    gatherJobData(roleLinks || [], searchId, company, role), 
    gatherCVData(cv || "", userId)
  ]);
  
  // Step 3: Wait for company research to complete or timeout
  const companyInsights = await companyDataPromise;
  
  // Step 4: Run enhanced analysis in parallel (optional optimizations)
  const [cvJobComparison, enhancedQuestions] = await Promise.all([
    generateCVJobComparison(searchId, userId, cvAnalysis, jobRequirements, companyInsights),
    generateEnhancedQuestions(searchId, userId, companyInsights, jobRequirements, cvAnalysis, stages)
  ]);
}
```

#### API Optimization Settings
```typescript
// Reduced API load for faster processing
RESEARCH_CONFIG.tavily = {
  searchDepth: 'basic',        // Changed from 'advanced' for speed
  maxResults: {
    discovery: 12,             // Reduced from 20 to 12
    extraction: 15,            // Reduced from 30 to 15
  },
  maxCreditsPerSearch: 30,     // Reduced credit usage
};

// Streamlined search queries (removed redundant queries)
queryTemplates: {
  glassdoor: [
    '{company} {role} Interview Questions & Answers site:glassdoor.com/Interview',
    '{company} interview process {role} 2024 2025 site:glassdoor.com',
  ],
  blind: [
    '{ticker} interview {role} site:blind.teamblind.com',
    'interview {ticker} {role} experience site:blind.teamblind.com',
  ],
  // Reduced from 12+ queries to 6 for faster execution
}
```

#### Client-Side Timeout Detection
```typescript
// Enhanced polling with timeout detection and user feedback
const startStatusPolling = (searchId: string) => {
  let pollCount = 0;
  let hasShownTimeoutWarning = false;
  
  const poll = async () => {
    // Show timeout warning after 2.5 minutes
    if (pollCount > 75 && !hasShownTimeoutWarning) {
      hasShownTimeoutWarning = true;
      toast({
        title: "Research Taking Longer",
        description: "The research is taking longer than expected. You can close this dialog and check back later.",
        duration: 8000,
      });
    }
    
    // Auto-timeout detection after 8 minutes
    if (pollCount > 160) {
      setSearchStatus('failed');
      toast({
        title: "Research Timeout", 
        description: "The research process has timed out. Please try again with a smaller scope.",
        variant: "destructive",
      });
      return false;
    }
  };
};
```

#### Progress Dialog Optimization
```typescript
// More realistic progress tracking that prevents stuck-at-90% issues
useEffect(() => {
  if (searchStatus === 'pending' || searchStatus === 'processing') {
    interval = setInterval(() => {
      setProgressValue(prev => {
        // More aggressive progress for better UX
        if (prev >= 95) return Math.min(95, prev + 0.5); // Slow increment near completion
        if (prev >= 80) return prev + Math.random() * 2 + 1; // 80-95%
        return prev + Math.random() * 4 + 3; // Faster increment 0-80%
      });
    }, 1500); // Faster updates (1.5s vs 2s)
  } else if (searchStatus === 'completed') {
    setProgressValue(100); // Immediate completion
  }
}, [searchStatus]);
```

### 11.2 Frontend Optimizations

#### Bundle Optimization
- **Code Splitting:** Route-based lazy loading
- **Tree Shaking:** Eliminate unused code via Vite
- **Asset Optimization:** Optimized images and fonts

#### Runtime Performance
```typescript
// React optimization patterns
const MemoizedComponent = React.memo(Component);

const handleCallback = useCallback(() => {
  // Expensive operation
}, [dependency]);

const expensiveValue = useMemo(() => {
  return computeExpensiveValue(props);
}, [props]);
```

#### Caching Strategy
- **React Query:** Server state caching
- **localStorage:** User preferences and form state
- **Supabase:** Built-in query caching

### 11.3 Database Performance

#### Query Optimization
```sql
-- Indexes for common queries
CREATE INDEX idx_searches_user_created ON searches(user_id, created_at DESC);
CREATE INDEX idx_interview_stages_search_order ON interview_stages(search_id, order_index);
CREATE INDEX idx_practice_answers_session ON practice_answers(session_id, created_at);
```

#### Data Fetching Patterns
```typescript
// Efficient parallel queries
const stagesWithQuestions = await Promise.all(
  stages.map(async (stage) => {
    const { data: questions } = await supabase
      .from("interview_questions")
      .select("*")
      .eq("stage_id", stage.id);

    return { ...stage, questions: questions || [] };
  })
);
```

### 11.4 AI Performance

#### Request Optimization
```typescript
// OpenAI API configuration with timeout
{
  model: 'gpt-4o',
  messages: [...],
  max_tokens: 4000,
  temperature: 0.7,
  timeout: 60000, // 60 second timeout
  response_format: { type: "json_object" }, // Force JSON mode
}
```

#### Error Handling & Timeouts
- **Timeout Handling:** 60-second timeout for AI requests
- **Graceful Degradation:** Continue processing without failed components
- **User Communication:** Real-time progress indicators and timeout warnings
- **Retry Logic:** Exponential backoff for failed requests

#### Performance Targets
- **Discovery Phase**: 15-30 seconds for 12 parallel searches
- **Extraction Phase**: 10-20 seconds for 15 URLs
- **AI Analysis**: 5-15 seconds depending on content volume
- **Total Duration**: Target under 2-3 minutes end-to-end (down from previous 150+ seconds timeout)

## 12. Development Environment

### 12.1 Build Configuration

#### Vite Configuration
```typescript
// vite.config.ts
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(), // Lovable integration
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
```

#### TypeScript Configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### 12.2 Code Quality

#### ESLint Configuration
```javascript
// eslint.config.js
export default [
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'prefer-const': 'error',
    }
  }
];
```

#### Development Scripts
```json
// package.json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:dev": "vite build --mode development",
    "lint": "eslint .",
    "preview": "vite preview"
  }
}
```

### 12.3 Lovable Integration

#### Component Tagging
```typescript
// Automatic component identification for Lovable
plugins: [
  react(),
  mode === 'development' && componentTagger(),
].filter(Boolean)
```

## 13. Testing Strategy

### 13.1 Testing Pyramid

#### Unit Tests (Future Implementation)
```typescript
// Example test structure
describe('searchService', () => {
  it('should create search with valid params', async () => {
    // Mock Supabase responses
    // Test service methods
    // Assert correct behavior
  });
});
```

#### Integration Tests (Future Implementation)
- **User Flows:** Complete search → dashboard → practice flow
- **Database Operations:** Test RLS policies and data integrity
- **Edge Functions:** API contract testing with mock OpenAI

#### Manual Testing Checklist
- **Authentication Flow:** Sign up, sign in, protected routes
- **Search Creation:** Various input combinations
- **AI Processing:** Error handling and timeout scenarios
- **Practice Mode:** Question navigation and answer saving
- **Responsive Design:** Mobile and desktop layouts
- **Cross-browser:** Chrome, Firefox, Safari compatibility

### 13.2 Error Testing

#### Edge Cases
- **Empty Responses:** AI returns malformed data
- **Network Failures:** Offline scenarios
- **Authentication Expiry:** Token refresh scenarios
- **Rate Limiting:** OpenAI API limits

## 14. Scalability Considerations

### 14.1 Technical Scalability

#### Database Scaling
```sql
-- Partitioning strategy for large tables
CREATE TABLE searches_2024 PARTITION OF searches
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Read replicas for high-traffic scenarios
-- Implemented at Supabase infrastructure level
```

#### Application Scaling
- **Horizontal Scaling:** Stateless Edge Functions
- **Load Balancing:** Supabase handles traffic distribution
- **CDN Strategy:** Static asset caching via Lovable platform

#### Caching Strategy
```typescript
// React Query cache configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});
```

### 14.2 Feature Scalability

#### Extensibility Points
- **AI Model Flexibility:** Support for multiple AI providers
- **Plugin Architecture:** Modular feature additions
- **API Versioning:** Backward-compatible API evolution

#### Future Enhancements
- **Multi-language Support:** i18n implementation ready
- **Advanced Analytics:** User behavior tracking
- **Collaboration Features:** Team-based preparation
- **Mobile Apps:** React Native potential

## 15. Risk Mitigation

### 15.1 Technical Risks

#### Dependency Risks
- **OpenAI API Changes:** Version pinning and fallback strategies
- **Supabase Updates:** Regular testing of new versions
- **Browser Compatibility:** Progressive enhancement approach

#### Performance Risks
- **AI Response Time:** Timeout handling and user communication
- **Database Growth:** Query optimization and archival strategies
- **Traffic Spikes:** Rate limiting and graceful degradation

### 15.2 Operational Risks

#### Data Loss Prevention
- **Backup Strategy:** Automated database backups via Supabase
- **User Data Export:** Self-service data portability
- **Disaster Recovery:** Multi-region failover planning

#### AI Provider Risk
- **API Key Security:** Stored in Supabase secrets
- **Rate Limiting:** Implement usage tracking
- **Cost Management:** Monitor token usage and costs

## 16. Quick Reference

### 16.1 Common Commands
```bash
# Development
npm run dev                    # Start development server
npm run build                  # Production build
npm run lint                   # Code quality check

# Supabase
npx supabase start            # Start local development
npx supabase db reset         # Reset local database
npx supabase gen types typescript --local > src/integrations/supabase/types.ts
```

### 16.2 Key File Locations
```
src/
├── components/
│   ├── AuthProvider.tsx       # Global auth context
│   ├── Navigation.tsx         # Main navigation with history
│   └── ui/                    # shadcn/ui components
├── hooks/
│   ├── useAuth.ts            # Authentication hook
│   └── use-toast.ts          # Toast notification system
├── pages/
│   ├── Home.tsx              # Search creation
│   ├── Dashboard.tsx         # Results display with polling
│   ├── Practice.tsx          # Flash-card practice mode
│   ├── Profile.tsx           # CV management
│   └── Auth.tsx              # Login/signup forms
├── services/
│   └── searchService.ts      # API integration layer
├── integrations/supabase/
│   ├── client.ts             # Supabase client config
│   └── types.ts              # Auto-generated database types
└── index.css                 # Design system tokens
```

### 16.3 Environment Setup
```bash
# Required environment variables
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key

# Supabase secrets (server-side)
OPENAI_API_KEY=your-openai-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

### 16.4 Database Quick Actions
```sql
-- Check search status
SELECT id, company, search_status, created_at FROM searches ORDER BY created_at DESC;

-- View user's practice progress
SELECT ps.*, COUNT(pa.id) as answers_count 
FROM practice_sessions ps 
LEFT JOIN practice_answers pa ON ps.id = pa.session_id 
GROUP BY ps.id;

-- Reset user data (development)
DELETE FROM searches WHERE user_id = 'user-uuid';
```

### 16.5 Common Debugging

#### Authentication Issues
```typescript
// Check auth state
console.log("Auth state:", { user, session, loading });

// Verify RLS policies
// Check Supabase dashboard -> Authentication -> Policies
```

#### AI Processing Issues
```typescript
// Check Edge Function logs
// Supabase dashboard -> Edge Functions -> Logs

// Test OpenAI connection
// Verify API key in Supabase secrets
```

#### State Management Issues
```typescript
// Check URL parameters
console.log("Search params:", Object.fromEntries(searchParams));

// Verify React Query cache
// Use React Query DevTools
```

---

This technical design serves as the comprehensive blueprint for the INT application. It should be updated as the system evolves and new patterns emerge during development.
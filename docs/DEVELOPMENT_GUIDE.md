# Development Guide: INT - Interview Prep Tool

This guide provides practical patterns, conventions, and workflows for developing and maintaining the INT application.

## Table of Contents
1. [Getting Started](#getting-started)
2. [Coding Patterns](#coding-patterns)
3. [Component Development](#component-development)
4. [State Management Patterns](#state-management-patterns)
5. [API Integration](#api-integration)
6. [Error Handling](#error-handling)
7. [Testing Patterns](#testing-patterns)
8. [Debugging Guide](#debugging-guide)
9. [Common Tasks](#common-tasks)
10. [Performance Tips](#performance-tips)

## Getting Started

### Local Development Setup

```bash
# Clone and install dependencies
git clone <repository-url>
cd intel-prep-ace
npm install

# Start development server
npm run dev

# Access the application
open http://localhost:8080
```

### Environment Variables
```bash
# .env.local (create this file)
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Useful Development Commands
```bash
# Code quality
npm run lint                    # ESLint check
npm run build                   # Test production build

# Supabase (if using local development)
npx supabase start             # Start local Supabase
npx supabase db reset          # Reset database
npx supabase gen types typescript --local > src/integrations/supabase/types.ts
```

## Coding Patterns

### File Naming Conventions
```
components/          # PascalCase for React components
├── AuthProvider.tsx
├── Navigation.tsx
└── ui/
    ├── button.tsx   # lowercase for shadcn/ui components
    └── card.tsx

pages/              # PascalCase for route components
├── Home.tsx
├── Dashboard.tsx
└── Practice.tsx

hooks/              # camelCase starting with 'use'
├── useAuth.ts
└── use-toast.ts

services/           # camelCase
└── searchService.ts

utils/              # camelCase
└── formatters.ts
```

### Import Order Convention
```typescript
// 1. React and core libraries
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// 2. UI components (shadcn/ui)
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// 3. Custom components
import Navigation from "@/components/Navigation";
import { useAuthContext } from "@/components/AuthProvider";

// 4. Hooks and utilities
import { useAuth } from "@/hooks/useAuth";
import { searchService } from "@/services/searchService";

// 5. Icons (always last)
import { Search, AlertCircle, Loader2 } from "lucide-react";
```

### TypeScript Patterns

#### Interface Definitions
```typescript
// Use interfaces for component props
interface SearchFormProps {
  onSubmit: (data: SearchFormData) => void;
  isLoading?: boolean;
  initialData?: Partial<SearchFormData>;
}

// Use types for data structures
type SearchStatus = "pending" | "processing" | "completed" | "failed";

type SearchFormData = {
  company: string;
  role?: string;
  country?: string;
  roleLinks?: string;
  cv?: string;
};
```

#### Generic Service Response Pattern
```typescript
// Consistent API response type
type ServiceResponse<T> = {
  success: boolean;
  data?: T;
  error?: any;
};

// Usage example
async function getSearchResults(searchId: string): Promise<ServiceResponse<SearchResults>> {
  try {
    // ... implementation
    return { success: true, data: results };
  } catch (error) {
    return { success: false, error };
  }
}
```

## Component Development

### Component Structure Template
```typescript
// src/components/ExampleComponent.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ExampleComponentProps {
  title: string;
  onAction: () => void;
  isLoading?: boolean;
}

const ExampleComponent = ({ title, onAction, isLoading = false }: ExampleComponentProps) => {
  const [localState, setLocalState] = useState("");

  const handleAction = () => {
    // Local logic
    onAction();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={handleAction} disabled={isLoading}>
          {isLoading ? "Loading..." : "Action"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ExampleComponent;
```

### Page Component Template
```typescript
// src/pages/ExamplePage.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { useAuthContext } from "@/components/AuthProvider";

const ExamplePage = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Page initialization logic
  }, []);

  if (!user) {
    return <div>Please sign in to access this page.</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        {/* Page content */}
      </div>
    </div>
  );
};

export default ExamplePage;
```

### Loading State Pattern
```typescript
// Consistent loading UI across the app
const LoadingState = ({ message = "Loading..." }: { message?: string }) => (
  <div className="min-h-screen bg-background">
    <Navigation />
    <div className="container mx-auto px-4 py-8">
      <Card className="w-full max-w-md mx-auto text-center">
        <CardHeader>
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <CardTitle>Loading</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{message}</p>
        </CardContent>
      </Card>
    </div>
  </div>
);

// Usage in components
if (isLoading) {
  return <LoadingState message="Fetching your data..." />;
}
```

### Error State Pattern
```typescript
// Consistent error UI with retry functionality
const ErrorState = ({ 
  error, 
  onRetry, 
  backToHome = false 
}: { 
  error: string; 
  onRetry?: () => void; 
  backToHome?: boolean; 
}) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Something went wrong</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="space-y-2">
              {onRetry && (
                <Button onClick={onRetry} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              )}
              {backToHome && (
                <Button variant="outline" onClick={() => navigate('/')} className="w-full">
                  Back to Home
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Usage in components
if (error) {
  return <ErrorState error={error} onRetry={loadData} />;
}
```

## State Management Patterns

### Form State with Validation
```typescript
// Standard form handling pattern
const useFormState = <T extends Record<string, any>>(initialData: T) => {
  const [formData, setFormData] = useState<T>(initialData);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const updateField = (field: keyof T, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const setFieldError = (field: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const clearErrors = () => setErrors({});

  return {
    formData,
    errors,
    updateField,
    setFieldError,
    clearErrors,
    hasErrors: Object.keys(errors).length > 0
  };
};

// Usage example
const SearchForm = () => {
  const { formData, errors, updateField, setFieldError } = useFormState({
    company: "",
    role: "",
    country: ""
  });

  return (
    <div>
      <Input
        value={formData.company}
        onChange={(e) => updateField('company', e.target.value)}
        placeholder="Company name"
      />
      {errors.company && (
        <p className="text-destructive text-sm mt-1">{errors.company}</p>
      )}
    </div>
  );
};
```

### URL State Management
```typescript
// Reading URL parameters
const useUrlParams = () => {
  const [searchParams] = useSearchParams();
  
  return {
    searchId: searchParams.get('searchId'),
    stageIds: searchParams.get('stages')?.split(',') || [],
    // Add more params as needed
  };
};

// Updating URL parameters
const useUrlNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const updateUrl = (params: Record<string, string | undefined>) => {
    const searchParams = new URLSearchParams(location.search);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        searchParams.set(key, value);
      } else {
        searchParams.delete(key);
      }
    });

    navigate(`${location.pathname}?${searchParams.toString()}`, { replace: true });
  };

  return { updateUrl };
};
```

### Polling Pattern
```typescript
// Reusable polling hook
const usePolling = (
  callback: () => Promise<void>,
  delay: number,
  condition: () => boolean
) => {
  useEffect(() => {
    if (!condition()) return;

    const interval = setInterval(callback, delay);
    return () => clearInterval(interval);
  }, [callback, delay, condition]);
};

// Usage for search status polling
const Dashboard = () => {
  const [searchData, setSearchData] = useState(null);
  
  const loadSearchData = useCallback(async () => {
    // Fetch search data
    const result = await searchService.getSearchResults(searchId);
    if (result.success) {
      setSearchData(result.data);
    }
  }, [searchId]);

  // Poll every 3 seconds while search is processing
  usePolling(
    loadSearchData,
    3000,
    () => searchData?.search_status === 'processing'
  );
};
```

## API Integration

### Service Function Pattern
```typescript
// src/services/searchService.ts
export const searchService = {
  async createSearch(params: CreateSearchParams): Promise<ServiceResponse<{ searchId: string }>> {
    try {
      // 1. Always check authentication first
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("Authentication required");
      }

      // 2. Validate input parameters
      if (!params.company?.trim()) {
        throw new Error("Company name is required");
      }

      // 3. Make the API call
      const { data, error } = await supabase
        .from("searches")
        .insert({
          user_id: user.id,
          company: params.company,
          role: params.role,
          country: params.country,
          role_links: params.roleLinks,
          search_status: "pending"
        })
        .select()
        .single();

      if (error) throw error;

      // 4. Process response
      return { 
        success: true, 
        data: { searchId: data.id } 
      };

    } catch (error) {
      console.error("Error creating search:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }
};
```

### API Call in Components
```typescript
// Component using service
const CreateSearchForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async (formData: SearchFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await searchService.createSearch(formData);
      
      if (result.success && result.data) {
        // Handle success
        navigate(`/dashboard?searchId=${result.data.searchId}`);
      } else {
        // Handle API error
        setError(result.error || "Failed to create search");
      }
    } catch (error) {
      // Handle unexpected errors
      console.error("Unexpected error:", error);
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };
};
```

### Edge Function Development
```typescript
// supabase/functions/example/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  // Define request structure
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Parse request body
    const body = await req.json() as RequestBody;
    
    // 2. Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Process request
    // ... your logic here

    // 4. Return success response
    return new Response(
      JSON.stringify({ success: true, data: result }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error) {
    console.error("Function error:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
```

## Error Handling

### Global Error Boundary
```typescript
// src/components/ErrorBoundary.tsx
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <Button onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

### Custom Error Types
```typescript
// src/utils/errors.ts
export class AuthenticationError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class ValidationError extends Error {
  constructor(field: string, message: string) {
    super(`${field}: ${message}`);
    this.name = "ValidationError";
  }
}

export class APIError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = "APIError";
  }
}

// Usage in services
if (!user) {
  throw new AuthenticationError();
}

if (!params.company) {
  throw new ValidationError("company", "Company name is required");
}
```

## 6. Error Handling

### 6.1 Comprehensive Error Patterns

#### Multi-State Error Management
```typescript
// Advanced error handling with contextual recovery
const [error, setError] = useState<string | null>(null);
const [isLoading, setIsLoading] = useState(false);

// Context-aware error states
const handleError = (error: any, context: string) => {
  console.error(`${context} error:`, error);
  
  // Contextual error messages
  const errorMessages = {
    authentication: "Please sign in to continue",
    network: "Network connection failed. Please check your internet connection.",
    processing: "Processing failed. The system is experiencing issues.",
    validation: "Please check your input and try again",
    notFound: "The requested resource was not found"
  };
  
  setError(errorMessages[context as keyof typeof errorMessages] || "An unexpected error occurred");
};
```

#### Graceful Degradation Pattern
```typescript
// Progressive fallback for failed operations
if (searchData?.search_status === 'failed') {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <CardTitle>Processing Failed</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Button onClick={retryFunction} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button variant="outline" onClick={() => navigate('/')} className="w-full">
            Start New Search
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### State-Specific Error Recovery
```typescript
// Different recovery options based on error context
const getErrorActions = (errorContext: string) => {
  switch (errorContext) {
    case 'authentication':
      return [
        { label: 'Sign In', action: () => navigate('/auth') }
      ];
    case 'search_processing':
      return [
        { label: 'View Progress', action: () => navigate(`/dashboard?searchId=${searchId}`) },
        { label: 'Start New Search', action: () => navigate('/') }
      ];
    case 'practice_session':
      return [
        { label: 'Back to Dashboard', action: () => navigate(`/dashboard?searchId=${searchId}`) },
        { label: 'Select Different Stages', action: () => setShowStageSelector(true) }
      ];
    default:
      return [
        { label: 'Retry', action: retryFunction }
      ];
  }
};
```

### 6.2 Advanced Loading States

#### Context-Aware Loading Patterns
```typescript
// Different loading states for different contexts
const getLoadingState = (context: string) => {
  const loadingStates = {
    search_creation: "Starting your interview research...",
    search_processing: "Analyzing company data and generating guidance...",
    cv_analysis: "Parsing your CV with AI...",
    practice_setup: "Setting up your personalized practice session...",
    answer_saving: "Saving your practice answer..."
  };
  
  return loadingStates[context as keyof typeof loadingStates] || "Loading...";
};
```

## 7. Advanced Workflows

### 7.1 CV Analysis Workflow

#### AI-Powered CV Processing
```typescript
// Complete CV analysis workflow
const analyzeCV = async (cvText: string) => {
  setIsAnalyzing(true);
  setError(null);
  
  try {
    // Call AI analysis edge function
    const result = await searchService.analyzeCV(cvText);
    
    if (result.success) {
      setParsedData(result.parsedData);
      
      // Save to database
      const saveResult = await searchService.saveResume({
        content: cvText,
        parsedData: result.parsedData
      });
      
      if (saveResult.success) {
        setSuccess("CV analyzed and saved successfully!");
      }
    } else {
      setError("Failed to analyze CV. Please try again.");
    }
  } catch (err) {
    setError("An unexpected error occurred during CV analysis");
  } finally {
    setIsAnalyzing(false);
  }
};
```

#### Intelligent Data Display
```typescript
// Progressive disclosure of parsed CV data
const renderParsedSection = (title: string, data: any, icon: React.ReactNode) => {
  if (!data || (Array.isArray(data) && data.length === 0)) return null;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Dynamic rendering based on data type */}
        {Array.isArray(data) ? (
          <div className="flex flex-wrap gap-2">
            {data.map((item, index) => (
              <Badge key={index} variant="secondary">{item}</Badge>
            ))}
          </div>
        ) : (
          <p>{data}</p>
        )}
      </CardContent>
    </Card>
  );
};
```

### 7.2 Practice Session Workflow

#### Dynamic Session Management
```typescript
// Complete practice session setup and management
const setupPracticeSession = async () => {
  setIsLoading(true);
  
  try {
    // Load search results and stages
    const result = await searchService.getSearchResults(searchId);
    
    if (result.success) {
      // Filter selected stages
      const selectedStages = result.stages.filter(stage => 
        urlStageIds.includes(stage.id)
      );
      
      // Aggregate and shuffle questions
      const allQuestions = selectedStages.flatMap(stage =>
        stage.questions.map(q => ({
          ...q,
          stage_id: stage.id,
          stage_name: stage.name,
          answered: false
        }))
      );
      
      const shuffledQuestions = allQuestions.sort(() => Math.random() - 0.5);
      setQuestions(shuffledQuestions);
      
      // Create practice session
      const sessionResult = await searchService.createPracticeSession(searchId);
      if (sessionResult.success) {
        setPracticeSession(sessionResult.session);
        setIsTimerRunning(true); // Start timer
      }
    }
  } catch (err) {
    handleError(err, 'practice_session');
  } finally {
    setIsLoading(false);
  }
};
```

#### Real-time Answer Tracking
```typescript
// Advanced answer persistence with state synchronization
const handleAnswerSave = async () => {
  if (!answer.trim() || !practiceSession) return;
  
  const questionId = currentQuestion.id;
  
  try {
    // Save answer with timing data
    const result = await searchService.savePracticeAnswer({
      sessionId: practiceSession.id,
      questionId,
      textAnswer: answer.trim(),
      answerTime: timeElapsed
    });
    
    if (result.success) {
      // Immediate UI feedback
      setQuestions(prev => prev.map(q => 
        q.id === questionId ? { ...q, answered: true } : q
      ));
      
      // Track saved answers for progress display
      setSavedAnswers(prev => new Map(prev).set(questionId, true));
      
      // Clear current answer and provide feedback
      setAnswer("");
      toast({
        title: "Answer Saved",
        description: "Your practice answer has been recorded.",
        duration: 2000,
      });
    }
  } catch (err) {
    handleError(err, 'answer_saving');
  }
};
```

## 8. Testing Patterns

### 8.1 Error Scenario Testing

#### Comprehensive Error Testing Checklist
```typescript
// Test different error scenarios
const errorTestScenarios = [
  {
    name: "Authentication Failure",
    setup: () => mockAuthFailure(),
    expectedBehavior: "Redirect to auth with error message"
  },
  {
    name: "Network Timeout",
    setup: () => mockNetworkTimeout(),
    expectedBehavior: "Show retry option with connection error"
  },
  {
    name: "Processing Failure",
    setup: () => mockProcessingFailure(),
    expectedBehavior: "Show processing failed state with new search option"
  },
  {
    name: "Invalid Search ID",
    setup: () => navigateToInvalidSearch(),
    expectedBehavior: "Show not found state with navigation options"
  }
];
```

### 8.2 Real-time Feature Testing

#### Polling and State Management Testing
```typescript
// Test polling behavior and cleanup
const testPollingScenario = async () => {
  // Start with pending search
  mockSearchStatus('pending');
  
  // Verify polling starts
  expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 3000);
  
  // Change status to completed
  mockSearchStatus('completed');
  
  // Verify polling stops
  expect(clearInterval).toHaveBeenCalled();
};
```

## Debugging Guide

### Common Issues and Solutions

#### Authentication Problems
```typescript
// Debug authentication state
console.log("Auth Debug:", {
  user: user?.id,
  session: !!session,
  loading,
  email: user?.email
});

// Check RLS policies in Supabase dashboard
// Authentication > Policies
```

#### Database Query Issues
```typescript
// Debug Supabase queries
const { data, error } = await supabase
  .from("searches")
  .select("*")
  .eq("user_id", user.id);

console.log("Query result:", { data, error });

// Check SQL logs in Supabase dashboard
// Logs > SQL
```

#### State Management Issues
```typescript
// Debug React state
useEffect(() => {
  console.log("State changed:", {
    isLoading,
    error,
    searchData,
    questions: questions.length
  });
}, [isLoading, error, searchData, questions]);
```

#### API Integration Issues
```typescript
// Debug API calls
const result = await searchService.createSearch(params);
console.log("API call result:", {
  success: result.success,
  error: result.error,
  data: result.data
});

// Check Edge Function logs in Supabase dashboard
// Edge Functions > [function-name] > Logs
```

### Browser Developer Tools

#### React Developer Tools
- Install React DevTools browser extension
- Use Components tab to inspect React component tree
- Use Profiler tab to identify performance issues

#### Network Tab Debugging
```typescript
// Look for these patterns in Network tab:
// 1. Failed authentication: 401 responses
// 2. RLS policy violations: 403 responses
// 3. Malformed requests: 400 responses
// 4. Server errors: 500 responses
```

## Common Tasks

### Adding a New Page
1. Create page component in `src/pages/`
2. Add route to `src/App.tsx`
3. Add navigation link in `src/components/Navigation.tsx`
4. Update URL state management if needed

### Adding a New API Endpoint
1. Create Edge Function in `supabase/functions/`
2. Add service method in `src/services/`
3. Add TypeScript types for request/response
4. Test with error handling

### Adding a New UI Component
1. Create component in `src/components/`
2. Follow naming conventions
3. Add proper TypeScript interfaces
4. Include loading and error states

### Database Schema Changes
1. Create migration in `supabase/migrations/`
2. Update TypeScript types: `npx supabase gen types typescript`
3. Update service methods
4. Test RLS policies

## Performance Tips

### React Performance
```typescript
// Use React.memo for expensive components
const ExpensiveComponent = React.memo(({ data }) => {
  return <div>{/* Complex rendering */}</div>;
});

// Use useCallback for event handlers
const handleClick = useCallback(() => {
  // Handler logic
}, [dependency]);

// Use useMemo for expensive calculations
const expensiveValue = useMemo(() => {
  return calculateExpensiveValue(data);
}, [data]);
```

### Database Performance
```sql
-- Add indexes for common queries
CREATE INDEX idx_searches_user_status ON searches(user_id, search_status);
CREATE INDEX idx_practice_answers_session_created ON practice_answers(session_id, created_at);
```

### Bundle Size Optimization
```typescript
// Import only what you need from large libraries
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
// Instead of: import { formatDistanceToNow } from "date-fns";

// Use dynamic imports for large components
const HeavyComponent = lazy(() => import("./HeavyComponent"));
```

### API Performance
```typescript
// Batch database operations
const batchInsert = async (records: any[]) => {
  const { data, error } = await supabase
    .from("table")
    .insert(records); // Insert multiple records at once
  
  return { data, error };
};

// Use select to limit returned data
const { data } = await supabase
  .from("searches")
  .select("id, company, created_at") // Only select needed fields
  .eq("user_id", userId);
```

---

This development guide should be your go-to reference for daily development tasks. Update it as new patterns emerge or when adding new features. 
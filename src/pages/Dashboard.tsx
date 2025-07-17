import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Building2, 
  Clock, 
  Users, 
  Target, 
  PlayCircle, 
  CheckCircle2,
  ArrowRight,
  Brain,
  AlertCircle,
  RefreshCw,
  Search,
  History
} from "lucide-react";
import { searchService } from "@/services/searchService";

interface InterviewQuestion {
  id: string;
  question: string;
  created_at: string;
}

interface InterviewStage {
  id: string;
  name: string;
  duration: string | null;
  interviewer: string | null;
  content: string | null;
  guidance: string | null;
  order_index: number;
  search_id: string;
  created_at: string;
  questions: InterviewQuestion[];
  selected: boolean;
}

interface SearchData {
  id: string;
  company: string;
  role: string | null;
  country: string | null;
  search_status: string;
  created_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchId = searchParams.get('searchId');
  
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stages, setStages] = useState<InterviewStage[]>([]);
  const [searchData, setSearchData] = useState<SearchData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Load search data and poll for updates
  const loadSearchData = async () => {
    if (!searchId) return;

    setIsLoading(true);
    try {
      const result = await searchService.getSearchResults(searchId);
      
      if (result.success && result.search && result.stages) {
        setSearchData(result.search);
        
        // Transform stages data and add selection state
        const transformedStages = result.stages
          .sort((a, b) => a.order_index - b.order_index)
          .map(stage => ({
            ...stage,
            selected: true // Default to selected
          }));
        
        setStages(transformedStages);
        
        // If search is completed, stop loading
        if (result.search.search_status === 'completed') {
          setIsLoading(false);
          setProgress(100);
        } else if (result.search.search_status === 'failed') {
          setError("Search processing failed. Please try again.");
          setIsLoading(false);
        }
        // If still processing, continue polling
      } else {
        setError(result.error?.message || "Failed to load search data");
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Error loading search data:", err);
      setError("An unexpected error occurred while loading data");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!searchId) {
      // No search ID provided - show default dashboard state
      setIsLoading(false);
      return;
    }

    // Initial load
    loadSearchData();

    // Set up polling for pending/processing searches
    const poll = setInterval(async () => {
      if (searchData?.search_status === 'pending' || searchData?.search_status === 'processing') {
        await loadSearchData();
        setProgress(prev => Math.min(prev + 5, 95)); // Increment progress while polling
      }
    }, 3000); // Poll every 3 seconds

    setPollingInterval(poll);

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
      clearInterval(poll);
    };
  }, [searchId]);

  // Progress simulation for pending/processing states
  useEffect(() => {
    if (searchData?.search_status === 'pending' || searchData?.search_status === 'processing') {
      const timer = setInterval(() => {
        setProgress(prev => Math.min(prev + 1, 95));
      }, 500);

      return () => clearInterval(timer);
    }
  }, [searchData?.search_status]);

  const handleStageToggle = (stageId: string) => {
    setStages(prev => 
      prev.map(stage => 
        stage.id === stageId 
          ? { ...stage, selected: !stage.selected }
          : stage
      )
    );
  };

  const getSelectedQuestions = () => {
    return stages
      .filter(stage => stage.selected)
      .reduce((acc, stage) => acc + (stage.questions?.length || 0), 0);
  };

  const startPractice = () => {
    const selectedStages = stages.filter(stage => stage.selected);
    if (selectedStages.length > 0 && searchId) {
      // Pass selected stage IDs to practice page
      const selectedStageIds = selectedStages.map(stage => stage.id);
      navigate(`/practice?searchId=${searchId}&stages=${selectedStageIds.join(',')}`);
    }
  };

  // Show default empty state when no search ID is provided
  if (!searchId) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation showHistory={false} />
        <div className="container mx-auto px-4 py-8">

          <div className="max-w-2xl mx-auto text-center">
            <Card className="p-8">
              <CardHeader>
                <div className="flex items-center justify-center mb-4">
                  <Brain className="h-12 w-12 text-primary" />
                </div>
                <CardTitle>No Active Search</CardTitle>
                <CardDescription>
                  Start a new search to get personalized interview intel for any company
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button 
                    onClick={() => navigate('/')}
                    size="lg"
                    className="w-full"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Start New Search
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {/* TODO: Show history */}}
                    className="w-full"
                  >
                    <History className="h-4 w-4 mr-2" />
                    View Search History
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation showHistory={false} />
        <div className="container mx-auto px-4 py-8">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <CardTitle>Error Loading Interview Intel</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
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
              <Button 
                variant="outline" 
                onClick={() => navigate('/')}
                className="w-full mt-2"
              >
                Start New Search
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading) {
    const statusMessages = {
      pending: "Initializing research...",
      processing: "Analyzing company data and generating personalized guidance...",
      completed: "Research complete!"
    };
    
    const currentStatus = searchData?.search_status || 'pending';
    
    return (
      <div className="min-h-screen bg-background">
        <Navigation showHistory={false} />
        <div className="container mx-auto px-4 py-8">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <Brain className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Researching Interview Intel</CardTitle>
              <CardDescription>
                {searchData?.company && `for ${searchData.company}`}
                {searchData?.role && ` - ${searchData.role}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={progress} className="mb-4" />
              <p className="text-sm text-muted-foreground text-center">
                {statusMessages[currentStatus as keyof typeof statusMessages] || statusMessages.pending}
              </p>
              <p className="text-xs text-muted-foreground text-center mt-2">
                {progress}% complete
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation showHistory={false} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">
                {searchData?.company || 'Company'} Interview Intel
              </h1>
              <p className="text-muted-foreground">
                {searchData?.role && `${searchData.role}`}
                {searchData?.role && searchData?.country && ' • '}
                {searchData?.country}
                {!searchData?.role && !searchData?.country && 'Interview Preparation'}
              </p>
            </div>
            <Button onClick={startPractice} disabled={getSelectedQuestions() === 0}>
              <PlayCircle className="h-4 w-4 mr-2" />
              Start Practice ({getSelectedQuestions()} questions)
            </Button>
          </div>
        </div>

        {/* Interview Process Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Interview Process Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Total Duration</p>
                  <p className="text-sm text-muted-foreground">3-4 weeks</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Interview Stages</p>
                  <p className="text-sm text-muted-foreground">{stages.length} rounds</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Focus Areas</p>
                  <p className="text-sm text-muted-foreground">Technical + Behavioral</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preparation Table */}
        <Card>
          <CardHeader>
            <CardTitle>Preparation Roadmap</CardTitle>
            <CardDescription>
              Select the stages you want to practice. Questions are personalized based on your CV.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {stages.map((stage, index) => (
                <div key={stage.id} className="border rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={stage.selected}
                      onCheckedChange={() => handleStageToggle(stage.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge variant="outline" className="text-xs">
                          Stage {index + 1}
                        </Badge>
                        <h3 className="font-semibold">{stage.name}</h3>
                        <span className="text-sm text-muted-foreground">
                          {stage.duration || "Duration TBD"} • {stage.interviewer || "Interviewer TBD"}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Content</h4>
                          <p className="text-sm text-muted-foreground">
                            {stage.content || "Interview content details"}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-2">Targeted Guidance</h4>
                          <p className="text-sm text-muted-foreground">
                            {stage.guidance || "Preparation guidance will be provided"}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-2">
                            Likely Questions ({stage.questions?.length || 0})
                          </h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {stage.questions?.slice(0, 2).map((questionObj, qIndex) => (
                              <li key={qIndex} className="flex items-start gap-2">
                                <ArrowRight className="h-3 w-3 mt-1 text-primary flex-shrink-0" />
                                {questionObj.question}
                              </li>
                            ))}
                            {(stage.questions?.length || 0) > 2 && (
                              <li className="text-xs text-muted-foreground">
                                +{(stage.questions?.length || 0) - 2} more questions
                              </li>
                            )}
                            {(!stage.questions || stage.questions.length === 0) && (
                              <li className="text-xs text-muted-foreground italic">
                                Questions will be generated during research
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
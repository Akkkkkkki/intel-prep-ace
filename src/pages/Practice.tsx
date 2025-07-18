import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Mic, 
  MicOff, 
  Timer,
  CheckCircle,
  SkipForward,
  AlertCircle,
  Loader2,
  Brain,
  Play,
  Settings
} from "lucide-react";
import { searchService } from "@/services/searchService";
import { useAuth } from "@/hooks/useAuth";

interface Question {
  id: string;
  stage_id: string;
  stage_name: string;
  question: string;
  answered: boolean;
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
  questions: {
    id: string;
    question: string;
    created_at: string;
  }[];
  selected: boolean;
}

interface PracticeSession {
  id: string;
  search_id: string;
  user_id: string;
  started_at: string;
  completed_at: string | null;
}

const Practice = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchId = searchParams.get('searchId');
  const urlStageIds = searchParams.get('stages')?.split(',') || [];
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [allStages, setAllStages] = useState<InterviewStage[]>([]);
  const [searchData, setSearchData] = useState<{ search_status: string; company?: string; role?: string } | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [practiceSession, setPracticeSession] = useState<PracticeSession | null>(null);
  const [savedAnswers, setSavedAnswers] = useState<Map<string, boolean>>(new Map());
  const [showStageSelector, setShowStageSelector] = useState(false);

  // Load search data and set up stages
  useEffect(() => {
    const loadSearchData = async () => {
      if (!searchId) return;

      setIsLoading(true);
      setError(null);

      try {
        const result = await searchService.getSearchResults(searchId);
        
        if (result.success && result.search) {
          setSearchData(result.search);
          
          // Check if search is still processing
          if (result.search.search_status === 'pending' || result.search.search_status === 'processing') {
            setError(null); // Clear any previous errors
            return; // Don't process stages yet, show processing state
          }
          
          if (result.search.search_status === 'failed') {
            setError("Research processing failed. Please try starting a new search.");
            return;
          }
          
          // Only process stages if search is completed
          if (result.search.search_status === 'completed' && result.stages) {
            // Transform stages data and add selection state
            const transformedStages = result.stages
              .sort((a, b) => a.order_index - b.order_index)
              .map(stage => ({
                ...stage,
                selected: urlStageIds.length > 0 ? urlStageIds.includes(stage.id) : true // Default to all selected if no URL stages
              }));
            
            setAllStages(transformedStages);
            
            // Update URL if no stages were specified (select all by default)
            if (urlStageIds.length === 0) {
              const allStageIds = transformedStages.map(stage => stage.id);
              setSearchParams({ searchId, stages: allStageIds.join(',') });
            }
          }
        } else {
          setError(result.error?.message || "Failed to load search data");
        }
      } catch (err) {
        console.error("Error loading search data:", err);
        setError("An unexpected error occurred while loading search data");
      } finally {
        setIsLoading(false);
      }
    };

    loadSearchData();
  }, [searchId]);

  // Load practice session when stages are selected
  useEffect(() => {
    const loadPracticeSession = async () => {
      if (!searchId) return;

      const selectedStages = allStages.filter(stage => stage.selected);
      if (selectedStages.length === 0) {
        setQuestions([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const allQuestions: Question[] = [];
        selectedStages.forEach(stage => {
          stage.questions?.forEach(questionObj => {
            allQuestions.push({
              id: questionObj.id,
              stage_id: stage.id,
              stage_name: stage.name,
              question: questionObj.question,
              answered: false
            });
          });
        });

        // Shuffle questions for varied practice
        const shuffledQuestions = [...allQuestions].sort(() => Math.random() - 0.5);
        setQuestions(shuffledQuestions);

        // Create practice session if questions exist
        if (shuffledQuestions.length > 0) {
          const sessionResult = await searchService.createPracticeSession(searchId);
          
          if (sessionResult.success && sessionResult.session) {
            setPracticeSession(sessionResult.session);
          }
        }
      } catch (err) {
        console.error("Error loading practice session:", err);
        setError("An unexpected error occurred while loading practice questions");
      } finally {
        setIsLoading(false);
      }
    };

    if (allStages.length > 0) {
      loadPracticeSession();
    }
  }, [allStages, searchId]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Start timer when first question loads
  useEffect(() => {
    if (questions.length > 0 && !isTimerRunning) {
      setIsTimerRunning(true);
    }
  }, [questions.length]);

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

  const handleSaveAnswer = async () => {
    if (!answer.trim() || !practiceSession) return;

    const questionId = currentQuestion.id;
    
    try {
      const result = await searchService.savePracticeAnswer({
        sessionId: practiceSession.id,
        questionId: questionId,
        textAnswer: answer.trim(),
        answerTime: timeElapsed
      });

      if (result.success) {
        // Mark question as answered
        setQuestions(prev => 
          prev.map(q => 
            q.id === questionId ? { ...q, answered: true } : q
          )
        );
        setSavedAnswers(prev => new Map(prev).set(questionId, true));
        setAnswer("");
      } else {
        console.error("Failed to save answer:", result.error?.message);
      }
    } catch (err) {
      console.error("Error saving answer:", err);
    }
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setAnswer("");
    }
  };

  const previousQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setAnswer("");
    }
  };

  const skipQuestion = () => {
    setAnswer("");
    nextQuestion();
  };

  const resetTimer = () => {
    setTimeElapsed(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const answeredCount = questions.filter(q => q.answered).length;
  const selectedStagesCount = allStages.filter(stage => stage.selected).length;

  // Show default state when no search ID provided
  if (!searchId) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <Card className="p-8">
              <CardHeader>
                <div className="flex items-center justify-center mb-4">
                  <Play className="h-12 w-12 text-primary" />
                </div>
                <CardTitle>No Search Selected</CardTitle>
                <CardDescription>
                  Select a search to start practicing interview questions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button 
                    onClick={() => navigate('/dashboard')}
                    size="lg"
                    className="w-full"
                  >
                    Go to Dashboard
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
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card className="w-full max-w-md mx-auto text-center">
            <CardHeader>
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <CardTitle>Loading Practice Session</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Setting up your personalized interview practice...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show processing state when research is still being processed
  if (searchData && (searchData.search_status === 'pending' || searchData.search_status === 'processing')) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card className="w-full max-w-md mx-auto text-center">
            <CardHeader>
              <Brain className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Research In Progress</CardTitle>
              <CardDescription>
                {searchData.company && `for ${searchData.company}`}
                {searchData.role && ` - ${searchData.role}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Your interview research is still being processed. Practice mode will be available once the research is complete.
                </p>
                <div className="space-y-2">
                  <Button 
                    onClick={() => navigate(`/dashboard?searchId=${searchId}`)}
                    className="w-full"
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    View Research Progress
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/')}
                    className="w-full"
                  >
                    Start New Search
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
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

  // Show stage selector when no stages are selected or no questions available
  if (allStages.length > 0 && questions.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Select Interview Stages to Practice
                </CardTitle>
                <CardDescription>
                  Choose which interview rounds you want to practice. You can change this selection anytime.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {allStages.map((stage, index) => (
                    <div key={stage.id} className="border rounded-lg p-4">
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={stage.selected}
                          onCheckedChange={() => handleStageToggle(stage.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline" className="text-xs">
                              Stage {index + 1}
                            </Badge>
                            <h3 className="font-semibold">{stage.name}</h3>
                            <span className="text-sm text-muted-foreground">
                              {stage.questions?.length || 0} questions
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {stage.content || "Interview stage content"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    {selectedStagesCount} stage{selectedStagesCount !== 1 ? 's' : ''} selected • {allStages.filter(stage => stage.selected).reduce((acc, stage) => acc + (stage.questions?.length || 0), 0)} total questions
                  </p>
                  {selectedStagesCount === 0 ? (
                    <p className="text-sm text-amber-600">Please select at least one stage to start practicing</p>
                  ) : (
                    <Button onClick={() => window.location.reload()}>
                      Start Practice Session
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <div className="text-center">
              <Button variant="outline" onClick={() => navigate(`/dashboard?searchId=${searchId}`)}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card className="w-full max-w-md mx-auto text-center">
            <CardHeader>
              <CardTitle>No Questions Available</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                No questions found for the selected stages. Please go back and select different stages.
              </p>
              <Button onClick={() => navigate(`/dashboard${searchId ? `?searchId=${searchId}` : ''}`)}>
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={() => navigate(`/dashboard${searchId ? `?searchId=${searchId}` : ''}`)}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Question {currentIndex + 1} of {questions.length}
            </p>
            <p className="text-xs text-muted-foreground">
              {answeredCount} answered
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowStageSelector(!showStageSelector)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Stages
            </Button>
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-mono">{formatTime(timeElapsed)}</span>
            </div>
          </div>
        </div>

        {/* Stage Selector Panel */}
        {showStageSelector && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Interview Stages</CardTitle>
              <CardDescription>
                Select which stages you want to practice
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allStages.map((stage, index) => (
                  <div key={stage.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      checked={stage.selected}
                      onCheckedChange={() => handleStageToggle(stage.id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Stage {index + 1}
                        </Badge>
                        <span className="font-medium">{stage.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {stage.questions?.length || 0} questions
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {selectedStagesCount} stage{selectedStagesCount !== 1 ? 's' : ''} selected • {allStages.filter(stage => stage.selected).reduce((acc, stage) => acc + (stage.questions?.length || 0), 0)} total questions
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress */}
        <Progress value={progress} className="mb-8" />

        {/* Question Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                {currentQuestion.stage_name}
              </Badge>
              {currentQuestion.answered && (
                <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Answered
                </Badge>
              )}
            </div>
            <CardTitle className="text-xl leading-relaxed">
              {currentQuestion.question}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="min-h-[120px] mb-4"
            />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRecording(!isRecording)}
                  className={isRecording ? "bg-red-50 border-red-200" : ""}
                >
                  {isRecording ? (
                    <>
                      <MicOff className="h-4 w-4 mr-2 text-red-600" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 mr-2" />
                      Record Answer
                    </>
                  )}
                </Button>
                <Button variant="outline" size="sm" onClick={resetTimer}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Timer
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={skipQuestion}
                  disabled={currentIndex >= questions.length - 1}
                >
                  <SkipForward className="h-4 w-4 mr-2" />
                  Skip
                </Button>
                <Button
                  onClick={handleSaveAnswer}
                  disabled={!answer.trim()}
                >
                  Save Answer
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={previousQuestion}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} of {questions.length}
          </span>
          
          <Button
            onClick={nextQuestion}
            disabled={currentIndex >= questions.length - 1}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Practice;
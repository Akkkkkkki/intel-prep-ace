import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Loader2
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
  const [searchParams] = useSearchParams();
  const searchId = searchParams.get('searchId');
  const stageIds = searchParams.get('stages')?.split(',') || [];
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [practiceSession, setPracticeSession] = useState<PracticeSession | null>(null);
  const [savedAnswers, setSavedAnswers] = useState<Map<string, boolean>>(new Map());

  // Load practice session and questions
  useEffect(() => {
    const initializePractice = async () => {
      if (!searchId || !user) {
        setError("Missing search ID or user authentication");
        setIsLoading(false);
        return;
      }

      if (stageIds.length === 0) {
        setError("No stages selected for practice");
        setIsLoading(false);
        return;
      }

      try {
        // 1. Load search results to get questions
        const searchResult = await searchService.getSearchResults(searchId);
        
        if (!searchResult.success || !searchResult.stages) {
          setError("Failed to load interview questions");
          setIsLoading(false);
          return;
        }

        // 2. Filter questions by selected stages
        const selectedStages = searchResult.stages.filter(stage => 
          stageIds.includes(stage.id)
        );

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

        if (allQuestions.length === 0) {
          setError("No questions found for selected stages");
          setIsLoading(false);
          return;
        }

        // 3. Shuffle questions for varied practice
        const shuffledQuestions = [...allQuestions].sort(() => Math.random() - 0.5);
        setQuestions(shuffledQuestions);

        // 4. Create practice session
        const sessionResult = await searchService.createPracticeSession(searchId);
        
        if (sessionResult.success && sessionResult.session) {
          setPracticeSession(sessionResult.session);
        } else {
          console.warn("Failed to create practice session, continuing without session tracking");
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Error initializing practice:", err);
        setError("Failed to initialize practice session");
        setIsLoading(false);
      }
    };

    initializePractice();
  }, [searchId, user, stageIds]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const answeredCount = questions.filter(q => q.answered).length;

  const nextQuestion = async () => {
    if (currentIndex < questions.length - 1) {
      await markAsAnswered();
      setCurrentIndex(prev => prev + 1);
      setAnswer("");
      resetTimer();
    }
  };

  const prevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setAnswer("");
      resetTimer();
    }
  };

  const markAsAnswered = async () => {
    if (!practiceSession || !currentQuestion) return;

    // Mark as answered locally first
    setQuestions(prev => 
      prev.map((q, index) => 
        index === currentIndex ? { ...q, answered: true } : q
      )
    );

    // Save answer to backend if there's content
    if (answer.trim() || isRecording) {
      try {
        const result = await searchService.savePracticeAnswer({
          sessionId: practiceSession.id,
          questionId: currentQuestion.id,
          textAnswer: answer.trim() || undefined,
          answerTime: timeElapsed
        });

        if (result.success) {
          setSavedAnswers(prev => new Map(prev).set(currentQuestion.id, true));
        } else {
          console.error("Failed to save answer:", result.error);
        }
      } catch (err) {
        console.error("Error saving answer:", err);
      }
    }
  };

  const skipQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setAnswer("");
      resetTimer();
    }
  };

  const resetTimer = () => {
    setTimeElapsed(0);
    setIsTimerRunning(false);
  };

  const startTimer = () => {
    setIsTimerRunning(true);
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording && !isTimerRunning) {
      startTimer();
    }
  };

  const handleAnswerChange = (value: string) => {
    setAnswer(value);
    if (value.trim() && !isTimerRunning) {
      startTimer();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
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
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
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
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
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
            <Timer className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-mono">{formatTime(timeElapsed)}</span>
          </div>
        </div>

        {/* Progress */}
        <Progress value={progress} className="mb-8" />

        {/* Question Card */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{currentQuestion.stage_name}</Badge>
              <div className="flex items-center gap-2">
                {savedAnswers.get(currentQuestion.id) && (
                  <Badge variant="outline" className="text-xs text-green-600">
                    Saved
                  </Badge>
                )}
                {currentQuestion.answered && (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
              </div>
            </div>
            <CardTitle className="text-xl leading-relaxed">
              {currentQuestion.question}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Recording Controls */}
            <div className="flex items-center gap-4">
              <Button
                variant={isRecording ? "destructive" : "outline"}
                size="sm"
                onClick={toggleRecording}
              >
                {isRecording ? (
                  <>
                    <MicOff className="h-4 w-4 mr-2" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-2" />
                    Voice Answer
                  </>
                )}
              </Button>
              <span className="text-sm text-muted-foreground">
                {isRecording ? "Recording..." : "Or type your answer below"}
              </span>
            </div>

            {/* Answer Input */}
            <div className="space-y-2">
              <Textarea
                placeholder="Type your answer here... (or use voice recording above)"
                value={answer}
                onChange={(e) => handleAnswerChange(e.target.value)}
                rows={8}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Tip: Explain your thinking process and be specific with examples
              </p>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                onClick={prevQuestion}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={skipQuestion}
                  disabled={currentIndex === questions.length - 1}
                >
                  <SkipForward className="h-4 w-4 mr-2" />
                  Skip
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetTimer}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Timer
                </Button>
              </div>

              <Button
                onClick={nextQuestion}
                disabled={currentIndex === questions.length - 1}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Question Overview */}
        <div className="max-w-4xl mx-auto mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Practice Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                {questions.map((q, index) => (
                  <Button
                    key={q.id}
                    variant={index === currentIndex ? "default" : q.answered ? "secondary" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => {
                      setCurrentIndex(index);
                      setAnswer("");
                      resetTimer();
                    }}
                  >
                    {index + 1}
                    {q.answered && <CheckCircle className="h-3 w-3 ml-1" />}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Practice;
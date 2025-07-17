import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Mic, 
  MicOff, 
  Timer,
  CheckCircle,
  SkipForward
} from "lucide-react";

interface Question {
  id: string;
  stage: string;
  question: string;
  answered: boolean;
}

const Practice = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Mock questions data
  useEffect(() => {
    const mockQuestions: Question[] = [
      {
        id: "1",
        stage: "Phone Screening",
        question: "Why do you want to work at Google?",
        answered: false
      },
      {
        id: "2", 
        stage: "Phone Screening",
        question: "Tell me about yourself",
        answered: false
      },
      {
        id: "3",
        stage: "Technical Phone Screen", 
        question: "Implement a function to reverse a linked list",
        answered: false
      },
      {
        id: "4",
        stage: "Technical Phone Screen",
        question: "Find the intersection of two arrays",
        answered: false
      },
      {
        id: "5",
        stage: "Virtual Onsite - Coding",
        question: "Design a URL shortener service",
        answered: false
      },
      {
        id: "6",
        stage: "Behavioral Interview",
        question: "Describe a time you had to work with a difficult team member",
        answered: false
      }
    ];
    
    // Shuffle questions
    const shuffled = [...mockQuestions].sort(() => Math.random() - 0.5);
    setQuestions(shuffled);
  }, []);

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

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      markAsAnswered();
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

  const markAsAnswered = () => {
    setQuestions(prev => 
      prev.map((q, index) => 
        index === currentIndex ? { ...q, answered: true } : q
      )
    );
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

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>No Questions Selected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Please go back to the dashboard and select some questions to practice.
            </p>
            <Button onClick={() => navigate("/dashboard")}>
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
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
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
              <Badge variant="secondary">{currentQuestion.stage}</Badge>
              {currentQuestion.answered && (
                <CheckCircle className="h-5 w-5 text-success" />
              )}
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
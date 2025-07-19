import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Timer,
  CheckCircle,
  SkipForward,
  AlertCircle,
  Loader2,
  Brain,
  Play,
  Settings,
  Save,
  Mic,
  MicOff,
  Square,
  Filter,
  Shuffle
} from "lucide-react";
import { searchService } from "@/services/searchService";
import { useAuth } from "@/hooks/useAuth";

interface EnhancedQuestion {
  question: string;
  type: string;
  difficulty: string;
  rationale: string;
  suggested_answer_approach: string;
  evaluation_criteria: string[];
  follow_up_questions: string[];
  star_story_fit: boolean;
  company_context: string;
}

interface Question {
  id: string;
  stage_id: string;
  stage_name: string;
  question: string;
  answered: boolean;
  // Enhanced question properties
  type?: string;
  difficulty?: string;
  rationale?: string;
  suggested_answer_approach?: string;
  evaluation_criteria?: string[];
  follow_up_questions?: string[];
  star_story_fit?: boolean;
  company_context?: string;
  category?: string;
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

interface EnhancedQuestionBank {
  id: string;
  search_id: string;
  user_id: string;
  interview_stage: string;
  behavioral_questions: EnhancedQuestion[];
  technical_questions: EnhancedQuestion[];
  situational_questions: EnhancedQuestion[];
  company_specific_questions: EnhancedQuestion[];
  role_specific_questions: EnhancedQuestion[];
  experience_based_questions: EnhancedQuestion[];
  cultural_fit_questions: EnhancedQuestion[];
  total_questions: number;
  generation_context: any;
}

interface PracticeSession {
  id: string;
  user_id: string;
  search_id: string;
  started_at: string;
  completed_at?: string;
}

const Practice = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchId = searchParams.get('searchId');
  const urlStageIds = searchParams.get('stages')?.split(',') || [];
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [allStages, setAllStages] = useState<InterviewStage[]>([]);
  const [enhancedQuestionBanks, setEnhancedQuestionBanks] = useState<EnhancedQuestionBank[]>([]);
  const [searchData, setSearchData] = useState<{ search_status: string; company?: string; role?: string } | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string>>(new Map());
  const [questionTimers, setQuestionTimers] = useState<Map<string, number>>(new Map());
  const [currentQuestionStartTime, setCurrentQuestionStartTime] = useState<number>(Date.now());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [practiceSession, setPracticeSession] = useState<PracticeSession | null>(null);
  const [savedAnswers, setSavedAnswers] = useState<Map<string, boolean>>(new Map());
  const [showStageSelector, setShowStageSelector] = useState(false);
  
  // Enhanced question filtering
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['all']);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  
  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [hasRecording, setHasRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const questionCategories = [
    { value: 'all', label: 'All Categories' },
    { value: 'behavioral', label: 'Behavioral' },
    { value: 'technical', label: 'Technical' },
    { value: 'situational', label: 'Situational' },
    { value: 'company_specific', label: 'Company Specific' },
    { value: 'role_specific', label: 'Role Specific' },
    { value: 'experience_based', label: 'Experience Based' },
    { value: 'cultural_fit', label: 'Cultural Fit' }
  ];

  const difficultyLevels = [
    { value: 'all', label: 'All Levels' },
    { value: 'Easy', label: 'Easy' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Hard', label: 'Hard' }
  ];

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
            
            // Load enhanced question banks
            if (result.enhancedQuestions && result.enhancedQuestions.length > 0) {
              setEnhancedQuestionBanks(result.enhancedQuestions as unknown as EnhancedQuestionBank[]);
            }
            
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
        
        // First, try to load from enhanced question banks if available
        if (enhancedQuestionBanks.length > 0) {
          selectedStages.forEach(stage => {
            const enhancedBank = enhancedQuestionBanks.find(bank => 
              bank.interview_stage === stage.name
            );
            
            if (enhancedBank) {
              // Process all question categories
              const questionCategories = [
                { key: 'behavioral_questions', category: 'behavioral' },
                { key: 'technical_questions', category: 'technical' },
                { key: 'situational_questions', category: 'situational' },
                { key: 'company_specific_questions', category: 'company_specific' },
                { key: 'role_specific_questions', category: 'role_specific' },
                { key: 'experience_based_questions', category: 'experience_based' },
                { key: 'cultural_fit_questions', category: 'cultural_fit' }
              ];
              
              questionCategories.forEach(({ key, category }) => {
                const questions = enhancedBank[key as keyof EnhancedQuestionBank] as EnhancedQuestion[];
                if (Array.isArray(questions)) {
                  questions.forEach((enhancedQ, index) => {
                    allQuestions.push({
                      id: `${enhancedBank.id}-${category}-${index}`,
                      stage_id: stage.id,
                      stage_name: stage.name,
                      question: enhancedQ.question,
                      answered: false,
                      type: enhancedQ.type,
                      difficulty: enhancedQ.difficulty,
                      rationale: enhancedQ.rationale,
                      suggested_answer_approach: enhancedQ.suggested_answer_approach,
                      evaluation_criteria: enhancedQ.evaluation_criteria,
                      follow_up_questions: enhancedQ.follow_up_questions,
                      star_story_fit: enhancedQ.star_story_fit,
                      company_context: enhancedQ.company_context,
                      category
                    });
                  });
                }
              });
            }
          });
        }
        
        // Fallback to basic questions if no enhanced questions available
        if (allQuestions.length === 0) {
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
        }

        // Apply filters and sorting
        let filteredQuestions = allQuestions;
        
        // Filter by categories
        if (selectedCategories.length > 0 && !selectedCategories.includes('all')) {
          filteredQuestions = filteredQuestions.filter(q => 
            q.category && selectedCategories.includes(q.category)
          );
        }
        
        // Filter by difficulty
        if (selectedDifficulty !== 'all') {
          filteredQuestions = filteredQuestions.filter(q => 
            q.difficulty === selectedDifficulty
          );
        }
        
        // Sort questions by stage order for consistent experience
        const sortedQuestions = filteredQuestions.sort((a, b) => {
          const stageA = selectedStages.find(s => s.id === a.stage_id);
          const stageB = selectedStages.find(s => s.id === b.stage_id);
          return (stageA?.order_index || 0) - (stageB?.order_index || 0);
        });
        
        // Shuffle if requested
        const finalQuestions = shuffleQuestions 
          ? sortedQuestions.sort(() => Math.random() - 0.5)
          : sortedQuestions;
        
        setQuestions(finalQuestions);

        // Create practice session if questions exist
        if (finalQuestions.length > 0) {
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
  }, [allStages, enhancedQuestionBanks, selectedCategories, selectedDifficulty, shuffleQuestions, searchId]);

  // Reset timer when question changes
  useEffect(() => {
    setCurrentQuestionStartTime(Date.now());
    // Reset recording state when changing questions
    setIsRecording(false);
    setRecordingTime(0);
    setAudioBlob(null);
    setHasRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, [currentIndex]);

  // Recording timer
  useEffect(() => {
    if (isRecording && recordingIntervalRef.current === null) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else if (!isRecording && recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    };
  }, [isRecording]);

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

  const getCurrentQuestionTime = () => {
    return Math.floor((Date.now() - currentQuestionStartTime) / 1000);
  };

  const handleAnswerChange = (value: string) => {
    const newAnswers = new Map(answers);
    newAnswers.set(currentQuestion.id, value);
    setAnswers(newAnswers);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const audioChunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        setHasRecording(true);
        
        // Clean up stream
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playRecording = () => {
    if (audioBlob) {
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audio.play();
    }
  };

  const clearRecording = () => {
    setAudioBlob(null);
    setHasRecording(false);
    setRecordingTime(0);
  };

  const handleSaveAnswer = async () => {
    const currentAnswer = answers.get(currentQuestion.id) || "";
    if (!currentAnswer.trim() && !hasRecording || !practiceSession) return;

    setIsSaving(true);
    const questionId = currentQuestion.id;
    const timeSpent = getCurrentQuestionTime();
    
    try {
      // For now, we'll save the text answer and recording status
      // In a full implementation, you'd upload the audio file
      const result = await searchService.savePracticeAnswer({
        sessionId: practiceSession.id,
        questionId: questionId,
        textAnswer: currentAnswer.trim() || (hasRecording ? "[Voice recording provided]" : ""),
        answerTime: timeSpent
      });

      if (result.success) {
        // Mark question as answered
        setQuestions(prev => 
          prev.map(q => 
            q.id === questionId ? { ...q, answered: true } : q
          )
        );
        setSavedAnswers(prev => new Map(prev).set(questionId, true));
        
        // Save question time
        setQuestionTimers(prev => new Map(prev).set(questionId, timeSpent));
        
        // Auto-advance if not last question
        if (currentIndex < questions.length - 1) {
          setTimeout(() => {
            setCurrentIndex(prev => prev + 1);
          }, 500);
        }
      } else {
        console.error("Failed to save answer:", result.error?.message);
      }
    } catch (err) {
      console.error("Error saving answer:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const previousQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const skipQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const jumpToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index);
    }
  };

  const resetCurrentQuestionTimer = () => {
    setCurrentQuestionStartTime(Date.now());
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers.get(currentQuestion.id) || "" : "";
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const answeredCount = questions.filter(q => q.answered).length;
  const selectedStagesCount = allStages.filter(stage => stage.selected).length;
  const currentQuestionTime = getCurrentQuestionTime();

  // Update timer display every second
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render to update timer display
      if (currentQuestion) {
        setCurrentQuestionStartTime(prev => prev);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [currentQuestion]);

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
      <div className="container mx-auto px-4 py-4 max-w-4xl">
        {/* Compact Header */}
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard${searchId ? `?searchId=${searchId}` : ''}`)}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowStageSelector(!showStageSelector)}
              >
                <Settings className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-full text-xs">
                <Timer className="h-3 w-3" />
                <span className="font-mono">{formatTime(currentQuestionTime)}</span>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Question {currentIndex + 1} of {questions.length} • {answeredCount} answered
            </p>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div 
                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Stage Selector Panel */}
        {showStageSelector && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Practice Configuration
              </CardTitle>
              <CardDescription>
                {enhancedQuestionBanks.length > 0 
                  ? `Enhanced question bank with ${enhancedQuestionBanks.reduce((total, bank) => total + (bank.total_questions || 0), 0)} total questions available`
                  : "Basic question set available"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Question Filtering */}
              {enhancedQuestionBanks.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Question Filters</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Categories</label>
                      <Select 
                        value={selectedCategories[0] || 'all'} 
                        onValueChange={(value) => setSelectedCategories([value])}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {questionCategories.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Difficulty</label>
                      <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {difficultyLevels.map(level => (
                            <SelectItem key={level.value} value={level.value}>
                              {level.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Order</label>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="shuffle"
                          checked={shuffleQuestions}
                          onCheckedChange={(checked) => setShuffleQuestions(checked as boolean)}
                        />
                        <label htmlFor="shuffle" className="text-xs cursor-pointer">
                          Shuffle questions
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Stage Selection */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Interview Stages</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {allStages.map((stage, index) => {
                    const enhancedBank = enhancedQuestionBanks.find(bank => bank.interview_stage === stage.name);
                    const totalQuestions = enhancedBank?.total_questions || stage.questions?.length || 0;
                    
                    return (
                      <div key={stage.id} className="flex items-center space-x-3 p-3 border rounded">
                        <Checkbox
                          checked={stage.selected}
                          onCheckedChange={() => handleStageToggle(stage.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              Stage {index + 1}
                            </Badge>
                            <span className="font-medium text-sm truncate">{stage.name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {totalQuestions} question{totalQuestions !== 1 ? 's' : ''} available
                            {enhancedBank && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                Enhanced
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Question Card - Mobile Optimized */}
        <div className="max-w-2xl mx-auto">
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs">
                    {currentQuestion.stage_name}
                  </Badge>
                  {currentQuestion.category && (
                    <Badge variant="outline" className="text-xs">
                      {currentQuestion.category.replace('_', ' ').toUpperCase()}
                    </Badge>
                  )}
                  {currentQuestion.difficulty && (
                    <Badge 
                      variant={currentQuestion.difficulty === 'Hard' ? 'destructive' : 
                               currentQuestion.difficulty === 'Medium' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {currentQuestion.difficulty}
                    </Badge>
                  )}
                  {currentQuestion.star_story_fit && (
                    <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                      STAR Method
                    </Badge>
                  )}
                </div>
                {currentQuestion.answered && (
                  <Badge variant="default" className="bg-green-500/10 text-green-700 border-green-500/20 text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Answered
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg sm:text-xl leading-relaxed mb-4">
                {currentQuestion.question}
              </CardTitle>
              
              {/* Enhanced Question Information */}
              {(currentQuestion.rationale || currentQuestion.company_context) && (
                <div className="space-y-3 text-sm">
                  {currentQuestion.rationale && (
                    <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-200">
                      <h4 className="font-medium text-blue-900 mb-1">Why this question?</h4>
                      <p className="text-blue-800">{currentQuestion.rationale}</p>
                    </div>
                  )}
                  
                  {currentQuestion.company_context && (
                    <div className="bg-purple-50 p-3 rounded-lg border-l-4 border-purple-200">
                      <h4 className="font-medium text-purple-900 mb-1">Company Context</h4>
                      <p className="text-purple-800">{currentQuestion.company_context}</p>
                    </div>
                  )}
                  
                  {currentQuestion.suggested_answer_approach && (
                    <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-200">
                      <h4 className="font-medium text-green-900 mb-1">Answer Approach</h4>
                      <p className="text-green-800">{currentQuestion.suggested_answer_approach}</p>
                    </div>
                  )}
                  
                  {currentQuestion.evaluation_criteria && currentQuestion.evaluation_criteria.length > 0 && (
                    <div className="bg-amber-50 p-3 rounded-lg border-l-4 border-amber-200">
                      <h4 className="font-medium text-amber-900 mb-1">What interviewers look for:</h4>
                      <ul className="text-amber-800 space-y-1">
                        {currentQuestion.evaluation_criteria.map((criterion, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-amber-600 mt-1">•</span>
                            {criterion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {currentQuestion.follow_up_questions && currentQuestion.follow_up_questions.length > 0 && (
                    <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-gray-200">
                      <h4 className="font-medium text-gray-900 mb-1">Potential follow-up questions:</h4>
                      <ul className="text-gray-800 space-y-1">
                        {currentQuestion.follow_up_questions.map((followUp, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-gray-600 mt-1">•</span>
                            {followUp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Voice Recording Section - PRIORITIZED */}
              <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm">Voice Answer (Recommended)</h3>
                  {isRecording && (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      Recording: {formatTime(recordingTime)}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  {!isRecording && !hasRecording && (
                    <Button 
                      onClick={startRecording}
                      className="flex-1 bg-primary hover:bg-primary/90 h-12"
                    >
                      <Mic className="h-4 w-4 mr-2" />
                      Start Recording
                    </Button>
                  )}
                  
                  {isRecording && (
                    <Button 
                      onClick={stopRecording}
                      variant="destructive"
                      className="flex-1 h-12"
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Stop Recording
                    </Button>
                  )}
                  
                  {hasRecording && !isRecording && (
                    <>
                      <Button 
                        onClick={playRecording}
                        variant="outline"
                        className="flex-1 h-12"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Play ({formatTime(recordingTime)})
                      </Button>
                      <Button 
                        onClick={clearRecording}
                        variant="outline"
                        size="sm"
                        className="h-12 px-3"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button 
                        onClick={startRecording}
                        variant="outline"
                        size="sm"
                        className="h-12 px-3"
                      >
                        <MicOff className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Notes Section - Smaller */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Notes (Optional)</label>
                <Textarea
                  value={currentAnswer}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  placeholder="Add any notes or key points here..."
                  className="min-h-[80px] resize-none text-sm"
                />
              </div>
              
              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={resetCurrentQuestionTimer}
                    className="h-8 px-2"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset Timer
                  </Button>
                  <span>Timer resets when you navigate</span>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    onClick={skipQuestion}
                    disabled={currentIndex >= questions.length - 1}
                    className="flex-1 h-11"
                  >
                    <SkipForward className="h-4 w-4 mr-2" />
                    Skip Question
                  </Button>
                  <Button
                    onClick={handleSaveAnswer}
                    disabled={(!currentAnswer.trim() && !hasRecording) || isSaving}
                    className="flex-1 h-11 bg-primary hover:bg-primary/90"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {currentIndex >= questions.length - 1 ? 'Save Answer' : 'Save & Continue'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation - Fixed at bottom on mobile */}
        <div className="flex items-center justify-between max-w-2xl mx-auto mt-6 sticky bottom-4 bg-background/95 backdrop-blur-sm rounded-full border p-2 shadow-lg">
          <Button
            variant="outline"
            onClick={previousQuestion}
            disabled={currentIndex === 0}
            className="rounded-full w-10 h-10 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          {/* Question Indicators - Scrollable */}
          <div className="flex items-center gap-1 px-2 overflow-x-auto max-w-xs scrollbar-hide">
            {questions.map((question, index) => (
              <button
                key={question.id}
                onClick={() => jumpToQuestion(index)}
                className={`w-2 h-2 rounded-full transition-all duration-200 flex-shrink-0 ${
                  index === currentIndex 
                    ? 'bg-primary scale-150' 
                    : question.answered 
                      ? 'bg-green-500 hover:scale-125' 
                      : 'bg-muted hover:bg-muted-foreground/50 hover:scale-125'
                }`}
                aria-label={`Go to question ${index + 1}${question.answered ? ' (answered)' : ''}`}
              />
            ))}
          </div>
          
          <Button
            onClick={nextQuestion}
            disabled={currentIndex >= questions.length - 1}
            className="rounded-full w-10 h-10 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Practice;
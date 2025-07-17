import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Building2, 
  Clock, 
  Users, 
  Target, 
  PlayCircle, 
  CheckCircle2,
  ArrowRight,
  Brain
} from "lucide-react";

interface InterviewStage {
  id: string;
  name: string;
  duration: string;
  interviewer: string;
  content: string;
  guidance: string;
  questions: string[];
  selected: boolean;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [stages, setStages] = useState<InterviewStage[]>([]);

  // Simulate loading with progress
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setIsLoading(false);
          // Load mock data
          setStages([
            {
              id: "1",
              name: "Phone Screening",
              duration: "30 mins",
              interviewer: "HR/Recruiter",
              content: "Behavioral questions, role overview, culture fit",
              guidance: "Focus on your motivation and basic technical knowledge. Prepare your elevator pitch.",
              questions: [
                "Why do you want to work at Google?",
                "Tell me about yourself",
                "What interests you about this role?",
                "Describe a challenging project you worked on"
              ],
              selected: true
            },
            {
              id: "2", 
              name: "Technical Phone Screen",
              duration: "45 mins",
              interviewer: "Senior Engineer",
              content: "Coding problem, data structures & algorithms",
              guidance: "Practice medium-level LeetCode problems. Focus on explaining your thought process clearly.",
              questions: [
                "Implement a function to reverse a linked list",
                "Find the intersection of two arrays",
                "Design a simple cache system",
                "Explain the time complexity of your solution"
              ],
              selected: true
            },
            {
              id: "3",
              name: "Virtual Onsite - Coding",
              duration: "45 mins x 2",
              interviewer: "Engineering Team",
              content: "Advanced algorithms, system design elements",
              guidance: "Prepare for harder problems. Practice coding on a whiteboard or shared screen.",
              questions: [
                "Design a URL shortener service",
                "Implement a thread-safe LRU cache",
                "Find the median in a stream of integers",
                "Optimize a given piece of code"
              ],
              selected: true
            },
            {
              id: "4",
              name: "Behavioral Interview",
              duration: "45 mins",
              interviewer: "Manager",
              content: "Leadership, teamwork, conflict resolution",
              guidance: "Use the STAR method. Prepare specific examples that show leadership and problem-solving.",
              questions: [
                "Describe a time you had to work with a difficult team member",
                "Tell me about a project that didn't go as planned",
                "How do you handle tight deadlines?",
                "Describe your ideal work environment"
              ],
              selected: false
            }
          ]);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    return () => clearInterval(timer);
  }, []);

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
      .reduce((acc, stage) => acc + stage.questions.length, 0);
  };

  const startPractice = () => {
    const selectedStages = stages.filter(stage => stage.selected);
    if (selectedStages.length > 0) {
      navigate("/practice");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Brain className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle>Researching Interview Intel</CardTitle>
            <CardDescription>
              Analyzing company data and generating personalized guidance...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={progress} className="mb-4" />
            <p className="text-sm text-muted-foreground text-center">
              {progress}% complete
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation showHistory={true} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">Google Interview Intel</h1>
              <p className="text-muted-foreground">Software Engineer • United States</p>
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
                  <p className="text-sm text-muted-foreground">4 rounds</p>
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
                          {stage.duration} • {stage.interviewer}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Content</h4>
                          <p className="text-sm text-muted-foreground">{stage.content}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-2">Targeted Guidance</h4>
                          <p className="text-sm text-muted-foreground">{stage.guidance}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-2">
                            Likely Questions ({stage.questions.length})
                          </h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {stage.questions.slice(0, 2).map((question, qIndex) => (
                              <li key={qIndex} className="flex items-start gap-2">
                                <ArrowRight className="h-3 w-3 mt-1 text-primary flex-shrink-0" />
                                {question}
                              </li>
                            ))}
                            {stage.questions.length > 2 && (
                              <li className="text-xs text-muted-foreground">
                                +{stage.questions.length - 2} more questions
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
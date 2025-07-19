import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, Search, Brain, FileText, Users, Zap } from "lucide-react";

interface ProgressDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onViewResults: () => void;
  searchStatus: 'pending' | 'processing' | 'completed' | 'failed';
  company: string;
  role?: string;
}

const ProgressDialog = ({ 
  isOpen, 
  onClose, 
  onViewResults, 
  searchStatus, 
  company, 
  role 
}: ProgressDialogProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progressValue, setProgressValue] = useState(0);

  const steps = [
    { icon: Search, label: "Gathering company intel", description: "Searching Glassdoor, Reddit, LinkedIn..." },
    { icon: FileText, label: "Analyzing job requirements", description: "Extracting role requirements and skills..." },
    { icon: Brain, label: "Processing with AI", description: "Generating personalized insights..." },
    { icon: Users, label: "Creating interview stages", description: "Building your interview roadmap..." },
    { icon: Zap, label: "Finalizing preparation", description: "Compiling questions and guidance..." }
  ];

  useEffect(() => {
    if (!isOpen) return;

    let interval: NodeJS.Timeout;
    
    if (searchStatus === 'pending' || searchStatus === 'processing') {
      interval = setInterval(() => {
        setCurrentStep(prev => {
          const nextStep = (prev + 1) % steps.length;
          return nextStep;
        });
        
        setProgressValue(prev => {
          if (prev >= 90) return 90; // Cap at 90% until completed
          return prev + Math.random() * 5 + 2; // Increment by 2-7%
        });
      }, 2000);
    } else if (searchStatus === 'completed') {
      setCurrentStep(steps.length - 1);
      setProgressValue(100);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, searchStatus, steps.length]);

  const getStatusMessage = () => {
    switch (searchStatus) {
      case 'pending':
        return "Starting your research...";
      case 'processing':
        return "AI is working on your research...";
      case 'completed':
        return "Research complete!";
      case 'failed':
        return "Research failed. Please try again.";
      default:
        return "Processing...";
    }
  };

  const getTimeEstimate = () => {
    if (searchStatus === 'completed') return "Done!";
    if (searchStatus === 'failed') return "Error occurred";
    
    const remaining = Math.max(1, 3 - Math.floor(progressValue / 30));
    return `~${remaining} min remaining`;
  };

  const CurrentIcon = steps[currentStep]?.icon || Search;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Intel Research in Progress
          </DialogTitle>
          <DialogDescription>
            Gathering comprehensive interview intelligence for <strong>{company}</strong>
            {role && <span> - {role}</span>}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Progress Circle and Status */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center transition-colors duration-500 ${
                searchStatus === 'completed' 
                  ? 'bg-green-50 border-green-200' 
                  : searchStatus === 'failed'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-blue-50 border-blue-200 animate-pulse'
              }`}>
                {searchStatus === 'completed' ? (
                  <CheckCircle className="h-8 w-8 text-green-600" />
                ) : (
                  <CurrentIcon className={`h-8 w-8 ${
                    searchStatus === 'failed' ? 'text-red-600' : 'text-blue-600'
                  }`} />
                )}
              </div>
            </div>
            
            <div className="text-center">
              <p className="font-medium text-sm">{getStatusMessage()}</p>
              <p className="text-xs text-muted-foreground mt-1">{getTimeEstimate()}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progressValue} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>{Math.round(progressValue)}%</span>
            </div>
          </div>

          {/* Current Step */}
          {searchStatus !== 'completed' && searchStatus !== 'failed' && (
            <div className="bg-muted rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <CurrentIcon className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">{steps[currentStep]?.label}</span>
              </div>
              <p className="text-xs text-muted-foreground pl-6">
                {steps[currentStep]?.description}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {searchStatus === 'completed' ? (
              <>
                <Button onClick={onClose} variant="outline" size="sm" className="flex-1">
                  Close
                </Button>
                <Button onClick={onViewResults} size="sm" className="flex-1">
                  View Results
                </Button>
              </>
            ) : searchStatus === 'failed' ? (
              <Button onClick={onClose} variant="outline" size="sm" className="w-full">
                Close
              </Button>
            ) : (
              <>
                <Button onClick={onClose} variant="outline" size="sm" className="flex-1">
                  Run in Background
                </Button>
                <Button 
                  onClick={onViewResults} 
                  variant="secondary" 
                  size="sm" 
                  className="flex-1"
                  disabled={searchStatus !== 'completed'}
                >
                  <Clock className="h-4 w-4 mr-1" />
                  Watch Progress
                </Button>
              </>
            )}
          </div>

          {/* Info Note */}
          <div className="text-xs text-muted-foreground text-center bg-muted/50 rounded p-2">
            💡 This process typically takes 2-4 minutes. You can close this dialog and check back later 
            or watch the progress in real-time.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProgressDialog;
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, Search, Brain, FileText, Users, Zap, AlertCircle } from "lucide-react";
import { useSearchProgress, useEstimatedCompletionTime, formatProgressStep, getProgressColor, getProgressIcon } from "@/hooks/useSearchProgress";

interface ProgressDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onViewResults: () => void;
  searchId: string | null;
  company: string;
  role?: string;
}

const ProgressDialog = ({ 
  isOpen, 
  onClose, 
  onViewResults, 
  searchId,
  company, 
  role 
}: ProgressDialogProps) => {
  // Use real-time progress data
  const { data: search, error } = useSearchProgress(searchId, { enabled: isOpen && !!searchId });
  const timeEstimate = useEstimatedCompletionTime(searchId);
  
  // Fallback state for when there's no search data yet
  const [fallbackStep, setFallbackStep] = useState(0);
  
  // Get actual progress data or use fallbacks
  const searchStatus = search?.status || 'pending';
  const progressValue = search?.progress_percentage || 0;
  const currentStepText = search?.progress_step || 'Initializing research...';
  const errorMessage = search?.error_message;

  const steps = [
    { icon: Search, label: "Company Research", description: "Gathering intel from multiple sources..." },
    { icon: FileText, label: "Job Analysis", description: "Processing role requirements..." },
    { icon: Brain, label: "CV Analysis", description: "Evaluating your background..." },
    { icon: Users, label: "Question Generation", description: "Creating personalized questions..." },
    { icon: Zap, label: "Finalizing", description: "Preparing your results..." }
  ];
  
  // Map progress step to icon
  const getStepIcon = (stepText: string) => {
    if (stepText.toLowerCase().includes('company') || stepText.toLowerCase().includes('research')) {
      return Search;
    } else if (stepText.toLowerCase().includes('job') || stepText.toLowerCase().includes('analysis')) {
      return FileText;
    } else if (stepText.toLowerCase().includes('cv') || stepText.toLowerCase().includes('resume')) {
      return Brain;
    } else if (stepText.toLowerCase().includes('question') || stepText.toLowerCase().includes('generating')) {
      return Users;
    } else if (stepText.toLowerCase().includes('finalizing') || stepText.toLowerCase().includes('completing')) {
      return Zap;
    }
    return Search; // default
  };

  // Fallback animation for when we don't have real progress data
  useEffect(() => {
    if (!isOpen || search) return; // Only run if we don't have real data

    const interval = setInterval(() => {
      setFallbackStep(prev => (prev + 1) % steps.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen, search, steps.length]);

  const getStatusMessage = () => {
    if (error) {
      return "Connection error. Retrying...";
    }
    
    switch (searchStatus) {
      case 'pending':
        return "Starting your research...";
      case 'processing':
        return formatProgressStep(currentStepText);
      case 'completed':
        return "Research complete!";
      case 'failed':
        return `Research failed: ${errorMessage || 'Unknown error'}`;
      default:
        return "Initializing...";
    }
  };

  const getTimeEstimate = () => {
    if (searchStatus === 'completed') return "Done!";
    if (searchStatus === 'failed') return "Process failed";
    
    // Use real-time estimate if available
    if (timeEstimate) {
      const { remainingSeconds, elapsedSeconds } = timeEstimate;
      if (remainingSeconds <= 5) return "Almost done...";
      if (remainingSeconds <= 15) return `~${remainingSeconds}s remaining`;
      if (remainingSeconds <= 60) return `~${remainingSeconds}s remaining`;
      return `~${Math.ceil(remainingSeconds / 60)}min remaining`;
    }
    
    // Fallback estimates based on progress
    if (progressValue < 25) return "~20-30s remaining";
    if (progressValue < 50) return "~15-20s remaining";
    if (progressValue < 80) return "~10-15s remaining";
    if (progressValue < 95) return "~5-10s remaining";
    return "Almost done...";
  };

  const CurrentIcon = search ? getStepIcon(currentStepText) : steps[fallbackStep]?.icon || Search;

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
                  : error
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-blue-50 border-blue-200 animate-pulse'
              }`}>
                {searchStatus === 'completed' ? (
                  <CheckCircle className="h-8 w-8 text-green-600" />
                ) : searchStatus === 'failed' ? (
                  <AlertCircle className="h-8 w-8 text-red-600" />
                ) : error ? (
                  <Clock className="h-8 w-8 text-yellow-600 animate-spin" />
                ) : (
                  <CurrentIcon className="h-8 w-8 text-blue-600" />
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
                <span className="font-medium text-sm">
                  {search ? formatProgressStep(currentStepText) : steps[fallbackStep]?.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground pl-6">
                {search 
                  ? `Processing your ${company} interview preparation...`
                  : steps[fallbackStep]?.description
                }
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
            💡 This process typically takes 20-30 seconds with our new concurrent processing. 
            You can close this dialog and check back later or watch the progress in real-time.
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="text-xs text-red-600 text-center bg-red-50 rounded p-2 border border-red-200">
              Connection issue detected. Retrying automatically...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProgressDialog;
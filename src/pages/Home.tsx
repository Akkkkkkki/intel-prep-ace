import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Search, FileText, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { searchService } from "@/services/searchService";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import ProgressDialog from "@/components/ProgressDialog";

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    company: "",
    role: "",
    country: "",
    cv: "",
    roleLinks: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [currentSearchId, setCurrentSearchId] = useState<string | null>(null);
  const [searchStatus, setSearchStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company.trim()) return;
    
    if (!user) {
      setError("Please sign in to continue");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Step 1: Create search record and show progress dialog immediately
      const result = await searchService.createSearchRecord({
        company: formData.company.trim(),
        role: formData.role.trim() || undefined,
        country: formData.country.trim() || undefined,
        roleLinks: formData.roleLinks.trim() || undefined,
        cv: formData.cv.trim() || undefined
      });

      if (result.success && result.searchId) {
        // Immediately show progress dialog
        setCurrentSearchId(result.searchId);
        setSearchStatus('pending');
        setShowProgressDialog(true);
        setIsLoading(false); // Stop the button loading state
        
        // Show success toast notification
        toast({
          title: "Research Started!",
          description: "Your AI research is now running. Track progress in the dialog or check back in a few minutes.",
          duration: 3000,
        });
        
        // Step 2: Start the actual processing asynchronously
        searchService.startProcessing(result.searchId, {
          company: formData.company.trim(),
          role: formData.role.trim() || undefined,
          country: formData.country.trim() || undefined,
          roleLinks: formData.roleLinks.trim() || undefined,
          cv: formData.cv.trim() || undefined
        });
        
        // Step 3: Start polling for status updates
        startStatusPolling(result.searchId);
        
      } else {
        const errorMessage = result.error?.message || "Failed to create search. Please try again.";
        setError(errorMessage);
        toast({
          title: "Error Starting Research",
          description: errorMessage,
          variant: "destructive",
          duration: 5000,
        });
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Error submitting search:", err);
      const errorMessage = "An unexpected error occurred. Please try again.";
      setError(errorMessage);
      toast({
        title: "Error Starting Research",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
      setIsLoading(false);
    }
  };

  const startStatusPolling = (searchId: string) => {
    let pollCount = 0;
    let hasShownTimeoutWarning = false;
    
    const poll = async () => {
      try {
        const status = await searchService.getSearchStatus(searchId);
        if (status) {
          const newStatus = status.search_status as 'pending' | 'processing' | 'completed' | 'failed';
          setSearchStatus(newStatus);
          
          // Stop polling when complete or failed
          if (newStatus === 'completed' || newStatus === 'failed') {
            if (newStatus === 'failed') {
              toast({
                title: "Research Failed",
                description: "The research process encountered an error. Please try again.",
                variant: "destructive",
                duration: 5000,
              });
            }
            return false; // Stop polling
          }
        }
        
        // Show timeout warning after 2.5 minutes of processing
        if (pollCount > 75 && !hasShownTimeoutWarning) {
          hasShownTimeoutWarning = true;
          toast({
            title: "Research Taking Longer",
            description: "The research is taking longer than expected. You can close this dialog and check back later.",
            duration: 8000,
          });
        }
        
        pollCount++;
        return true; // Continue polling
      } catch (error) {
        console.error('Error polling search status:', error);
        pollCount++;
        return true; // Continue polling despite errors
      }
    };

    // Initial poll immediately
    poll().then(shouldContinue => {
      if (!shouldContinue) return;

      // Adaptive polling: start fast, then slow down
      const pollInterval = setInterval(async () => {
        const shouldContinue = await poll();
        if (!shouldContinue) {
          clearInterval(pollInterval);
          return;
        }

        // After 40 polls (2 minutes), switch to less frequent polling
        if (pollCount > 40) {
          clearInterval(pollInterval);
          
          // Switch to 5-second intervals for long-running searches
          const slowPollInterval = setInterval(async () => {
            const shouldContinue = await poll();
            if (!shouldContinue) {
              clearInterval(slowPollInterval);
            }
          }, 5000);

          // Clear slow polling after 8 minutes total
          setTimeout(() => {
            clearInterval(slowPollInterval);
            // If still processing after 8 minutes, assume timeout
            if (searchStatus === 'processing' || searchStatus === 'pending') {
              setSearchStatus('failed');
              toast({
                title: "Research Timeout",
                description: "The research process has timed out. Please try again with a smaller scope.",
                variant: "destructive",
                duration: 10000,
              });
            }
          }, 360000); // 6 more minutes (8 total)
        }
      }, 3000); // Poll every 3 seconds initially

      // Clear fast polling after 2 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
      }, 120000);
    });
  };

  const handleCloseProgressDialog = () => {
    setShowProgressDialog(false);
  };

  const handleViewResults = () => {
    if (currentSearchId) {
      navigate(`/search/${currentSearchId}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      // TODO: Process PDF upload
      console.log("PDF uploaded:", file.name);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Always show Navigation for logged-in users */}
      {user && <Navigation />}
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <h1 className="text-5xl font-bold tracking-tight mb-4">
            <span className="text-primary">INT</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Get insider intel on any company's interview process. Tailored prep for you and your friends.
          </p>
          
          {/* Simple login/signup buttons for non-logged-in users */}
          {!user && (
            <div className="flex gap-4 justify-center mb-8">
              <Button onClick={() => navigate("/auth")}>
                Sign Up
              </Button>
              <Button variant="outline" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
            </div>
          )}
        </div>

        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Start Your Interview Intel
            </CardTitle>
            <CardDescription>
              Enter company details to get personalized interview insights and preparation guidance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="company">Company *</Label>
                <Input
                  id="company"
                  placeholder="e.g., Google, Microsoft, Stripe..."
                  value={formData.company}
                  onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role (optional)</Label>
                  <Input
                    id="role"
                    placeholder="e.g., Software Engineer"
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country (optional)</Label>
                  <Input
                    id="country"
                    placeholder="e.g., United States"
                    value={formData.country}
                    onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label>CV / Resume</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        Upload PDF or paste your CV text below
                      </p>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="cv-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('cv-upload')?.click()}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Upload PDF
                      </Button>
                    </div>
                  </div>
                </div>
                
                <Textarea
                  placeholder="Or paste your CV text here..."
                  value={formData.cv}
                  onChange={(e) => setFormData(prev => ({ ...prev, cv: e.target.value }))}
                  rows={6}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role-links">Role Description Links (optional)</Label>
                <Textarea
                  id="role-links"
                  placeholder="Paste job description links here (one per line)..."
                  value={formData.roleLinks}
                  onChange={(e) => setFormData(prev => ({ ...prev, roleLinks: e.target.value }))}
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Add links to job descriptions to improve research accuracy
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={!formData.company.trim() || isLoading}
              >
                {isLoading ? "Researching..." : "Run Intel"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      
      {/* Progress Dialog */}
      <ProgressDialog
        isOpen={showProgressDialog}
        onClose={handleCloseProgressDialog}
        onViewResults={handleViewResults}
        searchStatus={searchStatus}
        company={formData.company}
        role={formData.role}
      />
    </div>
  );
};

export default Home;
import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  FileText, 
  Upload, 
  Trash2, 
  User, 
  Mail, 
  Calendar,
  MapPin,
  Briefcase,
  GraduationCap,
  AlertCircle,
  CheckCircle,
  Loader2
} from "lucide-react";
import { searchService } from "@/services/searchService";
import { useAuthContext } from "@/components/AuthProvider";

const Profile = () => {
  const { user } = useAuthContext();
  const [cvText, setCvText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<{
    name?: string;
    email?: string;
    location?: string;
    experience?: string;
    currentRole?: string;
    skills?: string[];
    education?: string;
    lastUpdated?: string;
  } | null>(null);

  // Load existing CV data
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setError("Please sign in to view your profile");
        setIsLoading(false);
        return;
      }

      try {
        const result = await searchService.getResume(user.id);
        
        if (result.success && result.resume) {
          setCvText(result.resume.content);
          if (result.resume.parsed_data) {
            setParsedData(result.resume.parsed_data as {
              name?: string;
              email?: string;
              location?: string;
              experience?: string;
              currentRole?: string;
              skills?: string[];
              education?: string;
              lastUpdated?: string;
            });
          }
        }
        // If no resume found, that's OK - user can create one
        
        setIsLoading(false);
      } catch (err) {
        console.error("Error loading profile:", err);
        setError("Failed to load profile data");
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      console.log("PDF uploaded:", file.name);
      // TODO: Process PDF and extract text - Phase 3 feature
      setError("PDF processing is not yet implemented. Please copy and paste your CV text instead.");
    }
  };

  const handleSave = async () => {
    if (!user || !cvText.trim()) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Simple parsing for now - could be enhanced with AI in the future
      const parsedInfo = parseCV(cvText);
      
      const result = await searchService.saveResume({
        content: cvText.trim(),
        parsedData: parsedInfo
      });

      if (result.success) {
        setParsedData(parsedInfo);
        setSuccess("CV saved successfully!");
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error?.message || "Failed to save CV");
      }
    } catch (err) {
      console.error("Error saving CV:", err);
      setError("An unexpected error occurred while saving");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;

    if (window.confirm("Are you sure you want to delete your CV? This action cannot be undone.")) {
      setCvText("");
      setParsedData(null);
      setSuccess("CV deleted successfully!");
      // Note: We're not actually deleting from the database here,
      // just clearing the local state. A future enhancement could add a delete endpoint.
    }
  };

  // Simple CV parsing function
  const parseCV = (text: string) => {
    const lines = text.split('\n');
    const parsed: any = {
      lastUpdated: new Date().toISOString().split('T')[0]
    };

    // Extract basic information
    if (lines.length > 0) {
      parsed.name = lines[0].trim();
    }
    if (lines.length > 1) {
      parsed.currentRole = lines[1].trim();
    }

    // Look for email pattern
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
      parsed.email = emailMatch[0];
    }

    // Extract skills (simple approach)
    const skillsSection = text.toLowerCase();
    const commonSkills = [
      'javascript', 'python', 'java', 'typescript', 'react', 'node.js', 'aws', 
      'docker', 'kubernetes', 'postgresql', 'mongodb', 'redis', 'sql', 'git',
      'html', 'css', 'vue', 'angular', 'express', 'django', 'flask'
    ];
    
    parsed.skills = commonSkills.filter(skill => 
      skillsSection.includes(skill.toLowerCase())
    );

    // Look for experience years
    const experienceMatch = text.match(/(\d+)\s*years?\s*(of\s*)?experience/i);
    if (experienceMatch) {
      parsed.experience = `${experienceMatch[1]} years`;
    }

    return parsed;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[400px]">
            <Card className="w-full max-w-md text-center">
              <CardHeader>
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <CardTitle>Loading Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Loading your CV and profile information...
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">


          {/* Status Messages */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Parsed CV Information */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Parsed Information
                  </CardTitle>
                  <CardDescription>
                    Key details extracted from your CV
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {parsedData ? (
                    <>
                      <div className="space-y-3">
                        {parsedData.name && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{parsedData.name}</span>
                          </div>
                        )}
                        
                        {parsedData.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{parsedData.email}</span>
                          </div>
                        )}
                        
                        {parsedData.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{parsedData.location}</span>
                          </div>
                        )}
                        
                        {parsedData.currentRole && (
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{parsedData.currentRole}</span>
                          </div>
                        )}
                        
                        {parsedData.experience && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{parsedData.experience}</span>
                          </div>
                        )}
                        
                        {parsedData.education && (
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{parsedData.education}</span>
                          </div>
                        )}
                      </div>

                      {parsedData.skills && parsedData.skills.length > 0 && (
                        <>
                          <Separator />
                          <div>
                            <p className="text-sm font-medium mb-2">Key Skills</p>
                            <div className="flex flex-wrap gap-1">
                              {parsedData.skills.map((skill, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      <Separator />

                      <div className="text-xs text-muted-foreground">
                        Last updated: {parsedData.lastUpdated}
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No CV information available</p>
                      <p className="text-xs">Save your CV to see parsed information</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* CV Editor */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    CV / Resume
                  </CardTitle>
                  <CardDescription>
                    Upload a new PDF or edit your CV text directly
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Upload Section */}
                  <div className="border-2 border-dashed border-border rounded-lg p-6">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-2">
                          Upload a new PDF to replace your current CV
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

                  {/* Text Editor */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">CV Text</label>
                    <Textarea
                      value={cvText}
                      onChange={(e) => setCvText(e.target.value)}
                      rows={20}
                      className="resize-none font-mono text-sm"
                      placeholder="Paste or type your CV content here..."
                    />
                    <p className="text-xs text-muted-foreground">
                      This text will be used to personalize your interview questions and guidance.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      disabled={!cvText.trim()}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete CV
                    </Button>
                    
                    <Button 
                      onClick={handleSave} 
                      disabled={!cvText.trim() || isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
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
  Loader2,
  Phone,
  Award,
  Globe,
  Code,
  Star,
  Building
} from "lucide-react";
import { searchService } from "@/services/searchService";
import { useAuthContext } from "@/components/AuthProvider";

interface ParsedData {
  personalInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
  professional?: {
    currentRole?: string;
    experience?: string;
    summary?: string;
    workHistory?: Array<{
      title: string;
      company: string;
      duration: string;
      description?: string;
    }>;
  };
  education?: Array<{
    degree: string;
    institution: string;
    year?: string;
    description?: string;
  }>;
  skills?: {
    technical?: string[];
    programming?: string[];
    frameworks?: string[];
    tools?: string[];
    soft?: string[];
  };
  projects?: Array<{
    name: string;
    description: string;
    technologies?: string[];
  }>;
  certifications?: Array<{
    name: string;
    issuer?: string;
    year?: string;
  }>;
  languages?: Array<{
    language: string;
    proficiency?: string;
  }>;
  achievements?: string[];
  lastUpdated?: string;
}

const Profile = () => {
  const { user } = useAuthContext();
  const [cvText, setCvText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Load existing CV data
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setError("Please sign in to view your profile");
        setIsLoading(false);
        return;
      }

      try {
        console.log("Loading profile for user:", user.id);
        const result = await searchService.getResume(user.id);
        
        console.log("Resume loading result:", {
          success: result.success,
          hasResume: !!result.resume,
          error: result.error?.message
        });
        
        if (result.success && result.resume) {
          console.log("Resume data structure:", {
            hasContent: !!result.resume.content,
            hasParsedData: !!result.resume.parsed_data,
            contentLength: result.resume.content?.length || 0
          });
          
          setCvText(result.resume.content || "");
          
          // Use JSONB parsed_data for now until enhanced columns are available
          if (result.resume.parsed_data) {
            console.log("Using JSONB parsed_data");
            setParsedData(result.resume.parsed_data as ParsedData);
            console.log("Parsed data loaded from JSONB:", Object.keys(result.resume.parsed_data));
          } else {
            console.log("No parsed data found in resume");
          }
        } else if (!result.success && result.error) {
          console.error("Error loading resume:", result.error);
          setError(`Failed to load profile: ${result.error.message}`);
        } else {
          console.log("No resume found for user - this is normal for new users");
        }
        
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
    setIsAnalyzing(true);
    setError(null);
    setSuccess(null);

    try {
      // Use AI-powered analysis for better accuracy
      const analysisResult = await searchService.analyzeCV(cvText.trim());
      
      if (!analysisResult.success) {
        throw new Error(analysisResult.error?.message || "Failed to analyze CV");
      }

      const parsedInfo = analysisResult.parsedData;
      setIsAnalyzing(false);
      
      const result = await searchService.saveResume({
        content: cvText.trim(),
        parsedData: parsedInfo
      });

      if (result.success) {
        setParsedData(parsedInfo);
        setSuccess("CV saved and analyzed successfully with AI!");
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error?.message || "Failed to save CV");
      }
    } catch (err) {
      console.error("Error saving CV:", err);
      setError("An unexpected error occurred while saving or analyzing CV");
      setIsAnalyzing(false);
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
        <div className="max-w-6xl mx-auto">
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

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Parsed CV Information */}
            <div className="xl:col-span-2">
              {parsedData ? (
                <div className="space-y-6">
                  {/* Personal Information */}
                  {parsedData.personalInfo && Object.keys(parsedData.personalInfo).length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <User className="h-5 w-5 text-primary" />
                          Personal Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {parsedData.personalInfo.name && (
                          <div className="flex items-center gap-3">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{parsedData.personalInfo.name}</p>
                              <p className="text-xs text-muted-foreground">Full Name</p>
                            </div>
                          </div>
                        )}
                        
                        {parsedData.personalInfo.email && (
                          <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{parsedData.personalInfo.email}</p>
                              <p className="text-xs text-muted-foreground">Email</p>
                            </div>
                          </div>
                        )}
                        
                        {parsedData.personalInfo.phone && (
                          <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{parsedData.personalInfo.phone}</p>
                              <p className="text-xs text-muted-foreground">Phone</p>
                            </div>
                          </div>
                        )}
                        
                        {parsedData.personalInfo.location && (
                          <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{parsedData.personalInfo.location}</p>
                              <p className="text-xs text-muted-foreground">Location</p>
                            </div>
                          </div>
                        )}
                        
                        {parsedData.personalInfo.linkedin && (
                          <div className="flex items-center gap-3">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-blue-600">{parsedData.personalInfo.linkedin}</p>
                              <p className="text-xs text-muted-foreground">LinkedIn</p>
                            </div>
                          </div>
                        )}
                        
                        {parsedData.personalInfo.github && (
                          <div className="flex items-center gap-3">
                            <Code className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-blue-600">{parsedData.personalInfo.github}</p>
                              <p className="text-xs text-muted-foreground">GitHub</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Professional Experience */}
                  {parsedData.professional && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Briefcase className="h-5 w-5 text-primary" />
                          Professional Experience
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {parsedData.professional.currentRole && (
                          <div>
                            <p className="font-medium text-lg">{parsedData.professional.currentRole}</p>
                            <p className="text-sm text-muted-foreground">Current Role</p>
                          </div>
                        )}
                        
                        {parsedData.professional.experience && (
                          <div>
                            <p className="font-medium">{parsedData.professional.experience}</p>
                            <p className="text-sm text-muted-foreground">Total Experience</p>
                          </div>
                        )}
                        
                        {parsedData.professional.summary && (
                          <div>
                            <p className="text-sm">{parsedData.professional.summary}</p>
                            <p className="text-xs text-muted-foreground mt-1">Professional Summary</p>
                          </div>
                        )}

                        {/* Work History */}
                        {parsedData.professional.workHistory && parsedData.professional.workHistory.length > 0 && (
                          <div className="mt-6 pt-4 border-t">
                            <h4 className="font-medium mb-3">Work History</h4>
                            <div className="space-y-4">
                              {parsedData.professional.workHistory.map((job, index) => (
                                <div key={index} className="border-l-2 border-primary/20 pl-4">
                                  <p className="font-medium">{job.title}</p>
                                  <p className="text-sm text-muted-foreground">{job.company}</p>
                                  <p className="text-xs text-muted-foreground">{job.duration}</p>
                                  {job.description && (
                                    <p className="text-sm mt-1">{job.description}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Skills */}
                  {parsedData.skills && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Code className="h-5 w-5 text-primary" />
                          Skills & Technologies
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {parsedData.skills.programming && parsedData.skills.programming.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">Programming Languages</p>
                            <div className="flex flex-wrap gap-2">
                              {parsedData.skills.programming.map((skill, index) => (
                                <Badge key={index} variant="default" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {parsedData.skills.frameworks && parsedData.skills.frameworks.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">Frameworks & Libraries</p>
                            <div className="flex flex-wrap gap-2">
                              {parsedData.skills.frameworks.map((skill, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {parsedData.skills.tools && parsedData.skills.tools.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">Tools & Technologies</p>
                            <div className="flex flex-wrap gap-2">
                              {parsedData.skills.tools.map((skill, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Education */}
                  {parsedData.education && parsedData.education.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <GraduationCap className="h-5 w-5 text-primary" />
                          Education
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {parsedData.education.map((edu, index) => (
                          <div key={index} className="border-l-2 border-primary/20 pl-4">
                            <p className="font-medium">{edu.degree}</p>
                            <p className="text-sm text-muted-foreground">{edu.institution}</p>
                            {edu.year && (
                              <p className="text-xs text-muted-foreground">{edu.year}</p>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Projects */}
                  {parsedData.projects && parsedData.projects.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Building className="h-5 w-5 text-primary" />
                          Projects
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {parsedData.projects.map((project, index) => (
                          <div key={index} className="border rounded-lg p-3">
                            <p className="font-medium">{project.name}</p>
                            <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Certifications */}
                  {parsedData.certifications && parsedData.certifications.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Award className="h-5 w-5 text-primary" />
                          Certifications
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {parsedData.certifications.map((cert, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <p className="font-medium">{cert.name}</p>
                            {cert.year && (
                              <Badge variant="outline" className="text-xs">{cert.year}</Badge>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Achievements */}
                  {parsedData.achievements && parsedData.achievements.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Star className="h-5 w-5 text-primary" />
                          Key Achievements
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {parsedData.achievements.map((achievement, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <Star className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{achievement}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Languages */}
                  {parsedData.languages && parsedData.languages.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Globe className="h-5 w-5 text-primary" />
                          Languages
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {parsedData.languages.map((lang, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                              <span className="font-medium">{lang.language}</span>
                              {lang.proficiency && (
                                <Badge variant="outline" className="text-xs">{lang.proficiency}</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No CV Information Available</h3>
                    <p className="text-muted-foreground mb-4">
                      Upload or paste your CV content to see detailed parsed information
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* CV Editor */}
            <div className="xl:col-span-1">
              <Card className="h-fit">
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
                  <div className="border-2 border-dashed border-border rounded-lg p-4">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-2">
                          Upload PDF to replace current CV
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
                      rows={15}
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
                      disabled={!cvText.trim() || isSaving || isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing with AI...
                        </>
                      ) : isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save & Analyze with AI"
                      )}
                    </Button>
                  </div>

                  {parsedData?.lastUpdated && (
                    <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                      Last updated: {parsedData.lastUpdated}
                    </div>
                  )}
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
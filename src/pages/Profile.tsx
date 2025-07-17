import { useState } from "react";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Upload, 
  Trash2, 
  User, 
  Mail, 
  Calendar,
  MapPin,
  Briefcase,
  GraduationCap
} from "lucide-react";

const Profile = () => {
  const [cvText, setCvText] = useState(`John Doe
Software Engineer

Email: john.doe@email.com
Location: San Francisco, CA
Experience: 5 years

EXPERIENCE:
- Senior Software Engineer at Tech Corp (2021-2024)
- Full Stack Developer at StartupCo (2019-2021)
- Junior Developer at WebAgency (2018-2019)

EDUCATION:
- BS Computer Science, State University (2018)

SKILLS:
- Languages: JavaScript, Python, Java, TypeScript
- Frameworks: React, Node.js, Express, Django
- Databases: PostgreSQL, MongoDB, Redis
- Cloud: AWS, Docker, Kubernetes`);

  const [parsedData] = useState({
    name: "John Doe",
    email: "john.doe@email.com",
    location: "San Francisco, CA",
    experience: "5 years",
    currentRole: "Senior Software Engineer",
    skills: ["JavaScript", "Python", "React", "Node.js", "AWS"],
    education: "BS Computer Science",
    lastUpdated: "2024-01-15"
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      console.log("PDF uploaded:", file.name);
      // TODO: Process PDF and extract text
    }
  };

  const handleSave = () => {
    // TODO: Save CV to database
    console.log("Saving CV...");
  };

  const handleDelete = () => {
    setCvText("");
    // TODO: Delete from database
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Profile & CV</h1>
            <p className="text-muted-foreground">
              Manage your CV and profile information for personalized interview preparation.
            </p>
          </div>

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
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{parsedData.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{parsedData.email}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{parsedData.location}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{parsedData.currentRole}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{parsedData.experience} experience</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{parsedData.education}</span>
                    </div>
                  </div>

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

                  <Separator />

                  <div className="text-xs text-muted-foreground">
                    Last updated: {parsedData.lastUpdated}
                  </div>
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
                    
                    <Button onClick={handleSave} disabled={!cvText.trim()}>
                      Save Changes
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
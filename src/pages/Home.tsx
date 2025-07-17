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

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    company: "",
    role: "",
    country: "",
    cv: "",
    roleLinks: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const result = await searchService.createSearch({
        company: formData.company.trim(),
        role: formData.role.trim() || undefined,
        country: formData.country.trim() || undefined,
        roleLinks: formData.roleLinks.trim() || undefined,
        cv: formData.cv.trim() || undefined
      });

      if (result.success && result.searchId) {
        // Navigate to dashboard with search ID
        navigate(`/dashboard?searchId=${result.searchId}`);
      } else {
        setError(result.error?.message || "Failed to create search. Please try again.");
      }
    } catch (err) {
      console.error("Error submitting search:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
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
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <h1 className="text-5xl font-bold tracking-tight mb-4">
            <span className="text-primary">INT</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Get insider intel on any company's interview process. Tailored prep for you and your friends.
          </p>
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
    </div>
  );
};

export default Home;
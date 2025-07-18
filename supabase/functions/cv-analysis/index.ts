import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CVAnalysisRequest {
  cvText: string;
  userId: string;
}

interface CVAnalysis {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  current_role?: string;
  experience_years?: number;
  skills: {
    technical: string[];
    soft: string[];
    certifications: string[];
  };
  education: {
    degree?: string;
    institution?: string;
    graduation_year?: number;
  };
  experience: {
    company: string;
    role: string;
    duration: string;
    achievements: string[];
  }[];
  projects: string[];
  key_achievements: string[];
}

interface ProfileParsedData {
  personalInfo: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
  professional: {
    currentRole?: string;
    experience?: string;
    summary?: string;
    workHistory: {
      title: string;
      company: string;
      duration: string;
      description?: string;
    }[];
  };
  education: {
    degree: string;
    institution: string;
    year?: string;
    description?: string;
  }[];
  skills: {
    technical: string[];
    programming: string[];
    frameworks: string[];
    tools: string[];
    soft: string[];
  };
  projects: {
    name: string;
    description: string;
    technologies?: string[];
  }[];
  certifications: {
    name: string;
    issuer?: string;
    year?: string;
  }[];
  languages: {
    language: string;
    proficiency?: string;
  }[];
  achievements: string[];
  lastUpdated: string;
}

// AI-powered CV analysis using OpenAI
async function analyzeCV(cvText: string, openaiApiKey: string): Promise<CVAnalysis> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert CV parser and career analyst. Analyze the CV and extract structured information. Return ONLY valid JSON without any markdown formatting or additional text.'
        },
        {
          role: 'user',
          content: `Analyze this CV and return structured data in this exact JSON format:
{
  "name": "string",
  "email": "string",
  "phone": "string", 
  "location": "string",
  "current_role": "string",
  "experience_years": number,
  "skills": {
    "technical": ["array of technical skills"],
    "soft": ["array of soft skills"],
    "certifications": ["array of certifications"]
  },
  "education": {
    "degree": "string",
    "institution": "string", 
    "graduation_year": number
  },
  "experience": [
    {
      "company": "string",
      "role": "string", 
      "duration": "string",
      "achievements": ["array of key achievements"]
    }
  ],
  "projects": ["array of notable projects"],
  "key_achievements": ["array of major accomplishments"]
}

CV Text:
${cvText}`
        }
      ],
      max_tokens: 2000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`CV analysis failed: ${response.status}`);
  }

  const data = await response.json();
  const analysisText = data.choices[0].message.content;
  
  try {
    return JSON.parse(analysisText);
  } catch (parseError) {
    console.error("Failed to parse CV analysis JSON:", parseError);
    // Return complete fallback structure with all required fields
    return {
      name: undefined,
      email: undefined,
      phone: undefined,
      location: undefined,
      current_role: undefined,
      experience_years: undefined,
      skills: { technical: [], soft: [], certifications: [] },
      education: {
        degree: undefined,
        institution: undefined,
        graduation_year: undefined
      },
      experience: [],
      projects: [],
      key_achievements: []
    };
  }
}

// Convert OpenAI CV analysis to Profile component format
function convertToProfileFormat(aiAnalysis: CVAnalysis): ProfileParsedData {
  // Extract programming languages, frameworks, and tools from technical skills
  const technicalSkills = aiAnalysis.skills.technical || [];
  const programmingLanguages = technicalSkills.filter(skill => 
    ['javascript', 'python', 'java', 'typescript', 'c++', 'c#', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'scala', 'r', 'matlab', 'sql', 'html', 'css'].some(lang => 
      skill.toLowerCase().includes(lang)
    )
  );
  
  const frameworks = technicalSkills.filter(skill =>
    ['react', 'angular', 'vue', 'svelte', 'nextjs', 'nuxt', 'express', 'nestjs', 'django', 'flask', 'spring', 'laravel', 'rails', 'asp.net', 'tensorflow', 'pytorch'].some(framework =>
      skill.toLowerCase().includes(framework)
    )
  );
  
  const tools = technicalSkills.filter(skill =>
    ['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'jenkins', 'gitlab', 'github', 'git', 'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch'].some(tool =>
      skill.toLowerCase().includes(tool)
    )
  );

  return {
    personalInfo: {
      name: aiAnalysis.name,
      email: aiAnalysis.email,
      phone: aiAnalysis.phone,
      location: aiAnalysis.location,
    },
    professional: {
      currentRole: aiAnalysis.current_role,
      experience: aiAnalysis.experience_years ? `${aiAnalysis.experience_years}+ years` : undefined,
      summary: (aiAnalysis.key_achievements && aiAnalysis.key_achievements.length > 0) 
        ? aiAnalysis.key_achievements.slice(0, 3).join('. ') 
        : undefined,
      workHistory: (aiAnalysis.experience && aiAnalysis.experience.length > 0) 
        ? aiAnalysis.experience.map(exp => ({
            title: exp.role,
            company: exp.company,
            duration: exp.duration,
            description: exp.achievements.join('. ')
          }))
        : []
    },
    education: aiAnalysis.education ? [{
      degree: aiAnalysis.education.degree || 'Degree',
      institution: aiAnalysis.education.institution || 'Institution',
      year: aiAnalysis.education.graduation_year ? aiAnalysis.education.graduation_year.toString() : undefined,
      description: ''
    }] : [],
    skills: {
      technical: technicalSkills,
      programming: programmingLanguages,
      frameworks: frameworks,
      tools: tools,
      soft: aiAnalysis.skills.soft || []
    },
    projects: (aiAnalysis.projects && aiAnalysis.projects.length > 0)
      ? (typeof aiAnalysis.projects[0] === 'string' 
          ? aiAnalysis.projects.map((project: string) => ({
              name: project.split(':')[0] || project,
              description: project,
              technologies: []
            }))
          : aiAnalysis.projects.map((project: any) => ({
              name: project.name || project,
              description: project.description || project,
              technologies: project.technologies || []
            })))
      : [],
    certifications: (aiAnalysis.skills.certifications && aiAnalysis.skills.certifications.length > 0)
      ? aiAnalysis.skills.certifications.map(cert => ({
          name: cert,
          issuer: undefined,
          year: undefined
        }))
      : [],
    languages: [],
    achievements: aiAnalysis.key_achievements || [],
    lastUpdated: new Date().toISOString().split('T')[0]
  };
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cvText, userId } = await req.json() as CVAnalysisRequest;

    if (!cvText || !userId) {
      throw new Error("Missing required parameters: cvText and userId");
    }

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("Missing OpenAI API key");
    }

    console.log("Starting AI CV analysis for user:", userId);

    // Analyze CV using AI
    const aiAnalysis = await analyzeCV(cvText, openaiApiKey);
    
    // Convert to Profile component format
    const profileData = convertToProfileFormat(aiAnalysis);

    console.log("CV analysis completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        parsedData: profileData,
        aiAnalysis: aiAnalysis // Include raw AI analysis for potential future use
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error("CV analysis error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to analyze CV"
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
}); 
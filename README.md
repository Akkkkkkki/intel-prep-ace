# INT - Interview Prep Tool 🎯

A modern, AI-powered interview preparation tool that helps small circles of friends and colleagues quickly learn how target companies run their interviews and prepare effectively.

![License](https://img.shields.io/badge/license-MIT-green)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)

## ✨ Features

### 🔍 **Intelligent Research** 
- **Multi-Source Company Research**: Real-time data from Glassdoor, Levels.fyi, Blind, and more
- **Job Description Analysis**: Automatic extraction and analysis of role requirements
- **AI-Powered CV Analysis**: Intelligent skill extraction and gap analysis
- **Personalized Guidance**: Tailored preparation based on your actual background
- **Structured AI Responses**: Comprehensive, accurate interview insights

### 📊 **Structured Results**
- Interview process overview with timeline
- Stage-by-stage preparation guidance
- Personalized questions based on your background
- Company-specific tips and insights

### 🎴 **Practice Mode**
- Flash-card style question review
- Filter questions by interview stage
- Built-in timer for practice sessions
- Answer tracking and session persistence
- Voice/text recording capabilities (Phase 3)

### 📱 **Modern Experience**
- Responsive design for desktop and mobile
- Clean, minimalist interface with fresh green theme
- Real-time status updates during AI research
- Complete search history and session management
- Secure authentication and data protection
- Full CV management with intelligent parsing

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Modern web browser
- Internet connection for AI research

### Getting Started

1. **Visit the App**
   ```
   https://lovable.dev/projects/f6161025-31dc-4404-8dea-263c660d8616
   ```

2. **Create Account**
   - Sign up with email and password
   - No email verification required for quick testing

3. **Start Researching**
   - Enter a company name (e.g., "Google", "Meta", "Stripe")
   - Optionally add role and location details
   - Upload your CV for personalized insights
   - Click "Run Intel" and wait for AI research

4. **Review & Practice**
   - Explore the generated interview stages
   - Read targeted preparation guidance
   - Practice with company-specific questions
   - Save results for future reference

## 🏗️ Architecture

### Tech Stack
- **Frontend:** React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (PostgreSQL, Auth, Edge Functions)
- **AI:** OpenAI GPT-4.1 for intelligent research
- **Deployment:** Lovable platform

### Key Components

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── Navigation.tsx  # Main navigation
│   └── AuthProvider.tsx # Authentication context
├── pages/              # Route components
│   ├── Home.tsx        # Search interface
│   ├── Dashboard.tsx   # Results display
│   ├── Practice.tsx    # Question practice
│   ├── Profile.tsx     # User settings
│   └── Auth.tsx        # Login/signup
├── hooks/              # Custom React hooks
│   └── useAuth.ts      # Authentication logic
├── services/           # API integration
│   └── searchService.ts # Research API calls
└── integrations/       # External services
    └── supabase/       # Database client
```

## 🛠️ Development

### Local Setup

1. **Clone and Install**
   ```bash
   git clone <YOUR_GIT_URL>
   cd <YOUR_PROJECT_NAME>
   npm install
   ```

2. **Environment Configuration**
   ```bash
   # Frontend (.env.local)
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   
   # Backend (Supabase Edge Functions)
   OPENAI_API_KEY=your-openai-api-key
   TAVILY_API_KEY=your-tavily-api-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Open Browser**
   ```
   http://localhost:5173
   ```

### Database Setup

The project uses Supabase with the following main tables:
- `profiles` - User profile information with auto-creation triggers
- `searches` - Research queries with status tracking (pending/processing/completed/failed)
- `interview_stages` - Structured interview process stages with ordering
- `interview_questions` - Questions for each stage with relationships
- `resumes` - CV content storage with intelligent parsing metadata
- `practice_sessions` - User practice tracking with answer persistence
- `practice_answers` - Individual answer records with timing data

All tables include comprehensive Row Level Security (RLS) policies for data protection and user isolation.

### AI Integration - Microservices Architecture

The app uses a sophisticated microservices architecture with four specialized Edge Functions:

**Microservices Design:**
- **cv-analysis:** Independent CV parsing and skill extraction
- **company-research:** Tavily-powered company interview research  
- **job-analysis:** Job description URL extraction and analysis
- **interview-research:** Synthesis orchestrator that generates final outputs

**OpenAI Integration:**
- **Models:** GPT-4o for research synthesis, GPT-4o-mini for CV analysis
- **Structured Output:** Enforced JSON responses with comprehensive error handling
- **Features:** Company insights, personalized guidance, preparation timelines

**Tavily Expert Integration:**
- **Real-Time Research:** Multi-source company interview data
- **Job Analysis:** Advanced extraction from role description URLs
- **Trusted Sources:** Glassdoor, Levels.fyi, Blind, LinkedIn, Indeed
- **Advanced Search:** Parallel targeted queries for comprehensive coverage

**System Features:**
- **Single Responsibility:** Each function has one clear purpose
- **Error Isolation:** Component failures don't cascade
- **Parallel Processing:** Data gathering runs concurrently
- **Graceful Degradation:** Robust fallbacks for all external services
- **Performance Optimized:** Parallel processing and efficient API usage
- **Security:** All API keys securely stored in Supabase secrets

## 🎯 Usage Examples

### Basic Company Research
```
Company: Meta
Role: Software Engineer
Country: United States
```

### Advanced Research with Context
```
Company: Stripe
Role: Senior Frontend Engineer
Country: Ireland
Role Links: 
- https://stripe.com/jobs/listing/senior-frontend-engineer
- https://careers.stripe.com/jobs/12345

CV: [Upload your resume for personalized insights]
```

### Practice Session
1. Complete a company research first
2. Select specific interview stages from Dashboard
3. Navigate to Practice mode with selected questions
4. Use flash-card interface to review questions
5. Time your responses and save answers
6. Track progress across multiple sessions

## 🔒 Security & Privacy

- **Data Encryption:** All user data encrypted at rest and in transit
- **Access Control:** Row Level Security ensures user data isolation
- **Privacy First:** No data sharing with third parties
- **User Control:** Full data export and deletion capabilities

## 📖 Documentation

### Core Documentation
- **[Product Design Document](docs/PRODUCT_DESIGN.md)** - Product vision, features, and user journeys
- **[Technical Design Document](docs/TECHNICAL_DESIGN.md)** - Complete system architecture and implementation details
- **[Development Guide](docs/DEVELOPMENT_GUIDE.md)** - Practical patterns and day-to-day development workflows
- **[Implementation Changes](docs/IMPLEMENTATION_CHANGES.md)** - Development progress tracking and phase completions

### Quick Start for Developers
1. **New to the project?** Start with [Product Design](docs/PRODUCT_DESIGN.md) for context
2. **Setting up development?** Follow [Development Guide - Getting Started](docs/DEVELOPMENT_GUIDE.md#getting-started)
3. **Understanding the architecture?** See [Technical Design](docs/TECHNICAL_DESIGN.md)
4. **Daily development?** Use [Development Guide](docs/DEVELOPMENT_GUIDE.md) as your reference

## 🎨 Design System

The app uses a custom design system based on fresh green colors:
- **Primary:** #28A745 (Fresh Green)
- **Accent:** #1B5E20 (Deep Green)  
- **Backgrounds:** #FFFFFF, #F8F9FA
- **Typography:** System default sans-serif fonts

All components follow accessibility guidelines and responsive design principles.

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the Repository**
2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make Changes**
   - Follow TypeScript and React best practices
   - Use the existing design system
   - Add appropriate error handling
4. **Test Changes**
   - Verify responsive design
   - Test authentication flows
   - Validate AI integration
5. **Submit Pull Request**

### Development Guidelines
- Use TypeScript for type safety
- Follow existing code style and patterns
- Include descriptive commit messages
- Test on multiple browsers and devices

## 🔧 Troubleshooting

### Common Issues

**Authentication Errors**
- Check Supabase URL configuration in auth settings
- Verify redirect URLs include your domain
- Ensure email verification is disabled for testing

**AI Research Failures**
- Verify OpenAI API key is set in Supabase secrets
- Check Edge Function logs for detailed errors
- Ensure sufficient OpenAI credits

**Performance Issues**
- Check network connection for AI API calls
- Clear browser cache and localStorage
- Verify Supabase service status

### Getting Help

- **Documentation:** Check the technical design document
- **Logs:** Use browser dev tools and Supabase dashboard
- **Community:** Join the project discussions

## 📈 Roadmap

### Phase 2 Features (Planned)
- **AI Interview Coach:** Real-time feedback on practice answers
- **Advanced Recording:** Audio/video practice with analysis
- **Community Features:** Anonymous sharing of interview experiences
- **Enhanced Analytics:** Personal progress tracking and insights

### Phase 3 Vision
- **Mobile Apps:** Native iOS and Android applications
- **Enterprise Features:** Team-based preparation workflows
- **Integration APIs:** Connect with job boards and ATS systems
- **Advanced AI:** Multi-modal research and preparation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for providing powerful AI research capabilities
- **Supabase** for the robust backend infrastructure  
- **shadcn/ui** for beautiful, accessible components
- **Lovable** for the development and hosting platform

---

**Built with ❤️ for better interview preparation**

*Ready to ace your next interview? Start your research now!*

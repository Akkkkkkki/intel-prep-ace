# Product Design Document: INT - Interview Prep Tool

## 1. Product Overview

**Product Name:** INT  
**Version:** 1.0  
**Last Updated:** December 2024

### Vision Statement
Empower small circles of friends and colleagues to quickly learn how target companies run their interviews through AI-powered research and structured preparation.

### Product Mission
To democratize interview preparation by providing tailored, stage-by-stage guidance that helps candidates understand company-specific interview processes and prepare effectively.

## 2. Target Audience

### Primary Users
- **Friends & colleagues preparing for interviews at top firms**
  - Demographics: Working professionals, 22-45 years old
  - Tech-savvy individuals comfortable with web applications
  - Seeking efficient, targeted interview preparation

- **Power users who want tailored stage-by-stage prep**
  - Career changers preparing for specific roles
  - Professionals interviewing at multiple companies
  - Individuals seeking comprehensive interview intelligence

### User Personas

#### Persona 1: "Strategic Sam"
- **Age:** 28, Software Engineer
- **Goal:** Land a senior role at a FAANG company
- **Pain Points:** Generic interview advice doesn't help with company-specific processes
- **Needs:** Detailed, company-specific preparation guidance

#### Persona 2: "Collaborative Casey"
- **Age:** 32, Product Manager
- **Goal:** Help team members prepare for interviews
- **Pain Points:** Time-consuming research across multiple sources
- **Needs:** Quick access to structured interview insights for sharing

## 3. Core Features & User Journeys

### 3.1 Primary User Journeys

#### Journey 1: Quick Prep (New User)
1. **Home** → Enter company, role, country (optional)
2. **Dashboard** → Review AI-generated interview stages and guidance
3. **Practice** → Use flash-card mode for question practice

#### Journey 2: Resume Enhancement
1. **Profile** → Upload/replace CV
2. **Dashboard** → Get personalized guidance based on CV
3. **Practice** → Focus on relevant questions

#### Journey 3: Revisit & Share
1. **History** → Select previous search
2. **Dashboard** → Review stored results
3. **Practice** → Continue preparation

### 3.2 Feature Specifications

#### F1: Intelligent Search & Research
- **Input Fields:**
  - Company name (required)
  - Role title (optional)
  - Country/location (optional)
  - Role description links (optional, multi-line)
  - CV upload/paste (PDF or text)

- **AI Research Engine:**
  - OpenAI Deep Research API integration
  - Multi-source data gathering (career sites, forums)
  - Structured output parsing

#### F2: Results Dashboard
- **Interview Process Overview Card:**
  - Visual timeline of stages
  - Interviewer mix breakdown
  - Duration estimates

- **Preparation Table:**
  - Stage-by-stage breakdown
  - Targeted guidance per stage
  - Personalized questions based on CV
  - Actionable preparation tips

#### F3: Practice Mode
- **Flash-card Interface:**
  - Swipe navigation through questions
  - Question filtering by stage
  - Optional voice/text recording
  - Built-in timer functionality

#### F4: History & Persistence
- **Left-hand Drawer:**
  - Chronological list of searches
  - Quick reload of stored results
  - CV snapshot preservation

#### F5: Profile Management
- **CV Management:**
  - Upload/replace functionality
  - Parsed key facts display
  - Data deletion options

#### F6: Authentication
- **Supabase Integration:**
  - Email/password signup/login
  - Secure data isolation
  - Session persistence

## 4. Design Principles

### 4.1 Visual Design Language

#### Color Palette
- **Primary:** #28A745 (Fresh Green) - Trust, growth, success
- **Accent:** #1B5E20 (Deep Green) - Sophistication, depth
- **Backgrounds:** #FFFFFF, #F8F9FA - Clean, minimal
- **Text:** System defaults for accessibility

#### Typography
- **Font:** System default sans-serif
- **Hierarchy:** Clear size differentiation for content structure
- **Readability:** High contrast ratios maintained

#### Layout Principles
- **Generous whitespace** for reduced cognitive load
- **Subtle card shadows** for depth without distraction
- **Rounded corners** for modern, friendly feel
- **Responsive design** optimized for desktop and mobile

### 4.2 User Experience Principles

#### Simplicity First
- Minimal form fields to reduce friction
- Clear, action-oriented CTAs
- Progressive disclosure of complex features

#### Speed & Efficiency
- Single-page workflows where possible
- Intelligent defaults and suggestions
- Quick access to historical data

#### Trust & Transparency
- Clear indication of AI research progress
- Source attribution where applicable
- Secure data handling messaging

## 5. Success Metrics

### 5.1 Primary KPIs
- **User Engagement:** Search completions per week
- **Content Quality:** User-reported interview success rate
- **Retention:** Weekly active users returning within 30 days
- **Efficiency:** Average time from search to practice start

### 5.2 Secondary Metrics
- **Feature Adoption:** Practice mode usage rate
- **Content Depth:** Questions practiced per session
- **Data Quality:** CV upload rate and parsing accuracy
- **Performance:** Search completion time under 30 seconds

## 6. Technical Constraints & Considerations

### 6.1 Performance Requirements
- **Search Response Time:** < 30 seconds for AI research
- **Page Load Time:** < 3 seconds on standard connections
- **Mobile Responsiveness:** Full functionality on devices 320px+

### 6.2 Scalability Considerations
- **Concurrent Users:** Support for 100+ simultaneous searches
- **Data Storage:** Efficient search result caching
- **API Rate Limits:** Graceful handling of OpenAI API constraints

### 6.3 Security & Privacy
- **Data Encryption:** All PII encrypted at rest and in transit
- **Access Control:** User-specific data isolation
- **Data Retention:** Clear policies for CV and search data

## 7. Future Roadmap

### Phase 2 Enhancements
- **AI Interview Coach:** Real-time feedback on practice answers
- **Community Features:** Anonymous sharing of interview experiences
- **Advanced Analytics:** Personal progress tracking and insights

### Phase 3 Considerations
- **Mobile App:** Native iOS/Android applications
- **Enterprise Features:** Team-based preparation workflows
- **Integration APIs:** Connect with job boards and ATS systems

## 8. Risk Assessment

### High-Priority Risks
- **AI Response Quality:** Inconsistent or inaccurate interview information
  - *Mitigation:* Human review processes, user feedback loops
- **API Dependencies:** OpenAI service interruptions
  - *Mitigation:* Fallback data sources, cached responses
- **Competitive Pressure:** Larger platforms adding similar features
  - *Mitigation:* Focus on niche market and superior UX

### Medium-Priority Risks
- **User Acquisition:** Difficulty reaching target audience
  - *Mitigation:* Community-driven growth, referral programs
- **Data Privacy Concerns:** User hesitation to upload CVs
  - *Mitigation:* Clear privacy policies, optional features

This document serves as the foundation for product decisions and should be updated as user feedback and market conditions evolve.
# TrustyConvert Frontend Integration Prompt

You are an expert frontend developer tasked with implementing a secure, high-performance file conversion platform called **TrustyConvert**. This project emphasizes privacy, speed, and trustworthiness.

## 🎯 Project Overview

TrustyConvert is a privacy-focused file conversion platform with the following characteristics:
- **Anonymous sessions** (no user accounts required)
- **24-hour session lifecycle** with automatic cleanup
- **Real-time conversion** with progress tracking
- **Secure download tokens** for file access
- **No file storage** - everything is temporary and cleaned up

## 🏗️ Technical Architecture

### Frontend Stack
- **Framework**: Astro v5.9.1 (static output mode)
- **Interactive Components**: React (minimal, island-based)
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: nanostores for global state
- **Data Fetching**: native fetch with @tanstack/react-query for React components
- **Type Safety**: TypeScript throughout

### Backend Integration
- **API Format**: Standardized JSON responses with `success` boolean and `data` object
- **Security**: Session cookies + CSRF tokens for all POST requests
- **File Handling**: Secure upload/download with temporary tokens
- **Session Management**: Redis-backed sessions with 24h TTL

## 🎨 Brand & Design System

### Color Palette
```css
:root {
  --color-primary: #4ECDC4;      /* Trust Teal - main brand */
  --color-secondary: #2C3E50;    /* Deep Navy - authority */
  --color-accent: #FF8C42;       /* Orange - speed/energy */
  --color-success: #28A745;      /* Green - confirmations */
  --color-warning: #DC3545;      /* Red - errors */
  --color-background: #FFFFFF;   /* Pure white */
  --color-surface: #F8F9FA;      /* Light gray */
  --color-text-secondary: #6C757D; /* Medium gray */
}
```

### Typography
- **Primary**: Inter (body text, clean and readable)
- **Headings**: Poppins (professional, modern)
- **Hierarchy**: H1(48px/600), H2(36px/500), H3(24px/500), Body(16px/400)

### UI Principles
- **Generous whitespace** for trust and clarity
- **8px spacing unit** (8, 16, 24, 32, 48, 64px)
- **Rounded corners**: 8px standard, 12px for cards
- **Subtle shadows**: 0 4px 6px rgba(0,0,0,0.1)
- **Outline icons** with 2px stroke weight

## 🔒 Security Implementation

### Session Flow
1. **Initialize**: `GET /session/init` → receive CSRF token
2. **Store**: CSRF in memory (nanostores), session ID in HttpOnly cookie
3. **Validate**: Include `X-CSRF-Token` header in all POST requests
4. **Cleanup**: Offer manual cleanup via `POST /session/close`

### API Response Format
```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T | { error: string; message: string };
}
```

## 📁 File Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── FileUpload.tsx   # React: drag-drop interface
│   ├── ConversionStatus.tsx # React: progress tracking
│   └── Header.astro     # Static navigation
├── lib/
│   ├── api.ts          # Fetch utilities with CSRF
│   ├── validation.ts   # File validation helpers
│   └── utils.ts        # General utilities
├── stores/
│   ├── session.ts      # Session state (nanostores)
│   └── conversion.ts   # Conversion job state
├── pages/
│   ├── index.astro     # Home page (main interface)
│   ├── download/[id].astro # Download result page
│   ├── privacy.astro   # Privacy policy
│   └── about.astro     # About page
└── styles/
    └── globals.css     # Tailwind + custom properties
```

## 🔄 Core User Flow

### 1. Session Initialization (Home Page Load)
```typescript
// Check for existing session, initialize if needed
if (!hasValidSession()) {
  const response = await fetch('/session/init');
  const { csrf_token } = response.data;
  sessionStore.set({ csrfToken: csrf_token, initialized: true });
}
```

### 2. File Upload Flow
```typescript
// Drag-and-drop or file picker
const handleUpload = async (file: File) => {
  const jobId = crypto.randomUUID();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('job_id', jobId);
  
  const response = await apiPost('/upload', formData);
  // Store job in IndexedDB for offline reference
};
```

### 3. Conversion Process
```typescript
// Queue conversion task
const startConversion = async (jobId: string, targetFormat: string) => {
  const response = await apiPost('/convert', { job_id: jobId, target_format: targetFormat });
  // Start polling for status updates
  pollJobStatus(jobId);
};
```

### 4. Download Flow
```typescript
// Generate secure download token
const downloadFile = async (jobId: string) => {
  const tokenResponse = await apiPost('/download_token', { job_id: jobId });
  const downloadUrl = `/download?token=${tokenResponse.data.download_token}`;
  window.open(downloadUrl, '_blank');
};
```

## 🎯 Page-Specific Requirements

### Home Page (`/`)
- **Hero Section**: Clear value proposition with trust signals
- **Upload Interface**: Drag-and-drop with file validation
- **Conversion Panel**: Format selection with preview
- **Progress Tracking**: Real-time status updates
- **Privacy Messaging**: Prominent "no storage" assurance

### Download Page (`/download/[id]`)
- **Status Display**: Job completion status
- **Download Button**: Secure token-based download
- **Error Handling**: Clear error messages and retry options
- **Auto-cleanup**: Session cleanup after successful download

### Static Pages
- **Privacy Policy**: Clear data handling explanation
- **About**: Company values and technical details
- **SEO Optimized**: Proper meta tags, structured data

## 💡 Key Features to Implement

### File Upload Component
- **Drag-and-drop zone** with visual feedback
- **File validation**: Size (100MB), type checking, MIME validation
- **Preview functionality** for supported formats
- **Progress indicators** during upload
- **Error handling** with clear user feedback

### Conversion Interface
- **Format selection** with visual icons
- **Conversion queue** showing multiple jobs
- **Real-time progress** with estimated time
- **Batch processing** support
- **Format recommendations** based on file type

### Trust & Privacy Elements
- **"No tracking" badge** in header
- **Processing indicators** showing local processing
- **Session timer** showing remaining time
- **Manual cleanup button** for privacy-conscious users
- **Transparent data flow** visualization

## 🚀 Performance Optimizations

### Code Splitting
- **Astro Islands**: Minimal React hydration
- **Lazy Loading**: Heavy components on demand
- **Service Worker**: Offline file validation
- **IndexedDB**: Client-side job history

### SEO Requirements
- **Meta tags**: Title, description, Open Graph
- **Structured data**: WebApplication schema
- **Semantic HTML**: Proper heading hierarchy
- **Core Web Vitals**: Optimize LCP, FID, CLS
- **Accessibility**: WCAG AA compliance

## 🎛️ State Management

### Session Store (nanostores)
```typescript
interface SessionState {
  csrfToken: string | null;
  sessionId: string | null;
  initialized: boolean;
  expiresAt: Date | null;
}
```

### Conversion Store
```typescript
interface ConversionJob {
  jobId: string;
  originalFilename: string;
  targetFormat: string;
  status: 'uploaded' | 'processing' | 'completed' | 'error';
  progress?: number;
  errorMessage?: string;
  completedAt?: Date;
}
```

## 🎨 Component Design Patterns

### Trust-Building Elements
- **Security badges** with subtle animations
- **Progress transparency** showing each step
- **Privacy reminders** at key interaction points
- **Professional typography** with generous spacing
- **Consistent color usage** reinforcing brand values

### Interactive Feedback
- **Hover states** with Trust Teal accents
- **Loading states** with branded spinners
- **Success confirmations** with gentle animations
- **Error states** with helpful recovery actions

## 📋 Implementation Checklist

### Core Functionality
- [ ] Session initialization and CSRF handling
- [ ] File upload with drag-and-drop
- [ ] Format selection and conversion queueing
- [ ] Real-time status polling
- [ ] Secure download token generation
- [ ] Manual session cleanup

### UI/UX
- [ ] Brand color implementation
- [ ] Typography hierarchy
- [ ] Responsive design (mobile-first)
- [ ] Accessibility compliance
- [ ] Loading and error states
- [ ] Trust signals and privacy messaging

### Performance
- [ ] Astro static generation
- [ ] Minimal React hydration
- [ ] Image optimization
- [ ] Code splitting
- [ ] Service worker caching

### SEO & Analytics
- [ ] Meta tags and Open Graph
- [ ] Structured data markup
- [ ] Sitemap generation
- [ ] Privacy-friendly analytics
- [ ] Core Web Vitals optimization

## 🔍 Testing Strategy

### Unit Tests (Vitest)
- API integration functions
- File validation logic
- State management stores
- Utility functions

### Integration Tests
- Complete conversion flow
- Session management
- Error handling scenarios
- Download token validation

### Performance Tests
- Core Web Vitals monitoring
- Bundle size analysis
- Runtime performance profiling
- Accessibility auditing

## 🚨 Critical Success Factors

1. **Privacy First**: Every feature must reinforce the privacy-focused brand
2. **Performance**: Fast load times and responsive interactions
3. **Trust Signals**: Clear, transparent communication about data handling
4. **Professional Polish**: Consistent design system implementation
5. **Accessibility**: WCAG AA compliance throughout
6. **Mobile Experience**: Touch-friendly, responsive design
7. **Error Resilience**: Graceful handling of all failure scenarios

Remember: This is a privacy-focused, professional tool. Every design decision should reinforce trust, transparency, and speed. The UI should feel authoritative yet approachable, with the technical complexity hidden behind a clean, confident interface.
# TrustyConvert Frontend Integration Prompts

## Prompt 1: Project Structure & Foundation Setup

You are tasked with setting up the foundation for TrustyConvert, a secure file conversion platform. Based on the provided documentation, you need to create the initial project structure using **Astro v5.9.1 (static output mode)** with **React** components for minimal interactivity.

### Requirements:

**Core Architecture:**

- Astro framework in static output mode
- React components only for interactive elements (upload, conversion status, download)
- Tailwind CSS + shadcn/ui for styling
- TypeScript throughout
- nanostores for state management
- @tanstack/react-query for API calls

**Project Structure to Create:**

```
/src
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── react/           # Interactive React components
│   └── astro/           # Static Astro components
├── lib/
│   ├── api.ts           # API client with CSRF handling
│   ├── types.ts         # TypeScript interfaces
│   ├── validation.ts    # File validation utilities
│   └── utils.ts         # General utilities
├── stores/
│   ├── session.ts       # Session & CSRF token store
│   └── upload.ts        # Upload state management
├── pages/
│   ├── index.astro      # Home page
│   ├── download/
│   │   └── [id].astro   # Download status page
│   ├── privacy.astro    # Privacy policy
│   └── about.astro      # About page
└── styles/
    └── globals.css      # Tailwind imports
```

**Key Implementation Details:**

1. **API Response Type (lib/types.ts):**

```typescript
interface ApiResponse<T> {
	success: boolean
	data: T
}

interface SessionInitResponse {
	csrf_token: string
}

interface UploadResponse {
	job_id: string
	status: string
}

interface JobStatusResponse {
	status: 'uploaded' | 'processing' | 'completed' | 'failed'
	error_message?: string
	completed_at?: string
}
```

2. **API Client (lib/api.ts):** Create a fetch wrapper that:

   - Automatically includes CSRF token in headers
   - Handles ApiResponse format
   - Manages session initialization
   - Provides type-safe methods for all endpoints

3. **Session Store (stores/session.ts):** Using nanostores:

   - Store CSRF token in memory only
   - Track session initialization status
   - Provide session cleanup function

4. **Home Page Structure (pages/index.astro):**
   - SEO-optimized static content
   - Single React island for file upload/conversion interface
   - Clear conversion flow explanation
   - Privacy and security highlights

**Security Requirements:**

- Never store CSRF tokens in localStorage/sessionStorage
- All API calls must include X-CSRF-Token header
- Session cookies handled automatically by browser
- Input validation on frontend before API calls

**Styling Guidelines:**

- Use Tailwind utility classes
- Implement shadcn/ui components for consistent UI
- Mobile-first responsive design
- Professional, clean aesthetic suitable for business use

**Deliverables:**

1. Complete project structure with all folders and files
2. Configured astro.config.mjs for static output
3. Basic layout component with navigation
4. Initial API client with session management
5. Type definitions for all API responses
6. Home page with placeholder for upload component

Please create the foundation with proper TypeScript types, basic styling setup, and the core API integration structure. Focus on creating a solid, scalable foundation that follows the security guidelines exactly as specified.

# TrustyConvert Frontend Integration Prompt Plan

This is a structured prompt plan to systematically integrate TrustyConvert's brand guidelines and technical requirements into your frontend codebase. Each prompt is designed to be actionable, focused, and easy for an AI assistant to execute.

## 🎯 Prompt Execution Order

### Phase 1: Foundation & Brand System
1. **Brand System Setup** - CSS variables, Tailwind config, typography
2. **UI Component Library** - shadcn/ui integration with brand colors
3. **Layout & Navigation** - Header, footer, page structure

### Phase 2: Core Functionality
4. **Session & State Management** - nanostores, API utilities
5. **File Upload System** - Drag-drop, validation, security
6. **Conversion Interface** - Status tracking, progress indicators

### Phase 3: Pages & Features
7. **Home Page Implementation** - Main conversion interface
8. **Download & Secondary Pages** - Download flow, static pages
9. **SEO & Performance** - Meta tags, optimization, accessibility

---

## 📋 PROMPT 1: Brand System Setup & Styling Foundation

### **Objective**: Establish the complete brand system, CSS variables, and Tailwind configuration

### **Current State Check**:
```typescript
// Ask the AI to check if these exist and are properly configured:
// 1. CSS custom properties for brand colors
// 2. Tailwind config with brand colors
// 3. Typography classes and font imports
// 4. Spacing and border radius utilities
```

### **Implementation Requirements**:

#### 1. Create/Update `src/styles/globals.css`:
```css
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

/* Import fonts */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Poppins:wght@500;600&display=swap');

/* Brand CSS Custom Properties */
:root {
  --color-primary: #4ECDC4;          /* Trust Teal */
  --color-secondary: #2C3E50;        /* Deep Navy */
  --color-accent: #FF8C42;           /* Orange */
  --color-success: #28A745;          /* Green */
  --color-warning: #DC3545;          /* Red */
  --color-background: #FFFFFF;       /* Pure White */
  --color-surface: #F8F9FA;          /* Light Gray */
  --color-text-secondary: #6C757D;   /* Medium Gray */
  
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-headings: 'Poppins', 'Inter', sans-serif;
  
  --border-radius: 8px;
  --border-radius-large: 12px;
  --spacing-unit: 8px;
  --shadow-subtle: 0 4px 6px rgba(0, 0, 0, 0.1);
}

/* Typography Classes */
.text-display { font-size: 48px; font-weight: 600; font-family: var(--font-headings); }
.text-h1 { font-size: 36px; font-weight: 500; font-family: var(--font-headings); }
.text-h2 { font-size: 24px; font-weight: 500; font-family: var(--font-headings); }
.text-body { font-size: 16px; font-weight: 400; font-family: var(--font-primary); }
.text-small { font-size: 14px; font-weight: 400; font-family: var(--font-primary); }
.text-caption { font-size: 12px; font-weight: 500; font-family: var(--font-primary); }
```

#### 2. Update `tailwind.config.mjs`:
```javascript
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: '#4ECDC4',
        secondary: '#2C3E50',
        accent: '#FF8C42',
        success: '#28A745',
        warning: '#DC3545',
        surface: '#F8F9FA',
        'text-secondary': '#6C757D',
      },
      fontFamily: {
        'primary': ['Inter', 'system-ui', 'sans-serif'],
        'headings': ['Poppins', 'Inter', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        'brand': '8px',
        'brand-large': '12px',
      },
      boxShadow: {
        'brand': '0 4px 6px rgba(0, 0, 0, 0.1)',
      }
    },
  },
  plugins: [],
}
```

#### 3. Create `src/lib/brand-constants.ts`:
```typescript
export const BRAND_COLORS = {
  primary: '#4ECDC4',
  secondary: '#2C3E50',
  accent: '#FF8C42',
  success: '#28A745',
  warning: '#DC3545',
} as const;

export const TYPOGRAPHY = {
  fontPrimary: 'Inter, system-ui, sans-serif',
  fontHeadings: 'Poppins, Inter, sans-serif',
  sizes: {
    display: '48px',
    h1: '36px',
    h2: '24px',
    body: '16px',
    small: '14px',
    caption: '12px',
  }
} as const;
```

### **Success Criteria**:
- [ ] All brand colors available in Tailwind classes
- [ ] Typography utilities working correctly
- [ ] Fonts loading properly
- [ ] CSS custom properties accessible
- [ ] Consistent spacing and border radius

---

## 📋 PROMPT 2: UI Component Library Integration

### **Objective**: Set up shadcn/ui components with TrustyConvert brand customization

### **Current State Check**:
```bash
# Ask AI to verify:
# 1. shadcn/ui installation and configuration
# 2. components.json exists and is configured
# 3. Brand-customized components exist
```

### **Implementation Requirements**:

#### 1. Install and configure shadcn/ui:
```bash
npx shadcn-ui@latest init
```

#### 2. Update `components.json` with brand colors:
```json
{
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.mjs",
    "css": "src/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "src/components/ui",
    "utils": "src/lib/utils"
  }
}
```

#### 3. Create brand-customized Button component (`src/components/ui/button.tsx`):
```typescript
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-brand text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-primary/90",
        secondary: "border-2 border-secondary text-secondary bg-transparent hover:bg-secondary hover:text-white",
        accent: "bg-accent text-white hover:bg-accent/90",
        success: "bg-success text-white hover:bg-success/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-6 py-2",
        sm: "h-9 rounded-brand px-3",
        lg: "h-11 rounded-brand px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

#### 4. Install core shadcn/ui components:
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add progress
npx shadcn-ui@latest add alert
npx shadcn-ui@latest add dialog
```

#### 5. Create brand-specific component variants (`src/components/ui/brand-components.tsx`):
```typescript
import { Badge } from "./badge"
import { Card } from "./card"
import { cn } from "@/lib/utils"

export const TrustBadge = ({ children, ...props }) => (
  <Badge 
    className={cn("bg-primary/10 text-primary border-primary/20", props.className)}
    {...props}
  >
    {children}
  </Badge>
)

export const BrandCard = ({ children, className, ...props }) => (
  <Card 
    className={cn("border-0 shadow-brand rounded-brand-large", className)}
    {...props}
  >
    {children}
  </Card>
)
```

### **Success Criteria**:
- [ ] shadcn/ui properly configured with brand colors
- [ ] Custom Button component with TrustyConvert styling
- [ ] Core UI components installed and customized
- [ ] Brand-specific component variants created
- [ ] All components follow 8px spacing unit

---

## 📋 PROMPT 3: Layout & Navigation Structure

### **Objective**: Create consistent page layouts, header, and navigation following brand guidelines

### **Current State Check**:
```typescript
// Ask AI to verify:
// 1. Layout components exist (Header, Footer, Layout)
// 2. Navigation follows brand guidelines
// 3. Responsive design is implemented
// 4. Trust signals are prominently displayed
```

### **Implementation Requirements**:

#### 1. Create `src/components/Header.astro`:
```astro
---
// Import statements
---

<header class="bg-white border-b border-surface sticky top-0 z-50">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between items-center h-16">
      <!-- Logo -->
      <div class="flex items-center">
        <a href="/" class="flex items-center space-x-3">
          <div class="w-8 h-8 bg-primary rounded-brand flex items-center justify-center">
            <span class="text-white font-bold text-lg">T</span>
          </div>
          <span class="text-display text-secondary">TrustyConvert</span>
        </a>
      </div>

      <!-- Trust Signal -->
      <div class="hidden md:flex items-center space-x-4">
        <div class="flex items-center space-x-2 text-sm text-text-secondary">
          <svg class="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"></path>
          </svg>
          <span>No files stored</span>
        </div>
        <div class="flex items-center space-x-2 text-sm text-text-secondary">
          <svg class="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"></path>
          </svg>
          <span>Lightning fast</span>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex items-center space-x-6">
        <a href="/about" class="text-body text-secondary hover:text-primary transition-colors">
          About
        </a>
        <a href="/privacy" class="text-body text-secondary hover:text-primary transition-colors">
          Privacy
        </a>
      </nav>
    </div>
  </div>
</header>
```

#### 2. Create `src/components/Footer.astro`:
```astro
<footer class="bg-surface border-t border-gray-200 mt-auto">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
      <!-- Brand Column -->
      <div class="col-span-1 md:col-span-2">
        <div class="flex items-center space-x-3 mb-4">
          <div class="w-8 h-8 bg-primary rounded-brand flex items-center justify-center">
            <span class="text-white font-bold text-lg">T</span>
          </div>
          <span class="text-h2 text-secondary">TrustyConvert</span>
        </div>
        <p class="text-body text-text-secondary max-w-md">
          Privacy-focused file conversion platform. No tracking, no storage, no hassle. 
          Your files stay yours.
        </p>
        
        <!-- Trust Signals -->
        <div class="mt-6 flex flex-wrap gap-4">
          <div class="flex items-center space-x-2 text-small text-text-secondary">
            <svg class="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
            </svg>
            <span>Secure Processing</span>
          </div>
          <div class="flex items-center space-x-2 text-small text-text-secondary">
            <svg class="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
            </svg>
            <span>Auto-cleanup</span>
          </div>
        </div>
      </div>

      <!-- Quick Links -->
      <div>
        <h3 class="text-body font-medium text-secondary mb-4">Platform</h3>
        <ul class="space-y-3">
          <li><a href="/about" class="text-small text-text-secondary hover:text-primary transition-colors">About</a></li>
          <li><a href="/privacy" class="text-small text-text-secondary hover:text-primary transition-colors">Privacy Policy</a></li>
          <li><a href="/terms" class="text-small text-text-secondary hover:text-primary transition-colors">Terms of Service</a></li>
        </ul>
      </div>

      <!-- Support -->
      <div>
        <h3 class="text-body font-medium text-secondary mb-4">Support</h3>
        <ul class="space-y-3">
          <li><a href="/help" class="text-small text-text-secondary hover:text-primary transition-colors">Help Center</a></li>
          <li><a href="/contact" class="text-small text-text-secondary hover:text-primary transition-colors">Contact</a></li>
          <li><a href="/status" class="text-small text-text-secondary hover:text-primary transition-colors">System Status</a></li>
        </ul>
      </div>
    </div>

    <!-- Bottom Bar -->
    <div class="mt-12 pt-8 border-t border-gray-200">
      <div class="flex flex-col md:flex-row justify-between items-center">
        <p class="text-small text-text-secondary">
          © 2025 TrustyConvert. Built with privacy by design.
        </p>
        <div class="mt-4 md:mt-0 flex items-center space-x-4">
          <span class="text-small text-text-secondary">Powered by open source</span>
        </div>
      </div>
    </div>
  </div>
</footer>
```

#### 3. Create `src/layouts/Layout.astro`:
```astro
---
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';

export interface Props {
  title: string;
  description?: string;
  canonicalURL?: string;
}

const { title, description = "Privacy-focused file conversion platform", canonicalURL } = Astro.props;
---

<!DOCTYPE html>
<html lang="en" class="h-full">
  <head>
    <meta charset="UTF-8" />
    <meta name="description" content={description} />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="generator" content={Astro.generator} />
    <title>{title}</title>
    
    <!-- Preconnect to optimize font loading -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    
    <!-- Canonical URL -->
    {canonicalURL && <link rel="canonical" href={canonicalURL} />}
    
    <!-- Open Graph -->
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:type" content="website" />
    
    <!-- Additional meta tags for trustworthiness -->
    <meta name="robots" content="index, follow" />
    <meta name="theme-color" content="#4ECDC4" />
  </head>
  <body class="h-full flex flex-col bg-white text-secondary">
    <Header />
    <main class="flex-1">
      <slot />
    </main>
    <Footer />
  </body>
</html>
```

### **Success Criteria**:
- [ ] Header with logo, navigation, and trust signals
- [ ] Footer with brand messaging and links
- [ ] Layout component with proper meta tags
- [ ] Mobile-responsive design
- [ ] Trust signals prominently displayed
- [ ] Consistent spacing using 8px units

---

## 📋 PROMPT 4: Session & State Management Setup

### **Objective**: Implement secure session management and global state using nanostores

### **Current State Check**:
```typescript
// Ask AI to verify:
// 1. nanostores is installed and configured
// 2. Session store exists with proper typing
// 3. API utilities with CSRF token handling exist
// 4. Error handling and validation utilities exist
```

### **Implementation Requirements**:

#### 1. Install dependencies:
```bash
npm install nanostores @nanostores/react
npm install @tanstack/react-query # for React components
```

#### 2. Create `src/stores/session.ts`:
```typescript
import { atom, map } from 'nanostores'

export interface SessionState {
  csrfToken: string | null
  sessionId: string | null
  initialized: boolean
  expiresAt: Date | null
  isValid: boolean
}

export const sessionStore = map<SessionState>({
  csrfToken: null,
  sessionId: null,
  initialized: false,
  expiresAt: null,
  isValid: false,
})

// Helper atoms
export const isSessionValid = atom<boolean>(false)

// Update session validity when store changes
sessionStore.subscribe((session) => {
  const valid = session.initialized && 
                session.csrfToken !== null && 
                session.expiresAt !== null && 
                new Date() < session.expiresAt
  
  isSessionValid.set(valid)
})

// Session helpers
export const initializeSession = (csrfToken: string) => {
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 24) // 24h TTL
  
  sessionStore.setKey('csrfToken', csrfToken)
  sessionStore.setKey('initialized', true)
  sessionStore.setKey('expiresAt', expiresAt)
  sessionStore.setKey('isValid', true)
}

export const clearSession = () => {
  sessionStore.set({
    csrfToken: null,
    sessionId: null,
    initialized: false,
    expiresAt: null,
    isValid: false,
  })
}

export const getCSRFToken = (): string | null => {
  return sessionStore.get().csrfToken
}
```

#### 3. Create `src/stores/conversion.ts`:
```typescript
import { map, atom } from 'nanostores'

export interface ConversionJob {
  jobId: string
  originalFilename: string
  fileSize: number
  targetFormat: string
  status: 'uploaded' | 'processing' | 'completed' | 'error'
  progress?: number
  taskId?: string
  errorMessage?: string
  createdAt: Date
  completedAt?: Date
  downloadToken?: string
}

export const conversionJobs = map<Record<string, ConversionJob>>({})
export const activeJobId = atom<string | null>(null)

// Helper functions
export const addJob = (job: ConversionJob) => {
  conversionJobs.setKey(job.jobId, job)
}

export const updateJob = (jobId: string, updates: Partial<ConversionJob>) => {
  const existingJob = conversionJobs.get()[jobId]
  if (existingJob) {
    conversionJobs.setKey(jobId, { ...existingJob, ...updates })
  }
}

export const getJob = (jobId: string): ConversionJob | undefined => {
  return conversionJobs.get()[jobId]
}

export const removeJob = (jobId: string) => {
  const jobs = { ...conversionJobs.get() }
  delete jobs[jobId]
  conversionJobs.set(jobs)
}

export const setActiveJob = (jobId: string | null) => {
  activeJobId.set(jobId)
}

export const getActiveJob = (): ConversionJob | null => {
  const activeId = activeJobId.get()
  return activeId ? getJob(activeId) || null : null
}

// Clear all jobs
export const clearAllJobs = () => {
  conversionJobs.set({})
  activeJobId.set(null)
}
```

#### 4. Create `src/lib/api.ts`:
```typescript
import { getCSRFToken } from '../stores/session'

export interface ApiResponse<T = any> {
  success: boolean
  data: T | { error: string; message: string }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errorCode?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Base fetch wrapper with CSRF token handling
export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = endpoint.startsWith('http') ? endpoint : `/api${endpoint}`
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  // Add CSRF token for non-GET requests
  if (options.method && options.method !== 'GET') {
    const csrfToken = getCSRFToken()
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'same-origin', // Include session cookie
    })

    if (!response.ok) {
      throw new ApiError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status
      )
    }

    const data: ApiResponse<T> = await response.json()
    
    if (!data.success) {
      const errorData = data.data as { error: string; message: string }
      throw new ApiError(
        errorData.message || 'API request failed',
        response.status,
        errorData.error
      )
    }

    return data
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError('Network error occurred', 0)
  }
}

// Convenience methods
export const apiGet = <T = any>(endpoint: string): Promise<ApiResponse<T>> =>
  apiFetch<T>(endpoint, { method: 'GET' })

export const apiPost = <T = any>(
  endpoint: string,
  data?: any
): Promise<ApiResponse<T>> => {
  const options: RequestInit = { method: 'POST' }
  
  if (data instanceof FormData) {
    options.body = data
    // Don't set Content-Type for FormData, let browser handle it
  } else if (data) {
    options.body = JSON.stringify(data)
  }
  
  return apiFetch<T>(endpoint, options)
}

export const apiDelete = <T = any>(endpoint: string): Promise<ApiResponse<T>> =>
  apiFetch<T>(endpoint, { method: 'DELETE' })

// Session management API calls
export const initSession = async (): Promise<string> => {
  const response = await apiGet<{ csrf_token: string }>('/session/init')
  return response.data.csrf_token
}

export const closeSession = async (): Promise<void> => {
  await apiPost('/session/close')
}
```

#### 5. Create `src/lib/validation.ts`:
```typescript
export const SUPPORTED_FORMATS = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff'],
  document: ['pdf', 'doc', 'docx', 'odt', 'rtf', 'txt'],
  spreadsheet: ['xls', 'xlsx', 'ods', 'csv'],
  presentation: ['ppt', 'pptx', 'odp'],
} as const

export const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

export interface FileValidationResult {
  valid: boolean
  error?: string
  fileType?: keyof typeof SUPPORTED_FORMATS
  suggestedFormats?: string[]
}

export function validateFile(file: File): FileValidationResult {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size (${formatFileSize(file.size)}) exceeds the 100MB limit.`
    }
  }

  // Check if file has extension
  const extension = getFileExtension(file.name)
  if (!extension) {
    return {
      valid: false,
      error: 'File must have a valid extension.'
    }
  }

  // Check if format is supported
  const fileType = getFileType(extension)
  if (!fileType) {
    return {
      valid: false,
      error: `File format '.${extension}' is not supported.`
    }
  }

  // Get suggested conversion formats
  const suggestedFormats = getSuggestedFormats(fileType, extension)

  return {
    valid: true,
    fileType,
    suggestedFormats
  }
}

export function getFileExtension(filename: string): string | null {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1 || lastDot === filename.length - 1) {
    return null
  }
  return filename.slice(lastDot + 1).toLowerCase()
}

export function getFileType(extension: string): keyof typeof SUPPORTED_FORMATS | null {
  for (const [type, extensions] of Object.entries(SUPPORTED_FORMATS)) {
    if (extensions.includes(extension as any)) {
      return type as keyof typeof SUPPORTED_FORMATS
    }
  }
  return null
}

export function getSuggestedFormats(
  fileType: keyof typeof SUPPORTED_FORMATS,
  currentExtension: string
): string[] {
  const allFormats = SUPPORTED_FORMATS[fileType]
  return allFormats.filter(format => format !== currentExtension
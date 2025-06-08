_**User**_

Great job! How will we setup the tailwind and the ui libraries systematically so we use the most SEO performant utilities where needed. We need a structure so all the pages and components follows the same style. How can we setup such structure in our frontend? We want a SEO-first website but with certain components (like the fileupload component for e.g) being reactive. Please come up with a full plan that is up to date and follows the ASTRO documentation recommendations. Please go ahead and setup a plan carefully that fits our project and goals.

---

_**Assistant**_

I'll help you create a systematic structure for our Astro + Tailwind + UI components setup that prioritizes SEO while maintaining reactivity where needed. Let's break this down into a comprehensive plan:

1. **Project Structure Optimization**
   First, let's organize our project structure to better separate concerns:

```
src/
├── components/
│   ├── ui/           # Reusable UI components (shadcn/ui)
│   ├── common/       # Shared components (header, footer, etc.)
│   ├── features/     # Feature-specific components (FileUpload, etc.)
│   └── seo/          # SEO-related components
├── layouts/
│   ├── MainLayout.astro
│   └── BaseLayout.astro
├── styles/
│   ├── global.css    # Global styles
│   ├── tokens.css    # Design tokens
│   └── utilities.css # Custom utilities
├── lib/
│   ├── ui/          # UI utilities
│   ├── hooks/       # React hooks
│   └── utils/       # General utilities
└── pages/
    ├── index.astro
    └── [...slug].astro
```

2. **Component Strategy**
   Let's categorize our components based on their needs:

A. **Static Components (Astro)**

- SEO components
- Layout components
- Static UI elements
- Navigation
- Footer
- Static content sections

B. **Interactive Components (React)**

- FileUpload
- ModeToggle
- Form elements
- Interactive UI elements

3. **Implementation Plan**

Let me start by setting up the core configuration files:

---

```diff
  // @ts-check
  import { defineConfig } from 'astro/config';
- import tailwindcss from '@tailwindcss/vite';
- import sitemapPlugin from '@astrojs/sitemap';
-
  import react from '@astrojs/react';
+ import tailwind from '@astrojs/tailwind';
+ import sitemap from '@astrojs/sitemap';

  // https://astro.build/config
  export default defineConfig({
-   site: "https://trustyconvert.com", // <-- Set your real production domain here!
+   site: 'https://trustyconvert.com',
+   integrations: [
+     react({
+       // Only hydrate components that need interactivity
+       include: ['**/features/**/*', '**/ui/**/*'],
+       // Exclude static components
+       exclude: ['**/common/**/*', '**/seo/**/*'],
+     }),
+     tailwind({
+       // Apply Tailwind to all files
+       applyBaseStyles: false,
+     }),
+     sitemap({
+       // Generate sitemap for better SEO
+       changefreq: 'weekly',
+       priority: 0.7,
+       lastmod: new Date(),
+     }),
+   ],
+   output: 'hybrid', // Enable static and server rendering
+   compressHTML: true, // Compress HTML output
+   build: {
+     inlineStylesheets: 'auto', // Optimize CSS delivery
+   },
    vite: {
-     plugins: [tailwindcss()],
-     server: {
-       proxy: {
-         '/api': 'http://127.0.0.1:8000'
-       }
-     }
+     build: {
+       cssMinify: true, // Minify CSS
+       rollupOptions: {
+         output: {
+           manualChunks: {
+             // Split vendor chunks for better caching
+             'react-vendor': ['react', 'react-dom'],
+             'ui-vendor': ['@radix-ui/react-*'],
+           },
+         },
+       },
+     },
    },
-
-   integrations: [react(), sitemapPlugin()]
  });
```

---

Now, let's set up our Tailwind configuration with a systematic approach to utilities:

---

```diff
-
+ /** @type {import('tailwindcss').Config} */
+ export default {
+   content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
+   darkMode: ['class', '[data-theme="dark"]'],
+   theme: {
+     container: {
+       center: true,
+       padding: {
+         DEFAULT: '1rem',
+         sm: '2rem',
+         lg: '4rem',
+         xl: '5rem',
+         '2xl': '6rem',
+       },
+     },
+     extend: {
+       colors: {
+         border: 'hsl(var(--border))',
+         input: 'hsl(var(--input))',
+         ring: 'hsl(var(--ring))',
+         background: 'hsl(var(--background))',
+         foreground: 'hsl(var(--foreground))',
+         primary: {
+           DEFAULT: 'hsl(var(--primary))',
+           foreground: 'hsl(var(--primary-foreground))',
+         },
+         secondary: {
+           DEFAULT: 'hsl(var(--secondary))',
+           foreground: 'hsl(var(--secondary-foreground))',
+         },
+         destructive: {
+           DEFAULT: 'hsl(var(--destructive))',
+           foreground: 'hsl(var(--destructive-foreground))',
+         },
+         muted: {
+           DEFAULT: 'hsl(var(--muted))',
+           foreground: 'hsl(var(--muted-foreground))',
+         },
+         accent: {
+           DEFAULT: 'hsl(var(--accent))',
+           foreground: 'hsl(var(--accent-foreground))',
+         },
+         popover: {
+           DEFAULT: 'hsl(var(--popover))',
+           foreground: 'hsl(var(--popover-foreground))',
+         },
+         card: {
+           DEFAULT: 'hsl(var(--card))',
+           foreground: 'hsl(var(--card-foreground))',
+         },
+       },
+       borderRadius: {
+         lg: 'var(--radius)',
+         md: 'calc(var(--radius) - 2px)',
+         sm: 'calc(var(--radius) - 4px)',
+       },
+       keyframes: {
+         'accordion-down': {
+           from: { height: '0' },
+           to: { height: 'var(--radix-accordion-content-height)' },
+         },
+         'accordion-up': {
+           from: { height: 'var(--radix-accordion-content-height)' },
+           to: { height: '0' },
+         },
+         fadeIn: {
+           from: { opacity: '0' },
+           to: { opacity: '1' },
+         },
+       },
+       animation: {
+         'accordion-down': 'accordion-down 0.2s ease-out',
+         'accordion-up': 'accordion-up 0.2s ease-out',
+         fadeIn: 'fadeIn 0.3s ease-in forwards',
+       },
+       typography: {
+         DEFAULT: {
+           css: {
+             maxWidth: '65ch',
+             color: 'hsl(var(--foreground))',
+             '[class~="lead"]': {
+               color: 'hsl(var(--muted-foreground))',
+             },
+             a: {
+               color: 'hsl(var(--primary))',
+               '&:hover': {
+                 color: 'hsl(var(--primary-foreground))',
+               },
+             },
+             strong: {
+               color: 'hsl(var(--foreground))',
+             },
+             'ol > li::marker': {
+               color: 'hsl(var(--muted-foreground))',
+             },
+             'ul > li::marker': {
+               color: 'hsl(var(--muted-foreground))',
+             },
+             hr: {
+               borderColor: 'hsl(var(--border))',
+             },
+             blockquote: {
+               color: 'hsl(var(--muted-foreground))',
+               borderLeftColor: 'hsl(var(--border))',
+             },
+             h1: {
+               color: 'hsl(var(--foreground))',
+             },
+             h2: {
+               color: 'hsl(var(--foreground))',
+             },
+             h3: {
+               color: 'hsl(var(--foreground))',
+             },
+             h4: {
+               color: 'hsl(var(--foreground))',
+             },
+             'figure figcaption': {
+               color: 'hsl(var(--muted-foreground))',
+             },
+             code: {
+               color: 'hsl(var(--foreground))',
+             },
+             pre: {
+               color: 'hsl(var(--foreground))',
+               backgroundColor: 'hsl(var(--muted))',
+             },
+             thead: {
+               color: 'hsl(var(--foreground))',
+               borderBottomColor: 'hsl(var(--border))',
+             },
+             'tbody tr': {
+               borderBottomColor: 'hsl(var(--border))',
+             },
+           },
+         },
+       },
+     },
+   },
+   plugins: [
+     require('@tailwindcss/typography'),
+     require('@tailwindcss/forms'),
+     require('@tailwindcss/aspect-ratio'),
+   ],
+ };
```

---

Now, let's create a base styles file that will define our design tokens and global styles:

---

```diff
-
+ @layer base {
+   :root {
+     --background: 0 0% 100%;
+     --foreground: 240 10% 3.9%;
+     --card: 0 0% 100%;
+     --card-foreground: 240 10% 3.9%;
+     --popover: 0 0% 100%;
+     --popover-foreground: 240 10% 3.9%;
+     --primary: 240 5.9% 10%;
+     --primary-foreground: 0 0% 98%;
+     --secondary: 240 4.8% 95.9%;
+     --secondary-foreground: 240 5.9% 10%;
+     --muted: 240 4.8% 95.9%;
+     --muted-foreground: 240 3.8% 46.1%;
+     --accent: 240 4.8% 95.9%;
+     --accent-foreground: 240 5.9% 10%;
+     --destructive: 0 84.2% 60.2%;
+     --destructive-foreground: 0 0% 98%;
+     --border: 240 5.9% 90%;
+     --input: 240 5.9% 90%;
+     --ring: 240 5.9% 10%;
+     --radius: 0.5rem;
+   }
+
+   .dark {
+     --background: 240 10% 3.9%;
+     --foreground: 0 0% 98%;
+     --card: 240 10% 3.9%;
+     --card-foreground: 0 0% 98%;
+     --popover: 240 10% 3.9%;
+     --popover-foreground: 0 0% 98%;
+     --primary: 0 0% 98%;
+     --primary-foreground: 240 5.9% 10%;
+     --secondary: 240 3.7% 15.9%;
+     --secondary-foreground: 0 0% 98%;
+     --muted: 240 3.7% 15.9%;
+     --muted-foreground: 240 5% 64.9%;
+     --accent: 240 3.7% 15.9%;
+     --accent-foreground: 0 0% 98%;
+     --destructive: 0 62.8% 30.6%;
+     --destructive-foreground: 0 0% 98%;
+     --border: 240 3.7% 15.9%;
+     --input: 240 3.7% 15.9%;
+     --ring: 240 4.9% 83.9%;
+   }
+ }
+
+ /* Base styles for better typography and accessibility */
+ @layer base {
+   * {
+     @apply border-border;
+   }
+
+   body {
+     @apply bg-background text-foreground antialiased;
+     font-feature-settings: "rlig" 1, "calt" 1;
+   }
+
+   /* Improve heading hierarchy for SEO */
+   h1 {
+     @apply text-4xl font-bold tracking-tight lg:text-5xl;
+   }
+
+   h2 {
+     @apply text-3xl font-semibold tracking-tight;
+   }
+
+   h3 {
+     @apply text-2xl font-semibold tracking-tight;
+   }
+
+   h4 {
+     @apply text-xl font-semibold tracking-tight;
+   }
+
+   /* Improve link accessibility */
+   a {
+     @apply text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2;
+   }
+
+   /* Improve form element accessibility */
+   input, select, textarea {
+     @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2;
+   }
+
+   /* Improve button accessibility */
+   button {
+     @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2;
+   }
+ }
+
+ /* Utility classes for common patterns */
+ @layer utilities {
+   .text-balance {
+     text-wrap: balance;
+   }
+
+   .text-pretty {
+     text-wrap: pretty;
+   }
+
+   .scroll-mt-16 {
+     scroll-margin-top: 4rem;
+   }
+ }
```

---

Now, let's update our global styles to import our tokens and set up the base styles:

---

```diff
- @import 'tailwindcss';
- @import "tw-animate-css";
-
- @custom-variant dark (&:is(.dark *));
-
- @theme inline {
-   --radius-sm: calc(var(--radius) - 4px);
-   --radius-md: calc(var(--radius) - 2px);
-   --radius-lg: var(--radius);
-   --radius-xl: calc(var(--radius) + 4px);
-   --color-background: var(--background);
-   --color-foreground: var(--foreground);
-   --color-card: var(--card);
-   --color-card-foreground: var(--card-foreground);
-   --color-popover: var(--popover);
-   --color-popover-foreground: var(--popover-foreground);
-   --color-primary: var(--primary);
-   --color-primary-foreground: var(--primary-foreground);
-   --color-secondary: var(--secondary);
-   --color-secondary-foreground: var(--secondary-foreground);
-   --color-muted: var(--muted);
-   --color-muted-foreground: var(--muted-foreground);
-   --color-accent: var(--accent);
-   --color-accent-foreground: var(--accent-foreground);
-   --color-destructive: var(--destructive);
-   --color-border: var(--border);
-   --color-input: var(--input);
-   --color-ring: var(--ring);
-   --color-chart-1: var(--chart-1);
-   --color-chart-2: var(--chart-2);
-   --color-chart-3: var(--chart-3);
-   --color-chart-4: var(--chart-4);
-   --color-chart-5: var(--chart-5);
-   --color-sidebar: var(--sidebar);
-   --color-sidebar-foreground: var(--sidebar-foreground);
-   --color-sidebar-primary: var(--sidebar-primary);
-   --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
-   --color-sidebar-accent: var(--sidebar-accent);
-   --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
-   --color-sidebar-border: var(--sidebar-border);
-   --color-sidebar-ring: var(--sidebar-ring);
- }
-
- :root {
-   --radius: 0.625rem;
-   --background: oklch(1 0 0);
-   --foreground: oklch(0.147 0.004 49.25);
-   --card: oklch(1 0 0);
-   --card-foreground: oklch(0.147 0.004 49.25);
-   --popover: oklch(1 0 0);
-   --popover-foreground: oklch(0.147 0.004 49.25);
-   --primary: oklch(0.216 0.006 56.043);
-   --primary-foreground: oklch(0.985 0.001 106.423);
-   --secondary: oklch(0.97 0.001 106.424);
-   --secondary-foreground: oklch(0.216 0.006 56.043);
-   --muted: oklch(0.97 0.001 106.424);
-   --muted-foreground: oklch(0.553 0.013 58.071);
-   --accent: oklch(0.97 0.001 106.424);
-   --accent-foreground: oklch(0.216 0.006 56.043);
-   --destructive: oklch(0.577 0.245 27.325);
-   --border: oklch(0.923 0.003 48.717);
-   --input: oklch(0.923 0.003 48.717);
-   --ring: oklch(0.709 0.01 56.259);
-   --chart-1: oklch(0.646 0.222 41.116);
-   --chart-2: oklch(0.6 0.118 184.704);
-   --chart-3: oklch(0.398 0.07 227.392);
-   --chart-4: oklch(0.828 0.189 84.429);
-   --chart-5: oklch(0.769 0.188 70.08);
-   --sidebar: oklch(0.985 0.001 106.423);
-   --sidebar-foreground: oklch(0.147 0.004 49.25);
-   --sidebar-primary: oklch(0.216 0.006 56.043);
-   --sidebar-primary-foreground: oklch(0.985 0.001 106.423);
-   --sidebar-accent: oklch(0.97 0.001 106.424);
-   --sidebar-accent-foreground: oklch(0.216 0.006 56.043);
-   --sidebar-border: oklch(0.923 0.003 48.717);
-   --sidebar-ring: oklch(0.709 0.01 56.259);
- }
-
- .dark {
-   --background: oklch(0.147 0.004 49.25);
-   --foreground: oklch(0.985 0.001 106.423);
-   --card: oklch(0.216 0.006 56.043);
-   --card-foreground: oklch(0.985 0.001 106.423);
-   --popover: oklch(0.216 0.006 56.043);
-   --popover-foreground: oklch(0.985 0.001 106.423);
-   --primary: oklch(0.923 0.003 48.717);
-   --primary-foreground: oklch(0.216 0.006 56.043);
-   --secondary: oklch(0.268 0.007 34.298);
-   --secondary-foreground: oklch(0.985 0.001 106.423);
-   --muted: oklch(0.268 0.007 34.298);
-   --muted-foreground: oklch(0.709 0.01 56.259);
-   --accent: oklch(0.268 0.007 34.298);
-   --accent-foreground: oklch(0.985 0.001 106.423);
-   --destructive: oklch(0.704 0.191 22.216);
-   --border: oklch(1 0 0 / 10%);
-   --input: oklch(1 0 0 / 15%);
-   --ring: oklch(0.553 0.013 58.071);
-   --chart-1: oklch(0.488 0.243 264.376);
-   --chart-2: oklch(0.696 0.17 162.48);
-   --chart-3: oklch(0.769 0.188 70.08);
-   --chart-4: oklch(0.627 0.265 303.9);
-   --chart-5: oklch(0.645 0.246 16.439);
-   --sidebar: oklch(0.216 0.006 56.043);
-   --sidebar-foreground: oklch(0.985 0.001 106.423);
-   --sidebar-primary: oklch(0.488 0.243 264.376);
-   --sidebar-primary-foreground: oklch(0.985 0.001 106.423);
-   --sidebar-accent: oklch(0.268 0.007 34.298);
-   --sidebar-accent-foreground: oklch(0.985 0.001 106.423);
-   --sidebar-border: oklch(1 0 0 / 10%);
-   --sidebar-ring: oklch(0.553 0.013 58.071);
- }
-
- @layer base {
-   * {
-     @apply border-border outline-ring/50;
-   }
-
-   body {
-     @apply bg-background text-foreground;
+ @import 'tailwindcss/base';
+ @import 'tailwindcss/components';
+ @import 'tailwindcss/utilities';
+ @import './tokens.css';
+
+ /* Global styles that apply to all pages */
+ @layer base {
+   /* Improve text rendering */
+   html {
+     -webkit-font-smoothing: antialiased;
+     -moz-osx-font-smoothing: grayscale;
+     text-rendering: optimizeLegibility;
+   }
+
+   /* Improve scrolling */
+   html {
+     scroll-behavior: smooth;
+     scroll-padding-top: 4rem;
+   }
+
+   /* Improve focus styles for accessibility */
+   :focus-visible {
+     @apply outline-none ring-2 ring-ring ring-offset-2 ring-offset-background;
+   }
+
+   /* Improve selection styles */
+   ::selection {
+     @apply bg-primary/20 text-primary;
+   }
+
+   /* Improve loading states */
+   .loading {
+     @apply animate-pulse bg-muted;
+   }
+
+   /* Improve transitions */
+   .transition-all {
+     @apply transition-[all] duration-200 ease-in-out;
+   }
+
+   /* Improve image loading */
+   img {
+     @apply select-none;
+   }
+
+   /* Improve form styles */
+   input[type="search"] {
+     -webkit-appearance: none;
+   }
+
+   /* Improve button styles */
+   button {
+     @apply select-none;
+   }
+ }
+
+ /* Component-specific styles */
+ @layer components {
+   /* Card styles */
+   .card {
+     @apply rounded-lg border bg-card text-card-foreground shadow-sm;
+   }
+
+   /* Button styles */
+   .btn {
+     @apply inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50;
+   }
+
+   .btn-primary {
+     @apply bg-primary text-primary-foreground hover:bg-primary/90;
+   }
+
+   .btn-secondary {
+     @apply bg-secondary text-secondary-foreground hover:bg-secondary/80;
+   }
+
+   /* Form styles */
+   .form-input {
+     @apply flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50;
+   }
+
+   .form-label {
+     @apply text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70;
+   }
+
+   /* Alert styles */
+   .alert {
+     @apply relative w-full rounded-lg border p-4;
+   }
+
+   .alert-info {
+     @apply bg-primary/10 text-primary;
+   }
+
+   .alert-error {
+     @apply bg-destructive/10 text-destructive;
+   }
+ }
+
+ /* Animation utilities */
+ @layer utilities {
+   .animate-in {
+     animation-duration: 0.2s;
+     animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
+   }
+
+   .fade-in {
+     animation-name: fadeIn;
+   }
+
+   .slide-in-from-bottom {
+     animation-name: slideInFromBottom;
+   }
+
+   @keyframes fadeIn {
+     from {
+       opacity: 0;
+     }
+     to {
+       opacity: 1;
+     }
+   }
+
+   @keyframes slideInFromBottom {
+     from {
+       transform: translateY(100%);
+     }
+     to {
+       transform: translateY(0);
+     }
    }
  }
```

---

Now that we have our base styles set up, let's create a component strategy document to help guide our development:

---

````diff
-
+ # Component Strategy
+
+ This document outlines our approach to building components in our Astro project, focusing on SEO, performance, and maintainability.
+
+ ## Component Categories
+
+ ### 1. Static Components (Astro)
+ Use Astro components for static content that doesn't require interactivity. These components are rendered at build time and have zero JavaScript overhead.
+
+ **When to use:**
+ - Layout components (headers, footers, navigation)
+ - Static content sections
+ - SEO-critical content
+ - Hero sections
+ - Feature highlights
+ - Static forms (contact forms, newsletter signups)
+
+ **Example:**
+ ```astro
+ ---
+ // src/components/FeatureCard.astro
+ ---
+ <div class="card p-6">
+   <h3 class="text-lg font-semibold">{Astro.props.title}</h3>
+   <p class="mt-2 text-muted-foreground">{Astro.props.description}</p>
+ </div>
+ ```
+
+ ### 2. Interactive Components (React)
+ Use React components only when interactivity is required. These components are hydrated on the client side.
+
+ **When to use:**
+ - File upload components
+ - Interactive forms
+ - Dynamic content that requires state
+ - Components with user interactions
+ - Real-time updates
+
+ **Example:**
+ ```tsx
+ // src/components/FileUpload.tsx
+ 'use client';
+
+ export function FileUpload() {
+   // Interactive logic here
+   return (
+     <div className="card">
+       {/* Interactive UI */}
+     </div>
+   );
+ }
+ ```
+
+ ## Hydration Strategies
+
+ ### 1. No Hydration (`client:false`)
+ Default for Astro components. No JavaScript is sent to the client.
+
+ ### 2. Visible Hydration (`client:visible`)
+ Hydrate when the component becomes visible in the viewport.
+
+ **Use for:**
+ - Components below the fold
+ - Non-critical interactive elements
+ - Components that don't need immediate interactivity
+
+ ### 3. Load Hydration (`client:load`)
+ Hydrate immediately when the page loads.
+
+ **Use for:**
+ - Critical interactive components
+ - Components needed for initial user interaction
+ - Components that affect core functionality
+
+ ### 4. Idle Hydration (`client:idle`)
+ Hydrate when the browser is idle.
+
+ **Use for:**
+ - Non-critical interactive components
+ - Components that can wait for user interaction
+ - Secondary features
+
+ ## Performance Guidelines
+
+ 1. **Lazy Loading**
+    - Use `client:visible` for below-the-fold components
+    - Implement lazy loading for images and heavy assets
+    - Use dynamic imports for large components
+
+ 2. **Code Splitting**
+    - Keep component files small and focused
+    - Use dynamic imports for large features
+    - Split vendor chunks appropriately
+
+ 3. **Asset Optimization**
+    - Use responsive images with `srcset`
+    - Implement proper image formats (WebP)
+    - Optimize SVGs
+    - Use font subsetting
+
+ 4. **State Management**
+    - Use React hooks for component-level state
+    - Implement context for shared state
+    - Avoid global state when possible
+
+ ## SEO Guidelines
+
+ 1. **Semantic HTML**
+    - Use proper heading hierarchy
+    - Implement ARIA labels
+    - Use semantic HTML elements
+    - Include proper meta tags
+
+ 2. **Structured Data**
+    - Implement JSON-LD for rich snippets
+    - Use proper schema.org markup
+    - Include social media meta tags
+
+ 3. **Performance**
+    - Optimize Core Web Vitals
+    - Implement proper caching
+    - Use proper image optimization
+    - Minimize JavaScript
+
+ ## Component Library
+
+ ### Base Components
+ - `Button` - Interactive button component
+ - `Card` - Container for content
+ - `Input` - Form input component
+ - `Select` - Dropdown component
+ - `Alert` - Notification component
+
+ ### Layout Components
+ - `MainLayout` - Main page layout
+ - `Header` - Site header
+ - `Footer` - Site footer
+ - `Container` - Content container
+
+ ### Feature Components
+ - `FileUpload` - File upload component
+ - `FileList` - List of uploaded files
+ - `ProgressBar` - Upload progress
+ - `StatusBadge` - Status indicator
+
+ ## Best Practices
+
+ 1. **Component Structure**
+    ```tsx
+    // Component organization
+    components/
+      ui/           // Base UI components
+      features/     // Feature-specific components
+      layouts/      // Layout components
+      shared/       // Shared components
+    ```
+
+ 2. **Naming Conventions**
+    - Use PascalCase for component names
+    - Use kebab-case for file names
+    - Prefix shared components with appropriate category
+
+ 3. **Props Interface**
+    ```tsx
+    interface ComponentProps {
+      // Required props
+      requiredProp: string;
+      // Optional props with defaults
+      optionalProp?: string;
+      // Event handlers
+      onChange?: (value: string) => void;
+    }
+    ```
+
+ 4. **Documentation**
+    - Include JSDoc comments
+    - Document props and usage
+    - Include examples
+    - Document accessibility features
+
+ ## Testing Strategy
+
+ 1. **Unit Tests**
+    - Test component rendering
+    - Test props and state
+    - Test user interactions
+    - Test accessibility
+
+ 2. **Integration Tests**
+    - Test component integration
+    - Test data flow
+    - Test error handling
+
+ 3. **E2E Tests**
+    - Test critical user flows
+    - Test performance
+    - Test accessibility
+
+ ## Accessibility Guidelines
+
+ 1. **ARIA Labels**
+    - Use proper ARIA roles
+    - Include descriptive labels
+    - Implement proper focus management
+
+ 2. **Keyboard Navigation**
+    - Support keyboard interactions
+    - Implement proper focus styles
+    - Handle keyboard events
+
+ 3. **Screen Readers**
+    - Use semantic HTML
+    - Include proper alt text
+    - Implement proper heading structure
+
+ ## Performance Monitoring
+
+ 1. **Metrics to Track**
+    - First Contentful Paint (FCP)
+    - Largest Contentful Paint (LCP)
+    - Time to Interactive (TTI)
+    - Total Blocking Time (TBT)
+    - Cumulative Layout Shift (CLS)
+
+ 2. **Tools**
+    - Lighthouse
+    - Web Vitals
+    - Performance Monitor
+    - Bundle Analyzer
+
+ ## Conclusion
+
+ This strategy ensures we build performant, accessible, and maintainable components while optimizing for SEO. By following these guidelines, we can create a consistent and high-quality user experience across our application.
````
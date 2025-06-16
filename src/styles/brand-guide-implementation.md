# TrustyConvert Brand Guidelines Implementation

This document outlines how the TrustyConvert brand guidelines have been implemented throughout the codebase.

## Color System

The TrustyConvert brand colors are defined in `src/styles/design-tokens.ts` and mapped to Tailwind in `tailwind.config.mjs`:

```js
// Primary Brand Colors
trustTeal: '#4ECDC4',      // Main brand color
deepNavy: '#2C3E50',       // Authority and reliability
pureWhite: '#FFFFFF',      // Clean, transparent

// Secondary Colors
accentOrange: '#FF8C42',   // Energy and speed (use sparingly)
lightGray: '#F8F9FA',      // Backgrounds and subtle elements
mediumGray: '#6C757D',     // Secondary text
successGreen: '#28A745',   // Positive actions/confirmations
warningRed: '#DC3545',     // Alerts/errors (minimal use)
```

These colors are also available as CSS variables in `src/styles/global.css`:

```css
:root {
  --trust-teal: 174 78% 55%;    /* #4ECDC4 in HSL */
  --deep-navy: 210 40% 24%;     /* #2C3E50 in HSL */
  --accent-orange: 25 100% 63%; /* #FF8C42 in HSL */
  --light-gray: 210 17% 98%;    /* #F8F9FA in HSL */
  --medium-gray: 210 7% 46%;    /* #6C757D in HSL */
  --success-green: 134 61% 41%; /* #28A745 in HSL */
  --warning-red: 354 70% 54%;   /* #DC3545 in HSL */
}
```

## Typography

The typography system uses the following font stacks:

```js
fonts: {
  sans: [
    'Inter',
    'Poppins',
    'ui-sans-serif',
    'system-ui',
    /* fallbacks */
  ].join(','),
  heading: ['Poppins', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'].join(','),
  mono: [
    'JetBrains Mono',
    'ui-monospace',
    /* fallbacks */
  ].join(',')
}
```

Font sizes follow a consistent scale:

```js
sizes: {
  xs: '0.75rem',  // 12px
  sm: '0.875rem', // 14px
  base: '1rem',   // 16px
  lg: '1.125rem', // 18px
  xl: '1.25rem',  // 20px
  '2xl': '1.5rem', // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem', // 36px
  '5xl': '3rem' // 48px
}
```

## Component Design Patterns

### Headings

Headings use a consistent pattern with an underline accent:

```jsx
<h2 className="relative mx-auto mb-6 inline-block font-heading text-3xl font-semibold text-deepNavy md:text-4xl">
  Heading Text
  <span className="absolute -bottom-2 left-0 h-1 w-full bg-gradient-to-r from-trustTeal to-trustTeal/30"></span>
</h2>
```

### Cards

Cards follow a consistent design pattern:

```jsx
<div className="trusty-card rounded-card border border-trustTeal/20 bg-white p-8 shadow-DEFAULT transition-all hover:shadow-lg">
  {/* Card content */}
</div>
```

### Buttons

Primary buttons:

```jsx
<button className="btn-primary rounded-button bg-trustTeal px-6 py-3 text-sm font-medium text-white transition-all hover:bg-trustTeal/90 hover:shadow-md">
  Button Text
</button>
```

Secondary buttons:

```jsx
<button className="btn-secondary rounded-button border-2 border-deepNavy bg-transparent px-6 py-3 text-sm font-medium text-deepNavy transition-all hover:bg-deepNavy/10">
  Button Text
</button>
```

### Icons

Icons use a consistent outline style with 2px stroke width:

```jsx
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="2"
  strokeLinecap="round"
  strokeLinejoin="round"
  className="text-trustTeal"
>
  {/* SVG paths */}
</svg>
```

## Layout Patterns

### Section Structure

Sections follow a consistent pattern:

```jsx
<section className="py-16 bg-white">
  <div className="trusty-container">
    <div className="mb-12 text-center">
      <h2 className="relative mx-auto mb-6 inline-block font-heading text-3xl font-semibold text-deepNavy md:text-4xl">
        Section Title
        <span className="absolute -bottom-2 left-0 h-1 w-full bg-gradient-to-r from-trustTeal to-trustTeal/30"></span>
      </h2>
      <p className="mx-auto max-w-2xl text-lg text-deepNavy/80">
        Section description text
      </p>
    </div>
    
    {/* Section content */}
  </div>
</section>
```

### Container

The standard container class:

```css
.trusty-container {
  @apply mx-auto max-w-7xl px-4 sm:px-6 lg:px-8;
}
```

## Reusable Components

The following components have been created to ensure consistent brand application:

1. `ConversionSitemap` - Displays file format categories with consistent styling
2. `DetailedConversionOptions` - Shows detailed conversion options following brand guidelines
3. `BenefitsSection` - Highlights product benefits with consistent card styling
4. `FAQ` - Displays FAQs with consistent styling and interaction

## Accessibility Considerations

- Color contrast meets WCAG AA standards (4.5:1 for normal text)
- Interactive elements have clear focus states
- SVG icons include appropriate attributes for screen readers
- Text sizes are responsive and readable on all devices

## Responsive Design

The design is fully responsive with breakpoints at:

- Mobile: Default (< 768px)
- Tablet: md (≥ 768px)
- Desktop: lg (≥ 1024px)

Grid layouts adjust columns based on screen size:

```jsx
<div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
  {/* Grid items */}
</div>
``` 
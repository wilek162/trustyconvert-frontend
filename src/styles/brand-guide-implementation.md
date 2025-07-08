# TrustyConvert Brand Guide Implementation

This document outlines how the TrustyConvert brand guidelines have been implemented across the frontend codebase.

## Color System

The brand colors have been implemented using a combination of Tailwind CSS custom colors and CSS variables:

### Primary Colors
- **Trust Teal**: `#4ECDC4` - Main brand color (trustworthy, professional)
- **Deep Navy**: `#2C3E50` - Authority and reliability
- **Pure White**: `#FFFFFF` - Clean, transparent

### Secondary Colors
- **Accent Orange**: `#FF8C42` - Energy and speed (used sparingly)
- **Light Gray**: `#F8F9FA` - Backgrounds and subtle elements
- **Medium Gray**: `#6C757D` - Secondary text
- **Success Green**: `#28A745` - Positive actions/confirmations
- **Warning Red**: `#DC3545` - Alerts/errors (minimal use)

## Typography

### Font Stacks
- **Primary Font**: 'Inter' - Used for body text and general UI
- **Heading Font**: 'Poppins' - Used for headings and titles

### Font Weights & Sizes
- **H1**: 48px (3rem), Semi-bold (600)
- **H2**: 36px (2.25rem), Medium (500)
- **H3**: 24px (1.5rem), Medium (500)
- **Body**: 16px (1rem), Regular (400)
- **Small**: 14px (0.875rem), Regular (400)
- **Caption**: 12px (0.75rem), Medium (500)

## UI Elements

### Buttons
- **Primary Button**: Trust Teal background, white text, 8px border-radius
- **Secondary Button**: Transparent background, Deep Navy border and text, 8px border-radius

### Cards
- **Border Radius**: 12px for cards, 8px for smaller elements
- **Shadows**: Subtle, soft shadows (0 4px 6px rgba(0,0,0,0.1))
- **Borders**: 1px solid #E9ECEF when needed
- **Padding**: 24px or 32px internal spacing

## Iconography
- **Style**: Outline style with 2px stroke weight
- **Sizes**: 16px, 24px, 32px, 48px
- **Color**: Primarily Trust Teal for accents

## Implementation Details

### Design Tokens
All brand values are stored as design tokens in `src/styles/design-tokens.ts` for consistent reference across the application.

### Tailwind Configuration
The Tailwind configuration in `tailwind.config.mjs` extends the base theme with our brand colors, typography, spacing, and other design elements.

### CSS Variables
CSS variables in `src/styles/global.css` provide theme support and ensure consistent usage of brand colors across the application, including dark mode support.

### Component Implementation
Components have been updated to use the brand guidelines:
- **Features Component**: Card styling, typography, and iconography
- **Hero Component**: Typography, buttons, and spacing
- **Button Component**: Border-radius, padding, and transitions

## Usage Guidelines

When developing new components or modifying existing ones:

1. **Colors**: Use the Tailwind classes (e.g., `text-trustTeal`, `bg-deepNavy`) or CSS variables
2. **Typography**: Use the appropriate font weights and sizes
3. **Spacing**: Follow the 8px grid system (0.5rem increments)
4. **Components**: Reuse existing components where possible
5. **Accessibility**: Ensure all components meet WCAG AA standards

## Maintenance

The brand implementation should be reviewed periodically to ensure consistency and adherence to guidelines. Any deviations should be documented and justified. 
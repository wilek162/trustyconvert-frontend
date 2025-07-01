# TrustyConvert Brand Guidelines & Template

## Brand Personality
**Core Values:** Privacy-focused, Super Fast, Trustworthy, Transparent, Professional, Authoritative, Smart, Intelligent, Honest

## Color Palette

### Primary Colors
- **Trust Teal**: `#4ECDC4` - Main brand color (trustworthy, professional)
- **Deep Navy**: `#2C3E50` - Authority and reliability
- **Pure White**: `#FFFFFF` - Clean, transparent

### Secondary Colors
- **Accent Orange**: `#FF8C42` - Energy and speed (use sparingly)
- **Light Gray**: `#F8F9FA` - Backgrounds and subtle elements
- **Medium Gray**: `#6C757D` - Secondary text
- **Success Green**: `#28A745` - Positive actions/confirmations
- **Warning Red**: `#DC3545` - Alerts/errors (minimal use)

### Usage Guidelines
- **Primary combinations**: Trust Teal + Deep Navy on white backgrounds
- **High contrast**: Deep Navy text on white/light gray backgrounds
- **Accent usage**: Orange for CTAs and highlighting speed/efficiency
- **Never use**: Bright, flashy colors that undermine trust

## Typography

### Primary Font Stack
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Secondary Font Stack (Headings)
```css
font-family: 'Poppins', 'Inter', sans-serif;
```

### Font Weights & Sizes
- **H1**: 48px, Semi-bold (600)
- **H2**: 36px, Medium (500)
- **H3**: 24px, Medium (500)
- **Body**: 16px, Regular (400)
- **Small**: 14px, Regular (400)
- **Caption**: 12px, Medium (500)

### Typography Personality
- **Clean and readable** - prioritizes clarity
- **Modern sans-serif** - professional and approachable
- **Generous spacing** - breathable, not cramped
- **Consistent hierarchy** - builds trust through predictability

## Iconography

### Style Guidelines
- **Outline style** preferred over filled
- **2px stroke weight** for consistency
- **Rounded corners** (2-4px radius) for friendliness
- **Minimal and clean** - avoid decorative elements
- **Consistent sizing** - 16px, 24px, 32px, 48px

### Key Icon Categories
- **File types**: Document, image, video, audio icons
- **Actions**: Upload, download, convert, delete
- **Features**: Speed (lightning), privacy (shield/lock), security
- **Interface**: Arrow, check, close, menu, search

### Recommended Icon Libraries
- Lucide React (clean, consistent)
- Heroicons (professional)
- Feather Icons (minimal)

## UI Elements

### Buttons
```css
/* Primary Button */
background: #4ECDC4;
color: white;
border-radius: 8px;
padding: 12px 24px;
font-weight: 500;
transition: all 0.2s ease;

/* Secondary Button */
background: transparent;
color: #2C3E50;
border: 2px solid #2C3E50;
border-radius: 8px;
```

### Cards & Containers
- **Border radius**: 12px for cards, 8px for smaller elements
- **Shadows**: Subtle, soft shadows (0 4px 6px rgba(0,0,0,0.1))
- **Borders**: 1px solid #E9ECEF when needed
- **Padding**: Generous internal spacing (24px, 32px)

### Form Elements
- **Input fields**: Clean, minimal borders
- **Focus states**: Trust Teal accent color
- **Validation**: Green for success, red for errors
- **Placeholders**: Medium gray, helpful text

## Layout Principles

### Grid System
- **Desktop**: 12-column grid, max-width 1200px
- **Mobile**: Single column, 16px side margins
- **Spacing**: 8px base unit (8, 16, 24, 32, 48, 64px)

### White Space
- **Generous margins** between sections
- **Breathing room** around important elements
- **Clean, uncluttered** layouts that build trust

## Brand Voice & Messaging

### Tone of Voice
- **Professional but approachable**
- **Clear and direct** - no jargon
- **Confident without being arrogant**
- **Reassuring about privacy**

### Key Messages
- "Your files, your privacy"
- "Lightning-fast conversions"
- "No tracking, no storage"
- "Professional-grade security"

### Content Guidelines
- **Be transparent** about what you do/don't do
- **Emphasize speed** in microcopy
- **Reassure about privacy** at key moments
- **Use active voice** for clarity

## Web Design Patterns

### Navigation
- **Clean, minimal** navigation bar
- **Clear hierarchy** - primary and secondary nav
- **Sticky header** for important actions
- **Breadcrumbs** for complex processes

### File Conversion Interface
- **Drag-and-drop** primary interaction
- **Progress indicators** for transparency
- **Clear file type** indicators
- **One-click download** after conversion

### Trust Signals
- **Privacy badges** and certifications
- **"No files stored"** messaging
- **Processing indicators** showing local processing
- **Clear data handling** explanations

## Implementation Examples

### CSS Custom Properties
```css
:root {
  --color-primary: #4ECDC4;
  --color-secondary: #2C3E50;
  --color-accent: #FF8C42;
  --color-success: #28A745;
  --color-background: #FFFFFF;
  --color-surface: #F8F9FA;
  
  --font-primary: 'Inter', sans-serif;
  --font-headings: 'Poppins', sans-serif;
  
  --border-radius: 8px;
  --border-radius-large: 12px;
  --spacing-unit: 8px;
}
```

### Component Structure
- **Header**: Logo, navigation, CTA
- **Hero**: Clear value proposition, conversion tool
- **Features**: Speed, privacy, supported formats
- **Footer**: Links, privacy policy, contact

## Do's and Don'ts

### Do's
✅ Use plenty of white space
✅ Maintain consistent spacing
✅ Prioritize readability
✅ Show processing transparency
✅ Emphasize privacy features
✅ Use familiar UI patterns

### Don'ts
❌ Use bright, flashy colors
❌ Overcrowd the interface
❌ Hide important information
❌ Use complex jargon
❌ Make users guess what's happening
❌ Compromise on accessibility

## Accessibility Standards

### Color Contrast
- **AA compliance** minimum (4.5:1 for normal text)
- **AAA preferred** where possible (7:1)
- **Never rely** on color alone for meaning

### Interactive Elements
- **Focus indicators** clearly visible
- **Touch targets** minimum 44px
- **Keyboard navigation** fully supported
- **Screen reader** friendly markup

This brand template balances professionalism with approachability, emphasizing the core values of privacy, speed, and trustworthiness that are essential for a file conversion service.
import { tokens } from './src/styles/design-tokens';

/** @type {import('tailwindcss').Config} */
export default {
       content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
       darkMode: 'class',
       theme: {
              container: {
                     center: true,
                     padding: {
                            DEFAULT: '1rem',
                            sm: '2rem',
                            lg: '4rem',
                            xl: '5rem',
                            '2xl': '6rem',
                     },
                     maxWidth: '1200px', // Brand guideline max-width
              },
              extend: {
                     colors: {
                            ...tokens.colors,
                            primary: '#329697',
                            'primary-light': '#5db3b3',
                            'primary-dark': '#236c6c',
                            secondary: '#22313a',
                            accent: '#ffb347',
                            success: '#3bb273',
                            warning: '#ff704d',
                            error: '#e74c3c',
                            background: '#f7fafb',
                            surface: '#ffffff',
                            'text-main': '#22313a',
                            'text-muted': '#5a7a8c',
                            // TrustyConvert Brand Colors
                            trustTeal: '#329697',
                            deepNavy: '#2C3E50',
                            pureWhite: '#FFFFFF',
                            accentOrange: '#FF8C42',
                            lightGray: '#F8F9FA',
                            mediumGray: '#6C757D',
                            successGreen: '#28A745',
                            warningRed: '#DC3545',

                            border: 'hsl(var(--border))',
                            input: 'hsl(var(--input))',
                            ring: 'hsl(var(--ring))',
                            foreground: 'hsl(var(--foreground))',
                            primary: {
                                   DEFAULT: 'hsl(var(--primary))',
                                   foreground: 'hsl(var(--primary-foreground))',
                            },
                            secondary: {
                                   DEFAULT: 'hsl(var(--secondary))',
                                   foreground: 'hsl(var(--secondary-foreground))',
                            },
                            destructive: {
                                   DEFAULT: 'hsl(var(--destructive))',
                                   foreground: 'hsl(var(--destructive-foreground))',
                            },
                            muted: {
                                   DEFAULT: 'hsl(var(--muted))',
                                   foreground: 'hsl(var(--muted-foreground))',
                            },
                            accent: {
                                   DEFAULT: 'hsl(var(--accent))',
                                   foreground: 'hsl(var(--accent-foreground))',
                            },
                            popover: {
                                   DEFAULT: 'hsl(var(--popover))',
                                   foreground: 'hsl(var(--popover-foreground))',
                            },
                            card: {
                                   DEFAULT: 'hsl(var(--card))',
                                   foreground: 'hsl(var(--card-foreground))',
                            },
                     },
                     spacing: tokens.spacing,
                     fontFamily: {
                            sans: tokens.typography.fonts.sans,
                            heading: tokens.typography.fonts.heading,
                            mono: tokens.typography.fonts.mono,
                     },
                     fontSize: {
                            xs: ['0.75rem', { lineHeight: '1rem' }], // 12px - Caption
                            sm: ['0.875rem', { lineHeight: '1.25rem' }], // 14px - Small
                            base: ['1rem', { lineHeight: '1.5rem' }], // 16px - Body
                            lg: ['1.125rem', { lineHeight: '1.75rem' }], // 18px
                            xl: ['1.25rem', { lineHeight: '1.75rem' }], // 20px
                            '2xl': ['1.5rem', { lineHeight: '2rem' }], // 24px - H3
                            '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
                            '4xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36px - H2
                            '5xl': ['3rem', { lineHeight: '1' }], // 48px - H1
                     },
                     fontWeight: tokens.typography.weights,
                     lineHeight: tokens.typography.lineHeights,
                     boxShadow: {
                            ...tokens.shadows,
                            DEFAULT: '0 4px 6px rgba(0,0,0,0.1)', // Brand guideline shadow
                     },
                     borderRadius: {
                            ...tokens.radii,
                            card: '0.75rem', // 12px for cards per brand guidelines
                            button: '0.5rem', // 8px for buttons per brand guidelines
                     },
                     transitionDuration: {
                            DEFAULT: '200ms', // Brand guideline transition
                            fast: '100ms',
                            slow: '300ms',
                     },
                     transitionTimingFunction: {
                            DEFAULT: 'ease-in-out', // Brand guideline transition
                            fast: 'ease-in-out',
                            slow: 'ease-in-out',
                     },
                     zIndex: tokens.zIndices,
                     animation: {
                            'fade-in': 'fade-in 0.2s ease-in-out',
                            'fade-out': 'fade-out 0.2s ease-in-out',
                            'slide-in': 'slide-in 0.2s ease-out',
                            'slide-out': 'slide-out 0.2s ease-in',
                     },
                     keyframes: {
                            'fade-in': {
                                   '0%': { opacity: '0' },
                                   '100%': { opacity: '1' },
                            },
                            'fade-out': {
                                   '0%': { opacity: '1' },
                                   '100%': { opacity: '0' },
                            },
                            'slide-in': {
                                   '0%': { transform: 'translateY(100%)' },
                                   '100%': { transform: 'translateY(0)' },
                            },
                            'slide-out': {
                                   '0%': { transform: 'translateY(0)' },
                                   '100%': { transform: 'translateY(100%)' },
                            },
                     },
                     typography: {
                            DEFAULT: {
                                   css: {
                                          maxWidth: '65ch',
                                          color: 'hsl(var(--foreground))',
                                          '[class~="lead"]': {
                                                 color: 'hsl(var(--muted-foreground))',
                                          },
                                          a: {
                                                 color: 'hsl(var(--primary))',
                                                 '&:hover': {
                                                        color: 'hsl(var(--primary-foreground))',
                                                 },
                                          },
                                          strong: {
                                                 color: 'hsl(var(--foreground))',
                                          },
                                          'ol > li::marker': {
                                                 color: 'hsl(var(--muted-foreground))',
                                          },
                                          'ul > li::marker': {
                                                 color: 'hsl(var(--muted-foreground))',
                                          },
                                          hr: {
                                                 borderColor: 'hsl(var(--border))',
                                          },
                                          blockquote: {
                                                 color: 'hsl(var(--muted-foreground))',
                                                 borderLeftColor: 'hsl(var(--border))',
                                          },
                                          h1: {
                                                 color: 'hsl(var(--foreground))',
                                                 fontFamily: tokens.typography.fonts.heading,
                                                 fontWeight: '600', // Semi-bold per brand guidelines
                                                 fontSize: '3rem', // 48px per brand guidelines
                                          },
                                          h2: {
                                                 color: 'hsl(var(--foreground))',
                                                 fontFamily: tokens.typography.fonts.heading,
                                                 fontWeight: '500', // Medium per brand guidelines
                                                 fontSize: '2.25rem', // 36px per brand guidelines
                                          },
                                          h3: {
                                                 color: 'hsl(var(--foreground))',
                                                 fontFamily: tokens.typography.fonts.heading,
                                                 fontWeight: '500', // Medium per brand guidelines
                                                 fontSize: '1.5rem', // 24px per brand guidelines
                                          },
                                          h4: {
                                                 color: 'hsl(var(--foreground))',
                                                 fontFamily: tokens.typography.fonts.heading,
                                          },
                                          'figure figcaption': {
                                                 color: 'hsl(var(--muted-foreground))',
                                          },
                                          code: {
                                                 color: 'hsl(var(--foreground))',
                                          },
                                          pre: {
                                                 color: 'hsl(var(--foreground))',
                                                 backgroundColor: 'hsl(var(--muted))',
                                          },
                                          thead: {
                                                 color: 'hsl(var(--foreground))',
                                                 borderBottomColor: 'hsl(var(--border))',
                                          },
                                          'tbody tr': {
                                                 borderBottomColor: 'hsl(var(--border))',
                                          },
                                   },
                            },
                     },
                     backgroundImage: {
                            'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                            'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
                            'grid-pattern': 'linear-gradient(to right, rgba(44, 62, 80, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(44, 62, 80, 0.05) 1px, transparent 1px)',
                     },
                     backgroundSize: {
                            'grid': '20px 20px',
                     },
              },
       },
       plugins: [
              require('@tailwindcss/typography'),
              require('@tailwindcss/forms'),
              require('@tailwindcss/aspect-ratio'),
              require('tailwindcss-animate'),
              require('@tailwindcss/container-queries'),
       ],
       // Performance optimizations
       future: {
              hoverOnlyWhenSupported: true, // Only add hover styles when supported
       },
       // Disable core plugins you're not using for smaller CSS
       corePlugins: {
              // Disable default container to use our custom one
              container: false,
              // Optionally disable other unused core plugins
              // float: false,
              // clear: false,
              // placeholderColor: false,
       },
       // Disable all default variants for better performance
       variants: {
              extend: {
                     // Only enable variants you actually use
                     backgroundColor: ['responsive', 'dark', 'group-hover', 'focus-within', 'hover', 'focus'],
                     textColor: ['responsive', 'dark', 'group-hover', 'focus-within', 'hover', 'focus'],
                     opacity: ['responsive', 'group-hover', 'focus-within', 'hover', 'focus'],
                     scale: ['responsive', 'group-hover', 'focus-within', 'hover', 'focus'],
                     transform: ['responsive', 'motion-safe', 'motion-reduce'],
              },
       },
};
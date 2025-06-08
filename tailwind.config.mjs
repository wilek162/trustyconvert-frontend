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
              },
              extend: {
                     colors: {
                            ...tokens.colors,
                            border: 'hsl(var(--border))',
                            input: 'hsl(var(--input))',
                            ring: 'hsl(var(--ring))',
                            background: 'hsl(var(--background))',
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
                     fontFamily: tokens.typography.fonts,
                     fontSize: tokens.typography.sizes,
                     fontWeight: tokens.typography.weights,
                     lineHeight: tokens.typography.lineHeights,
                     boxShadow: tokens.shadows,
                     borderRadius: tokens.radii,
                     transitionDuration: {
                            DEFAULT: tokens.transitions.DEFAULT.split(' ')[0],
                            fast: tokens.transitions.fast.split(' ')[0],
                            slow: tokens.transitions.slow.split(' ')[0],
                     },
                     transitionTimingFunction: {
                            DEFAULT: tokens.transitions.DEFAULT.split(' ')[1],
                            fast: tokens.transitions.fast.split(' ')[1],
                            slow: tokens.transitions.slow.split(' ')[1],
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
                                          },
                                          h2: {
                                                 color: 'hsl(var(--foreground))',
                                          },
                                          h3: {
                                                 color: 'hsl(var(--foreground))',
                                          },
                                          h4: {
                                                 color: 'hsl(var(--foreground))',
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
              },
       },
       plugins: [
              require('@tailwindcss/typography'),
              require('@tailwindcss/forms'),
              require('@tailwindcss/aspect-ratio'),
              require('tailwindcss-animate'),
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
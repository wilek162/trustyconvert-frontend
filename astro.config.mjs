// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import { fileURLToPath } from 'node:url';
import mkcert from 'vite-plugin-mkcert'


// https://astro.build/config
export default defineConfig({
  site: 'https://trustyconvert.com',
  // Enable in-browser dev tools in development
  devToolbar: {
    enabled: true,
  },
  // Configure build output
  output: 'static', // Use 'static' or 'server' for Astro v5
  compressHTML: true, // Compress HTML output
  // Configure integrations
  integrations: [
    react({
      // Only hydrate components that need interactivity
      include: ['**/features/**/*', '**/ui/**/*', '**/providers/**/*'],
      // Exclude static components
      exclude: ['**/common/**/*', '**/seo/**/*', '**/*.stories.*'],
    }),
    tailwind({
      // Apply Tailwind to all files
      applyBaseStyles: false,
      // Use the config file we created
      configFile: './tailwind.config.mjs',
    }),
    sitemap({
      // Generate sitemap for better SEO
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      // Customize sitemap entries
      customPages: ['https://trustyconvert.com'],
      // Exclude specific pages if needed
      filter: (page) => !page.includes('/admin/'),
    }),
  ],
  // Configure Vite
  vite: {
    plugins: [mkcert({
      hosts: ['localhost', '127.0.0.1'],
      mkcertPath: undefined, // Let it auto-detect
      autoUpgrade: true,
      force: true,
    })],
    // Enable CSS modules for all .module.css files
    css: {
      modules: {
        localsConvention: 'camelCaseOnly',
      },
    },
    // Build optimizations
    build: {
      cssMinify: 'lightningcss', // Use Lightning CSS for faster builds
      minify: 'terser', // Use Terser for better minification
      sourcemap: true, // Generate source maps for better debugging
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Split vendor chunks for better caching
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'react-vendor';
              }
              if (id.includes('@radix-ui')) {
                return 'ui-vendor';
              }
              return 'vendor';
            }
          },
        },
      },
    },
    // Resolve aliases for cleaner imports
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
        '@lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
        '@styles': fileURLToPath(new URL('./src/styles', import.meta.url)),
      },
    },
    // Server configuration 
    server: {
      proxy: {
        '/api': {
          target: 'https://127.0.0.1:9443',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    },
    optimizeDeps: {
      include: ['react', 'react-dom', '@tanstack/react-query'],
      exclude: [],
    },
  },
  // Astro v5 image config (optional, remove if not using @astrojs/image)
  // image: {
  //   service: import('@astrojs/image/sharp'),
  //   domains: ['trustyconvert.com'],
  // },
});
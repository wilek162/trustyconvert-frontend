// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import mkcert from 'vite-plugin-mkcert';
import { fileURLToPath } from 'node:url';

// ✅ Load .env only in local development
if (process.env.NODE_ENV !== 'production') {
  try {
    const dotenv = await import('dotenv');
    dotenv.config();
  } catch (err) {
    if (err && typeof err === 'object' && 'message' in err) {
      console.warn('[astro.config] Skipping dotenv:', (err).message);
    } else {
      console.warn('[astro.config] Skipping dotenv:', err);
    }
  }
}

// ✅ Environment logic
const isDev = process.env.NODE_ENV === 'development';
const isLocalDev = process.env.IS_LOCAL_DEV === 'true';
const sslKey = process.env.SSL_KEY_FILE;
const sslCert = process.env.SSL_CERT_FILE;
const hasHttps = isLocalDev && sslKey && sslCert;

console.log('[astro.config] isLocalDev:', isLocalDev);
console.log('[astro.config] hasHttps:', hasHttps);

let mkcertPlugin = null;

if (isDev && isLocalDev) {
  try {
    const mkcert = await import('vite-plugin-mkcert');
    mkcertPlugin = mkcert.default({ hosts: ['localhost', '127.0.0.1'] });
  } catch (err) {
    if (err && typeof err === 'object' && 'message' in err) {
      console.warn('[astro.config] Skipping dotenv:', (err).message);
    } else {
      console.warn('[astro.config] Skipping dotenv:', err);
    }
  }
}

export default defineConfig({
  site: 'https://trustyconvert.com',
  output: 'static',
  outDir: './dist',
  compressHTML: true,

  devToolbar: {
    enabled: true,
  },

  integrations: [
    react({
      include: ['**/features/**/*', '**/ui/**/*', '**/providers/**/*', '**/Hero.tsx', '**/ConversionForm.tsx'],
      exclude: ['**/common/**/*', '**/seo/**/*', '**/*.stories.*'],
    }),
    tailwind({
      applyBaseStyles: false,
      configFile: './tailwind.config.mjs',
    }),
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      customPages: ['https://trustyconvert.com'],
      filter: (page) => !page.includes('/admin/'),
    }),
  ],

  vite: {
    plugins: [
      ...[mkcertPlugin].filter(Boolean),
    ],
    css: {
      modules: {
        localsConvention: 'camelCaseOnly',
      },
    },

    build: {
      cssMinify: 'lightningcss',
      minify: 'terser',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) return 'react-vendor';
              if (id.includes('@radix-ui')) return 'ui-vendor';
              return 'vendor';
            }
          },
        },
      },
    },

    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
        '@lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
        '@styles': fileURLToPath(new URL('./src/styles', import.meta.url)),
      },
    },

    server: isDev && isLocalDev ? {
      https: hasHttps
        ? {
          key: sslKey,
          cert: sslCert,
        }
        : undefined,
      proxy: {
        '/api': {
          target: process.env.API_BASE_DOMAIN || 'https://localhost:4321',
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
            proxy.on('proxyReq', (proxyReq, req) => {
              console.log('[Proxy] Request to API:', req.method, req.url);
              proxyReq.setHeader('Origin', 'https://localhost:4322');
            });
            proxy.on('proxyRes', (proxyRes, req) => {
              console.log('[Proxy] Response from API:', proxyRes.statusCode, req.url);
            });
          },
        },
      },
      cors: {
        origin: process.env.PUBLIC_FRONTEND_DOMAIN || 'https://localhost:4322',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        credentials: true,
      },
    } : {},

    optimizeDeps: {
      include: ['react', 'react-dom', '@tanstack/react-query'],
    },
  },
});

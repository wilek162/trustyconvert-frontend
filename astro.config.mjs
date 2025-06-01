// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemapPlugin from '@astrojs/sitemap';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: "https://trustyconvert.com", // <-- Set your real production domain here!
  vite: {
    plugins: [tailwindcss()],
    server: {
      proxy: {
        '/api': 'http://127.0.0.1:8000'
      }
    }
  },

  integrations: [react(), sitemapPlugin()]
});
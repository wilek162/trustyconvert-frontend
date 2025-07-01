/**
 * Generate robots.txt file
 */
export async function get({ site }) {
       return {
              body: `
User-agent: *
Allow: /

# Disallow admin paths
Disallow: /admin/
Disallow: /dashboard/

# Sitemap
Sitemap: ${new URL('sitemap-index.xml', site).href}
Sitemap: ${new URL('sitemap-custom.xml', site).href}
`,
              encoding: 'utf-8',
              headers: {
                     'Content-Type': 'text/plain'
              }
       };
} 
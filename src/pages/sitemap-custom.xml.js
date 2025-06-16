import { getCollection } from 'astro:content';
import { mockFormats } from '../mocks/data';

/**
 * Generate XML sitemap that includes blog posts and conversion pages
 */
export async function get({ site }) {
       // Get all blog posts
       let blogPosts = [];
       try {
              blogPosts = await getCollection('blog', ({ data }) => !data.draft);
       } catch (error) {
              console.warn('Blog collection not available yet:', error.message);
       }

       // Get all conversion formats
       const formats = mockFormats;

       // Generate conversion page URLs
       const conversionUrls = formats.flatMap(format =>
              format.outputFormats.map(targetFormat => ({
                     url: `${site}convert/${format.id}-to-${targetFormat}`,
                     lastmod: new Date().toISOString(),
                     changefreq: 'weekly',
                     priority: 0.8
              }))
       );

       // Generate blog post URLs
       const blogUrls = blogPosts.map(post => ({
              url: `${site}blog/${post.slug}`,
              lastmod: post.data.updatedDate
                     ? new Date(post.data.updatedDate).toISOString()
                     : new Date(post.data.publishDate).toISOString(),
              changefreq: 'monthly',
              priority: 0.7
       }));

       // Generate category URLs
       const categoryUrls = [];
       try {
              // Get unique categories
              const categories = [...new Set(blogPosts.map(post => post.data.category))];

              // Add category URLs
              categories.forEach(category => {
                     categoryUrls.push({
                            url: `${site}blog/category/${category.toLowerCase().replace(/\s+/g, '-')}`,
                            lastmod: new Date().toISOString(),
                            changefreq: 'weekly',
                            priority: 0.6
                     });
              });
       } catch (error) {
              console.warn('Could not generate category URLs:', error.message);
       }

       // Generate tag URLs
       const tagUrls = [];
       try {
              // Get unique tags
              const tags = [...new Set(blogPosts.flatMap(post => post.data.tags))];

              // Add tag URLs
              tags.forEach(tag => {
                     tagUrls.push({
                            url: `${site}blog/tag/${tag.toLowerCase().replace(/\s+/g, '-')}`,
                            lastmod: new Date().toISOString(),
                            changefreq: 'weekly',
                            priority: 0.5
                     });
              });
       } catch (error) {
              console.warn('Could not generate tag URLs:', error.message);
       }

       // Static pages
       const staticUrls = [
              {
                     url: site,
                     lastmod: new Date().toISOString(),
                     changefreq: 'daily',
                     priority: 1.0
              },
              {
                     url: `${site}blog`,
                     lastmod: new Date().toISOString(),
                     changefreq: 'daily',
                     priority: 0.9
              },
              {
                     url: `${site}all-conversions`,
                     lastmod: new Date().toISOString(),
                     changefreq: 'weekly',
                     priority: 0.9
              },
              {
                     url: `${site}about`,
                     lastmod: new Date().toISOString(),
                     changefreq: 'monthly',
                     priority: 0.5
              },
              {
                     url: `${site}privacy`,
                     lastmod: new Date().toISOString(),
                     changefreq: 'monthly',
                     priority: 0.5
              }
       ];

       // Combine all URLs
       const allUrls = [
              ...staticUrls,
              ...conversionUrls,
              ...blogUrls,
              ...categoryUrls,
              ...tagUrls
       ];

       // Generate sitemap XML
       const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${allUrls.map(entry => `
  <url>
    <loc>${entry.url}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>
  `).join('')}
</urlset>`;

       return {
              body: sitemap,
              encoding: 'utf-8',
              headers: {
                     'Content-Type': 'application/xml'
              }
       };
} 
import { getCollection } from 'astro:content';
import { LANGUAGES, DEFAULT_LANGUAGE, formatLocalizedPath } from '../lib/i18n/config';

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
       const formats = [];

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
       const blogUrls = blogPosts.map(post => {
              const { language = DEFAULT_LANGUAGE.code } = post.data;
              const langPrefix = language === DEFAULT_LANGUAGE.code ? '' : `/${language}`;

              // Build alternates for translations
              const alternates = [];

              // Add the current post
              alternates.push({
                     href: `${site}${langPrefix}/blog/${post.slug}`,
                     hreflang: language
              });

              // Add translations if available
              if (post.data.translations) {
                     post.data.translations.forEach(translation => {
                            const transLangPrefix = translation.language === DEFAULT_LANGUAGE.code ? '' : `/${translation.language}`;
                            alternates.push({
                                   href: `${site}${transLangPrefix}/blog/${translation.slug}`,
                                   hreflang: translation.language
                            });
                     });
              }

              return {
                     url: `${site}${langPrefix}/blog/${post.slug}`,
                     lastmod: post.data.updatedDate
                            ? post.data.updatedDate.toISOString().split('T')[0]
                            : post.data.publishDate.toISOString().split('T')[0],
                     priority: post.data.featured ? '0.9' : '0.7',
                     changefreq: 'monthly',
                     alternates
              };
       });

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
       const staticPages = [
              { url: '', priority: '1.0', changefreq: 'weekly' },
              { url: 'about', priority: '0.8', changefreq: 'monthly' },
              { url: 'privacy', priority: '0.7', changefreq: 'monthly' },
              { url: 'all-conversions', priority: '0.9', changefreq: 'weekly' },
              { url: 'faq', priority: '0.8', changefreq: 'monthly' },
              { url: 'blog', priority: '0.9', changefreq: 'weekly' }
       ];

       // Generate URLs for all static pages in all languages
       const staticUrls = staticPages.flatMap(page => {
              return LANGUAGES.map(lang => {
                     // For default language, don't add language prefix
                     const langPrefix = lang.code === DEFAULT_LANGUAGE.code ? '' : `/${lang.code}`;
                     const pageUrl = page.url === '' ? '' : `/${page.url}`;

                     return {
                            url: `${site}${langPrefix}${pageUrl}`,
                            lastmod: new Date().toISOString().split('T')[0],
                            priority: page.priority,
                            changefreq: page.changefreq,
                            // Add language alternates
                            alternates: LANGUAGES.map(alternateLang => {
                                   const altLangPrefix = alternateLang.code === DEFAULT_LANGUAGE.code ? '' : `/${alternateLang.code}`;
                                   return {
                                          href: `${site}${altLangPrefix}${pageUrl}`,
                                          hreflang: alternateLang.code
                                   };
                            })
                     };
              });
       });

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
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  ${allUrls.map(entry => `
  <url>
    <loc>${entry.url}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
    ${entry.alternates.map(alt => `
    <xhtml:link 
      rel="alternate" 
      hreflang="${alt.hreflang}" 
      href="${alt.href}" 
    />`).join('')}
  </url>`).join('')}
</urlset>`;

       return {
              body: sitemap,
              encoding: 'utf-8',
              headers: {
                     'Content-Type': 'application/xml',
                     'Cache-Control': 'public, max-age=3600'
              }
       };
} 
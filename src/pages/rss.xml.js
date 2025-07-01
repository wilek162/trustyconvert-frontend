import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { siteConfig } from '../lib/seo/config';

/**
 * Generate RSS feed for the blog
 */
export async function get(context) {
       // Get all blog posts
       let blogPosts = [];
       try {
              blogPosts = await getCollection('blog', ({ data }) => !data.draft);
       } catch (error) {
              console.warn('Blog collection not available yet:', error.message);
       }

       // Sort by publish date
       const sortedPosts = blogPosts.sort((a, b) =>
              new Date(b.data.publishDate).valueOf() - new Date(a.data.publishDate).valueOf()
       );

       return rss({
              title: `${siteConfig.siteName} Blog`,
              description: 'Learn about file formats, conversion techniques, and digital document management.',
              site: context.site,
              items: sortedPosts.map((post) => ({
                     title: post.data.title,
                     pubDate: post.data.publishDate,
                     description: post.data.description,
                     link: `/blog/${post.slug}/`,
                     categories: [post.data.category, ...post.data.tags]
              })),
              customData: `<language>en-us</language>`,
              stylesheet: '/rss/styles.xsl'
       });
} 
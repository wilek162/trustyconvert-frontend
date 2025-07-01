import { defineCollection, z } from 'astro:content'
import { LANGUAGES } from '@/lib/i18n/config'

// Define language schema
const languageSchema = z.enum(LANGUAGES.map((lang) => lang.code))

export const collections = {
	blog: defineCollection({
		schema: z.object({
			title: z.string(),
			description: z.string(),
			publishDate: z.date(),
			updatedDate: z.date().optional(),
			author: z.string(),
			authorImage: z.string().optional(),
			image: z.string(),
			tags: z.array(z.string()),
			category: z.enum(['Tutorials', 'File Formats', 'Security', 'Productivity', 'News']),
			featured: z.boolean().default(false),
			draft: z.boolean().default(false),
			seoTitle: z.string().optional(),
			seoDescription: z.string().optional(),
			language: languageSchema.default('en'),
			translations: z
				.array(
					z.object({
						language: languageSchema,
						slug: z.string()
					})
				)
				.optional()
		})
	})
}

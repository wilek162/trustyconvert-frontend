/**
 * SEO Utilities
 * 
 * Functions for generating SEO metadata for various page types.
 */

import type { ConversionFormat } from '@/lib/types/api'
import { t } from '@/lib/i18n/translations'

/**
 * Generate SEO title for a conversion page
 * 
 * @param sourceFormat Source format information
 * @param targetFormat Target format information
 * @param lang Language code for translations
 * @returns SEO-friendly title
 */
export function generateConversionTitle(
  sourceFormat: ConversionFormat | string,
  targetFormat: ConversionFormat | string,
  lang = 'en'
): string {
  const sourceName = typeof sourceFormat === 'string' ? sourceFormat.toUpperCase() : sourceFormat.name
  const targetName = typeof targetFormat === 'string' ? targetFormat.toUpperCase() : targetFormat.name
  
  return `${t('convert', lang)} ${sourceName} ${t('to', lang)} ${targetName} - ${t('free_online_converter', lang)}`
}

/**
 * Generate SEO description for a conversion page
 * 
 * @param sourceFormat Source format information
 * @param targetFormat Target format information
 * @param lang Language code for translations
 * @returns SEO-friendly description
 */
export function generateConversionDescription(
  sourceFormat: ConversionFormat | string,
  targetFormat: ConversionFormat | string,
  lang = 'en'
): string {
  const sourceName = typeof sourceFormat === 'string' ? sourceFormat.toUpperCase() : sourceFormat.name
  const targetName = typeof targetFormat === 'string' ? targetFormat.toUpperCase() : targetFormat.name
  
  return `${t('convert_your', lang)} ${sourceName} ${t('files_to', lang)} ${targetName} ${t('format_online', lang)}. ${t('fast_secure_free', lang)}`
}

/**
 * Generate structured data for a conversion page
 * 
 * @param sourceFormat Source format information
 * @param targetFormat Target format information
 * @param description Page description
 * @returns Structured data object for SEO
 */
export function generateConversionStructuredData(
  sourceFormat: ConversionFormat | string,
  targetFormat: ConversionFormat | string,
  description: string
): any {
  const sourceId = typeof sourceFormat === 'string' ? sourceFormat : sourceFormat.id
  const targetId = typeof targetFormat === 'string' ? targetFormat : targetFormat.id
  
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: `${sourceId.toUpperCase()} to ${targetId.toUpperCase()} Converter`,
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'All',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    },
    description: description
  }
}

/**
 * Generate standard conversion features
 * 
 * @param sourceFormat Source format information
 * @param targetFormat Target format information
 * @param lang Language code for translations
 * @returns Array of feature strings
 */
export function generateConversionFeatures(
  sourceFormat: ConversionFormat | string,
  targetFormat: ConversionFormat | string,
  lang = 'en'
): string[] {
  const sourceId = typeof sourceFormat === 'string' ? sourceFormat : sourceFormat.id
  const targetId = typeof targetFormat === 'string' ? targetFormat : targetFormat.id
  
  return [
    `${t('convert', lang)} ${sourceId.toUpperCase()} ${t('to', lang)} ${targetId.toUpperCase()} ${t('instantly', lang)}`,
    t('secure_conversion', lang),
    t('no_registration', lang),
    t('download_immediately', lang)
  ]
}

// Export as a service object
const seoUtils = {
  generateConversionTitle,
  generateConversionDescription,
  generateConversionStructuredData,
  generateConversionFeatures
}

export default seoUtils 
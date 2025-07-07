import React from 'react';
import type { ConversionFormat } from '@/lib/types/api';

interface RelatedConversionsPanelProps {
  relatedFormats: ConversionFormat[];
  targetFormat: string;
  targetFormatName?: string;
}

export function RelatedConversionsPanel({ relatedFormats, targetFormat, targetFormatName }: RelatedConversionsPanelProps) {
  // Use provided name or default to uppercase format ID
  const targetFormatDisplay = targetFormatName || targetFormat.toUpperCase();
  
  // Only render if we have related conversions
  if (!relatedFormats || relatedFormats.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-medium text-deepNavy">Related Conversions</h2>
      <div className="space-y-1">
        {relatedFormats.map((format) => (
          <a
            key={format.id}
            href={`/convert/${format.id}-to-${targetFormat}`}
            className="flex items-center rounded-md p-2 text-sm transition-colors hover:bg-lightGray"
          >
            <span className="mr-2 text-sm">{format.icon || '🔄'}</span>
            <span className="text-deepNavy/90 hover:text-trustTeal">
              {format.name} → {targetFormatDisplay}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

export default RelatedConversionsPanel; 
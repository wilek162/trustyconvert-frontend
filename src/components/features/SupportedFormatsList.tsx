import React from 'react'
import { useSupportedFormats } from '@/lib/hooks/useSupportedFormats'

export default function SupportedFormatsList() {
	const { formats, isLoading, error } = useSupportedFormats()

	if (isLoading) return <div>Loading formats...</div>
	if (error) return <div>{error.message}</div>
	if (!formats.length) return <div>No supported formats found</div>

	return (
		<ul className="space-y-4">
			{formats.map((format) => (
				<li key={format.id} className="flex items-center space-x-2">
					<span className="font-medium">{format.name}</span>
					<span className="text-muted-foreground">({format.inputFormats.join(', ')})</span>
					<span className="text-muted-foreground">→</span>
					<span className="text-muted-foreground">{format.outputFormats.join(', ')}</span>
				</li>
			))}
		</ul>
	)
}

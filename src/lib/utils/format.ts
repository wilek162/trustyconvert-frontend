/**
 * Formats a file size in bytes to a human readable string
 * @param bytes The size in bytes
 * @returns A formatted string (e.g., "1.5 MB", "800 KB", etc.)
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 B'

	const k = 1024
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))

	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Format duration in seconds to human-readable string
 * @param seconds Duration in seconds
 * @returns Formatted string (e.g., "2m 30s")
 */
export function formatDuration(seconds: number): string {
	if (seconds < 60) {
		return `${Math.ceil(seconds)}s`
	}

	const minutes = Math.floor(seconds / 60)
	const remainingSeconds = Math.ceil(seconds % 60)

	if (minutes < 60) {
		return `${minutes}m ${remainingSeconds}s`
	}

	const hours = Math.floor(minutes / 60)
	const remainingMinutes = minutes % 60

	return `${hours}h ${remainingMinutes}m`
}

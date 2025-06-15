// Define a local ConversionFormat type for mocks
type MockConversionFormat = {
	id: string
	name: string
	inputFormats: string[]
	outputFormats: string[]
	maxSize: number
	features?: string[]
	extensions?: string[]
	mimeTypes?: string[]
	canConvertTo?: string[]
	icon?: string
}

// Mock file objects for testing
export const mockFiles = {
	smallPdf: new File([new ArrayBuffer(2 * 1024 * 1024)], 'small.pdf', {
		type: 'application/pdf'
	}),
	largeDoc: new File([new ArrayBuffer(15 * 1024 * 1024)], 'large.docx', {
		type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
	}),
	image: new File([new ArrayBuffer(1024 * 1024)], 'photo.jpg', {
		type: 'image/jpeg'
	}),
	invalid: new File([new ArrayBuffer(1024)], 'invalid.xyz', {
		type: 'application/octet-stream'
	})
}

// Mock API responses
export const mockResponses = {
	success: {
		id: 'conv_123',
		status: 'completed',
		downloadUrl: 'https://example.com/download/123',
		format: 'pdf',
		originalName: 'document.docx',
		size: 1024 * 1024,
		createdAt: new Date().toISOString()
	},
	error: {
		status: 'error',
		message: 'Conversion failed: File format not supported',
		code: 'CONV_ERR_001',
		details: {
			maxSize: '50MB',
			supportedFormats: ['pdf', 'docx', 'xlsx']
		}
	},
	progress: {
		status: 'processing',
		progress: 45,
		eta: '30 seconds',
		stage: 'converting',
		startedAt: new Date().toISOString()
	}
}

// Mock data for TrustyConvert

// Mock file formats and their conversions
export const mockFormats: MockConversionFormat[] = [
	{
		id: 'pdf',
		name: 'PDF Document',
		inputFormats: ['pdf'],
		outputFormats: ['docx', 'txt', 'jpg', 'png'],
		maxSize: 100 * 1024 * 1024, // 100MB
		features: ['Searchable Text', 'Document Security'],
		// Additional properties for backwards compatibility
		extensions: ['.pdf'],
		mimeTypes: ['application/pdf'],
		canConvertTo: ['docx', 'txt', 'jpg', 'png'],
		icon: '📄'
	},
	{
		id: 'docx',
		name: 'Microsoft Word Document',
		inputFormats: ['docx', 'doc'],
		outputFormats: ['pdf', 'txt', 'md', 'html'],
		maxSize: 50 * 1024 * 1024, // 50MB
		features: ['Text Formatting', 'Track Changes'],
		// Additional properties for backwards compatibility
		extensions: ['.docx', '.doc'],
		mimeTypes: [
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'application/msword'
		],
		canConvertTo: ['pdf', 'txt', 'md', 'html'],
		icon: '📝'
	},
	{
		id: 'xlsx',
		name: 'Microsoft Excel Spreadsheet',
		inputFormats: ['xlsx', 'xls'],
		outputFormats: ['pdf', 'csv', 'json'],
		maxSize: 50 * 1024 * 1024, // 50MB
		features: ['Formula Support', 'Data Tables'],
		// Additional properties for backwards compatibility
		extensions: ['.xlsx', '.xls'],
		mimeTypes: [
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'application/vnd.ms-excel'
		],
		canConvertTo: ['pdf', 'csv', 'json'],
		icon: '📊'
	},
	{
		id: 'pptx',
		name: 'Microsoft PowerPoint Presentation',
		inputFormats: ['pptx', 'ppt'],
		outputFormats: ['pdf', 'jpg', 'png'],
		maxSize: 100 * 1024 * 1024, // 100MB
		features: ['Animations', 'Slide Transitions'],
		// Additional properties for backwards compatibility
		extensions: ['.pptx', '.ppt'],
		mimeTypes: [
			'application/vnd.openxmlformats-officedocument.presentationml.presentation',
			'application/vnd.ms-powerpoint'
		],
		canConvertTo: ['pdf', 'jpg', 'png'],
		icon: '📊'
	},
	{
		id: 'jpg',
		name: 'JPEG Image',
		inputFormats: ['jpg', 'jpeg'],
		outputFormats: ['png', 'pdf', 'svg'],
		maxSize: 30 * 1024 * 1024, // 30MB
		features: ['Compression', 'Image Optimization'],
		// Additional properties for backwards compatibility
		extensions: ['.jpg', '.jpeg'],
		mimeTypes: ['image/jpeg'],
		canConvertTo: ['png', 'pdf', 'svg'],
		icon: '🖼️'
	},
	{
		id: 'png',
		name: 'PNG Image',
		inputFormats: ['png'],
		outputFormats: ['jpg', 'pdf', 'svg'],
		maxSize: 30 * 1024 * 1024, // 30MB
		features: ['Transparency', 'Lossless Compression'],
		// Additional properties for backwards compatibility
		extensions: ['.png'],
		mimeTypes: ['image/png'],
		canConvertTo: ['jpg', 'pdf', 'svg'],
		icon: '🖼️'
	},
	{
		id: 'svg',
		name: 'SVG Image',
		inputFormats: ['svg'],
		outputFormats: ['png', 'jpg', 'pdf'],
		maxSize: 10 * 1024 * 1024, // 10MB
		features: ['Vector Graphics', 'Scalable'],
		// Additional properties for backwards compatibility
		extensions: ['.svg'],
		mimeTypes: ['image/svg+xml'],
		canConvertTo: ['png', 'jpg', 'pdf'],
		icon: '🖼️'
	},
	{
		id: 'txt',
		name: 'Text File',
		inputFormats: ['txt'],
		outputFormats: ['pdf', 'html', 'md'],
		maxSize: 10 * 1024 * 1024, // 10MB
		features: ['Plain Text', 'Universal Compatibility'],
		// Additional properties for backwards compatibility
		extensions: ['.txt'],
		mimeTypes: ['text/plain'],
		canConvertTo: ['pdf', 'html', 'md'],
		icon: '📝'
	}
] as MockConversionFormat[]

// Mock error templates
export const mockErrors = {
	validation: {
		fileTooLarge: {
			error: 'FileTooLarge',
			message: 'File size exceeds the maximum allowed limit (100MB).'
		},
		unsupportedFormat: {
			error: 'UnsupportedFormat',
			message: 'The file format is not supported for conversion.'
		},
		invalidFile: {
			error: 'InvalidFile',
			message: 'The file is corrupted or invalid.'
		}
	},
	security: {
		csrfMissing: {
			error: 'CSRFTokenMissing',
			message: 'CSRF token is missing or invalid.'
		},
		sessionExpired: {
			error: 'SessionExpired',
			message: 'Your session has expired. Please refresh the page.'
		}
	},
	server: {
		conversionFailed: {
			error: 'ConversionFailed',
			message: 'The conversion process failed. Please try again.'
		},
		serviceUnavailable: {
			error: 'ServiceUnavailable',
			message: 'The conversion service is currently unavailable.'
		}
	}
}

// Helper function to get recommended formats for a given file type
export function getRecommendedFormats(fileType: string): string[] {
	const format = mockFormats.find(
		(f) => f.mimeTypes?.includes(fileType) || f.extensions?.some((ext) => fileType.endsWith(ext))
	)

	return format?.outputFormats || format?.canConvertTo || []
}

// Helper function to validate if conversion is possible
export function isConversionPossible(sourceFormat: string, targetFormat: string): boolean {
	const format = mockFormats.find((f) => f.id === sourceFormat)
	return (
		format?.outputFormats.includes(targetFormat) ||
		format?.canConvertTo?.includes(targetFormat) ||
		false
	)
}

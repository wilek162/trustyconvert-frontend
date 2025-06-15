import React, { useState } from 'react'
import { FileDropzone } from './FileDropzone'
import { Button } from './ui/Button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/Card'
import { formatFileSize, getFileExtension } from '@/lib/utils'

interface ConversionFormProps {
	onSubmit: (file: File, targetFormat: string) => void
	isLoading?: boolean
}

const SUPPORTED_FORMATS = {
	document: ['pdf', 'docx', 'doc', 'txt', 'rtf', 'odt'],
	image: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'],
	spreadsheet: ['xlsx', 'xls', 'csv'],
	presentation: ['pptx', 'ppt']
}

export function ConversionForm({ onSubmit, isLoading = false }: ConversionFormProps) {
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [targetFormat, setTargetFormat] = useState<string>('')
	const [error, setError] = useState<string | null>(null)

	const handleFileAccepted = (file: File) => {
		setSelectedFile(file)
		setError(null)

		// Set default target format based on file type
		const extension = getFileExtension(file.name).toLowerCase()

		if (SUPPORTED_FORMATS.document.includes(extension)) {
			if (extension !== 'pdf') {
				setTargetFormat('pdf')
			} else {
				setTargetFormat('docx')
			}
		} else if (SUPPORTED_FORMATS.image.includes(extension)) {
			if (extension !== 'png') {
				setTargetFormat('png')
			} else {
				setTargetFormat('jpg')
			}
		} else if (SUPPORTED_FORMATS.spreadsheet.includes(extension)) {
			if (extension !== 'xlsx') {
				setTargetFormat('xlsx')
			} else {
				setTargetFormat('csv')
			}
		} else if (SUPPORTED_FORMATS.presentation.includes(extension)) {
			if (extension !== 'pdf') {
				setTargetFormat('pdf')
			} else {
				setTargetFormat('pptx')
			}
		}
	}

	const handleFileRejected = (errorMessage: string) => {
		setError(errorMessage)
		setSelectedFile(null)
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()

		if (!selectedFile || !targetFormat) {
			setError('Please select a file and target format.')
			return
		}

		onSubmit(selectedFile, targetFormat)
	}

	const getAvailableFormats = () => {
		if (!selectedFile) return []

		const extension = getFileExtension(selectedFile.name).toLowerCase()

		if (SUPPORTED_FORMATS.document.includes(extension)) {
			return SUPPORTED_FORMATS.document.filter((format) => format !== extension)
		} else if (SUPPORTED_FORMATS.image.includes(extension)) {
			return SUPPORTED_FORMATS.image.filter((format) => format !== extension)
		} else if (SUPPORTED_FORMATS.spreadsheet.includes(extension)) {
			return SUPPORTED_FORMATS.spreadsheet.filter((format) => format !== extension)
		} else if (SUPPORTED_FORMATS.presentation.includes(extension)) {
			return [...SUPPORTED_FORMATS.presentation.filter((format) => format !== extension), 'pdf']
		}

		return []
	}

	return (
		<Card className="mx-auto w-full max-w-3xl overflow-hidden border-trustTeal/10 bg-white shadow-lg shadow-trustTeal/5">
			<form onSubmit={handleSubmit}>
				<CardHeader className="border-b border-border/50 pb-4">
					<CardTitle className="text-center text-xl font-semibold text-deepNavy">
						Convert Your File
					</CardTitle>
				</CardHeader>

				<CardContent className="px-6 pt-6">
					{!selectedFile ? (
						<FileDropzone onFileAccepted={handleFileAccepted} onFileRejected={handleFileRejected} />
					) : (
						<div className="space-y-6">
							<div className="rounded-xl border border-trustTeal/20 bg-white p-4 shadow-sm">
								<div className="flex items-center justify-between">
									<div className="flex items-center space-x-3">
										<div className="flex h-12 w-12 items-center justify-center rounded-full bg-trustTeal/10">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="22"
												height="22"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
												className="text-trustTeal"
											>
												<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
												<polyline points="14 2 14 8 20 8" />
											</svg>
										</div>
										<div>
											<p className="max-w-[180px] truncate font-medium md:max-w-[300px]">
												{selectedFile.name}
											</p>
											<div className="mt-1 flex items-center space-x-2">
												<span className="text-xs text-muted-foreground">
													{formatFileSize(selectedFile.size)}
												</span>
												<span className="inline-block h-1 w-1 rounded-full bg-muted-foreground"></span>
												<span className="text-xs capitalize text-muted-foreground">
													{getFileExtension(selectedFile.name)} file
												</span>
											</div>
										</div>
									</div>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => setSelectedFile(null)}
										className="flex h-8 w-8 items-center justify-center rounded-full p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="16"
											height="16"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
										>
											<line x1="18" y1="6" x2="6" y2="18"></line>
											<line x1="6" y1="6" x2="18" y2="18"></line>
										</svg>
										<span className="sr-only">Remove file</span>
									</Button>
								</div>
							</div>

							<div className="space-y-4">
								<label className="text-sm font-medium">Convert to:</label>
								<div className="flex flex-wrap gap-2">
									{getAvailableFormats().map((format) => (
										<button
											key={format}
											type="button"
											onClick={() => setTargetFormat(format)}
											className={`group relative rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
												targetFormat === format
													? 'bg-trustTeal text-white shadow-md'
													: 'bg-lightGray text-deepNavy hover:bg-trustTeal/10 hover:shadow-sm'
											}`}
										>
											<span className="flex items-center">
												{targetFormat === format && (
													<svg
														className="mr-1 h-3 w-3"
														xmlns="http://www.w3.org/2000/svg"
														viewBox="0 0 20 20"
														fill="currentColor"
													>
														<path
															fillRule="evenodd"
															d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
															clipRule="evenodd"
														/>
													</svg>
												)}
												.{format}
											</span>
											{targetFormat === format && (
												<span className="absolute inset-0 z-0 rounded-full bg-trustTeal/10 blur-sm"></span>
											)}
										</button>
									))}
								</div>
							</div>
						</div>
					)}

					{error && (
						<div className="mt-4 rounded-md border border-warningRed/20 bg-warningRed/10 p-3 text-sm text-warningRed">
							<div className="flex items-center">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="mr-2 h-4 w-4"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fillRule="evenodd"
										d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
										clipRule="evenodd"
									/>
								</svg>
								{error}
							</div>
						</div>
					)}
				</CardContent>

				<CardFooter className="flex justify-center border-t border-border/50 bg-gradient-to-b from-white to-lightGray/30 py-6">
					<Button
						type="submit"
						disabled={!selectedFile || !targetFormat || isLoading}
						className="group relative w-full max-w-xs overflow-hidden rounded-full bg-trustTeal px-6 py-3 font-medium text-white hover:bg-trustTeal/90"
					>
						<span className="relative z-10 flex items-center justify-center">
							{isLoading ? (
								<>
									<svg
										className="-ml-1 mr-2 h-4 w-4 animate-spin text-white"
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
									>
										<circle
											className="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											strokeWidth="4"
										></circle>
										<path
											className="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										></path>
									</svg>
									Converting...
								</>
							) : (
								<>
									Convert Now
									<svg
										className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fillRule="evenodd"
											d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
											clipRule="evenodd"
										/>
									</svg>
								</>
							)}
						</span>

						{/* Background animation */}
						<span className="absolute bottom-0 left-1/2 h-full w-0 -translate-x-1/2 rounded-full bg-white/10 transition-all duration-300 group-hover:w-[105%]"></span>
					</Button>
				</CardFooter>
			</form>
		</Card>
	)
}

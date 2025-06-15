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
		<Card className="mx-auto w-full max-w-3xl overflow-hidden rounded-xl border-0 bg-white shadow-lg">
			<form onSubmit={handleSubmit}>
				<CardHeader className="border-b border-border/50 bg-gradient-to-r from-trustTeal/20 to-transparent pb-4 pt-5">
					<CardTitle className="text-center text-xl font-semibold text-deepNavy">
						Convert Your File
					</CardTitle>
				</CardHeader>

				<CardContent className="bg-gradient-to-b from-white to-lightGray/10 p-6">
					{!selectedFile ? (
						<FileDropzone onFileAccepted={handleFileAccepted} onFileRejected={handleFileRejected} />
					) : (
						<div className="space-y-8">
							<div className="rounded-xl border border-trustTeal/30 bg-gradient-to-r from-trustTeal/5 to-white p-6 shadow-md">
								<div className="flex items-center justify-between">
									<div className="flex items-center space-x-4">
										<div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-trustTeal/20 to-trustTeal/30 shadow-inner">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="28"
												height="28"
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
											<p className="max-w-[180px] truncate text-lg font-medium text-deepNavy md:max-w-[300px]">
												{selectedFile.name}
											</p>
											<div className="mt-1 flex items-center space-x-2">
												<span className="text-sm text-deepNavy/70">
													{formatFileSize(selectedFile.size)}
												</span>
												<span className="inline-block h-1 w-1 rounded-full bg-deepNavy/30"></span>
												<span className="text-sm capitalize text-deepNavy/70">
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
										className="flex h-10 w-10 items-center justify-center rounded-full bg-warningRed/10 p-0 text-warningRed hover:bg-warningRed/20 hover:text-warningRed"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="18"
											height="18"
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

							<div className="space-y-5">
								<label className="text-lg font-medium text-deepNavy">Convert to:</label>
								<div className="flex flex-wrap gap-3">
									{getAvailableFormats().map((format) => (
										<button
											key={format}
											type="button"
											onClick={() => setTargetFormat(format)}
											className={`group relative rounded-lg px-5 py-3 text-base font-medium transition-all duration-200 ${
												targetFormat === format
													? 'bg-trustTeal text-white shadow-md'
													: 'bg-lightGray text-deepNavy hover:bg-trustTeal/10 hover:shadow-sm'
											}`}
										>
											<span className="flex items-center">
												{targetFormat === format && (
													<svg
														className="mr-1.5 h-4 w-4"
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
												<span className="absolute inset-0 -z-10 rounded-lg bg-trustTeal/10 blur-sm"></span>
											)}
										</button>
									))}
								</div>
							</div>
						</div>
					)}

					{error && (
						<div className="mt-6 flex items-center rounded-lg border border-warningRed/20 bg-warningRed/10 p-4 text-sm text-warningRed">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="mr-2 h-5 w-5"
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
					)}
				</CardContent>

				<CardFooter className="flex justify-center border-t border-border/50 bg-gradient-to-b from-lightGray/10 to-lightGray/20 px-8 py-7">
					<Button
						type="submit"
						disabled={!selectedFile || !targetFormat || isLoading}
						className="group relative w-full max-w-xs overflow-hidden rounded-lg bg-trustTeal px-8 py-4 text-base font-medium text-white shadow-md transition-all hover:bg-trustTeal/90 hover:shadow-lg focus:ring-2 focus:ring-trustTeal/50 focus:ring-offset-2 disabled:bg-trustTeal/50"
					>
						<span className="relative z-10 flex items-center justify-center">
							{isLoading ? (
								<>
									<svg
										className="mr-2 h-5 w-5 animate-spin text-white"
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
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="mr-2 h-5 w-5"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" />
									</svg>
									Convert Now
								</>
							)}
						</span>
						<span className="absolute inset-0 -z-10 bg-gradient-to-r from-trustTeal to-accentOrange/50 opacity-0 blur-xl transition-opacity group-hover:opacity-30"></span>
					</Button>
				</CardFooter>
			</form>
		</Card>
	)
}

import React, { useState } from 'react'

const faqs = [
	{
		question: 'Is TrustyConvert really free to use?',
		answer:
			'Yes, TrustyConvert is completely free for basic file conversions. We offer premium features for business users who need advanced options or higher volume conversions.'
	},
	{
		question: 'How secure is my data when using TrustyConvert?',
		answer:
			'Your security is our top priority. All file conversions happen in your browser - your files are never uploaded to our servers. We use end-to-end encryption and automatically delete all data after conversion is complete.'
	},
	{
		question: 'What is the maximum file size I can convert?',
		answer:
			'Our free plan allows conversions of files up to 50MB in size. For larger files, you may want to consider our premium plans which support files up to 2GB.'
	},
	{
		question: 'Which file formats does TrustyConvert support?',
		answer:
			'TrustyConvert supports a wide range of formats including documents (PDF, DOCX, TXT), images (JPG, PNG, SVG), spreadsheets (XLSX, CSV), and presentations (PPTX, PPT). Check our Supported Formats section for a complete list.'
	},
	{
		question: 'How long does the conversion process take?',
		answer:
			"Most conversions complete within seconds. The exact time depends on your file size, format, and your device's processing power. Since all conversions happen locally in your browser, a faster computer will yield quicker results."
	},
	{
		question: 'Do I need to create an account to use TrustyConvert?',
		answer:
			"No, TrustyConvert doesn't require registration for basic conversions. Simply upload your file, select your desired format, and download the converted result - no account needed."
	}
]

export function FAQ() {
	const [openIndex, setOpenIndex] = useState<number | null>(null)

	const toggleFAQ = (index: number) => {
		setOpenIndex(openIndex === index ? null : index)
	}

	return (
		<section className="bg-gradient-to-b from-white to-lightGray/30 py-20">
			<div className="trusty-container">
				<div className="mb-14 text-center">
					<h2 className="relative mx-auto mb-6 inline-block font-heading text-3xl font-medium text-deepNavy md:text-4xl">
						Frequently Asked Questions
						<span className="absolute -bottom-2 left-0 h-1 w-full bg-gradient-to-r from-trustTeal to-trustTeal/30"></span>
					</h2>
					<p className="mx-auto max-w-2xl text-lg text-deepNavy/80">
						Find answers to common questions about TrustyConvert's file conversion services.
					</p>
				</div>

				<div className="mx-auto max-w-3xl divide-y divide-border">
					{faqs.map((faq, index) => (
						<div key={index} className="py-5">
							<button
								onClick={() => toggleFAQ(index)}
								className="flex w-full items-center justify-between text-left"
							>
								<h3 className="text-lg font-medium text-deepNavy">{faq.question}</h3>
								<div
									className={`ml-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-trustTeal/10 text-trustTeal transition-transform duration-200 ${openIndex === index ? 'rotate-180' : ''}`}
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
										<polyline points="6 9 12 15 18 9"></polyline>
									</svg>
								</div>
							</button>
							<div
								className={`mt-2 overflow-hidden transition-all duration-300 ${
									openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
								}`}
							>
								<p className="pb-4 pt-2 text-deepNavy/80">{faq.answer}</p>
							</div>
						</div>
					))}
				</div>

				<div className="mt-12 text-center">
					<p className="text-deepNavy/80">
						Still have questions?{' '}
						<a href="#" className="font-medium text-trustTeal hover:underline">
							Contact our support team
						</a>
					</p>
				</div>
			</div>
		</section>
	)
}

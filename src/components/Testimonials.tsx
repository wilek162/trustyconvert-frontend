import React from 'react'

interface Testimonial {
	id: string
	name: string
	title?: string
	company?: string
	content: string
	avatar?: string
	rating?: number
}

interface TestimonialsProps {
	title?: string
	subtitle?: string
	testimonials?: Testimonial[]
}

const defaultTestimonials: Testimonial[] = [
	{
		id: '1',
		name: 'Sarah Johnson',
		title: 'Marketing Director',
		company: 'CreativeHub',
		content:
			'TrustyConvert saved us countless hours converting files between formats. The speed and reliability are unmatched!',
		rating: 5
	},
	{
		id: '2',
		name: 'Michael Chen',
		title: 'Data Analyst',
		company: 'DataSense',
		content:
			'As someone who works with different file formats daily, having a secure and fast conversion tool is essential. TrustyConvert delivers exactly that.',
		rating: 5
	},
	{
		id: '3',
		name: 'Elena Rodriguez',
		title: 'Graphic Designer',
		company: 'Freelance',
		content:
			"The image conversion quality is exceptional. I love that my files aren't stored on some random server. Privacy matters!",
		rating: 5
	}
]

export function Testimonials({
	title = 'What Our Users Say',
	subtitle = "Don't just take our word for it. See what others have to say about TrustyConvert.",
	testimonials = defaultTestimonials
}: TestimonialsProps) {
	return (
		<section className="bg-gradient-to-b from-lightGray/30 to-white py-20">
			<div className="trusty-container">
				<div className="mb-14 text-center">
					<h2 className="relative mx-auto mb-6 inline-block font-heading text-3xl font-semibold text-deepNavy md:text-4xl">
						{title}
						<span className="absolute -bottom-2 left-0 h-1 w-full bg-gradient-to-r from-trustTeal to-trustTeal/30"></span>
					</h2>
					<p className="mx-auto max-w-2xl text-lg text-deepNavy/80">{subtitle}</p>
				</div>

				<div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
					{testimonials.map((testimonial) => (
						<div
							key={testimonial.id}
							className="group relative overflow-hidden rounded-xl border border-trustTeal/20 bg-white p-8 shadow-lg transition-all hover:shadow-xl"
						>
							<div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-trustTeal/5 transition-transform duration-500 group-hover:scale-150"></div>

							<div className="relative z-10">
								<div className="mb-4 flex">
									{[...Array(5)].map((_, index) => (
										<svg
											key={index}
											className={`h-5 w-5 ${index < (testimonial.rating || 5) ? 'text-accentOrange' : 'text-gray-300'}`}
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
										</svg>
									))}
								</div>

								<blockquote className="mb-6">
									<p className="text-base text-deepNavy/80">"{testimonial.content}"</p>
								</blockquote>

								<div className="flex items-center">
									<div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-trustTeal/20 to-trustTeal/30 text-trustTeal shadow-inner">
										{testimonial.avatar ? (
											<img
												src={testimonial.avatar}
												alt={testimonial.name}
												className="h-full w-full rounded-full object-cover"
											/>
										) : (
											<span className="text-lg font-medium">{testimonial.name.charAt(0)}</span>
										)}
									</div>
									<div className="ml-3">
										<p className="font-semibold text-deepNavy">{testimonial.name}</p>
										{(testimonial.title || testimonial.company) && (
											<p className="text-sm text-deepNavy/70">
												{testimonial.title}
												{testimonial.title && testimonial.company && ', '}
												{testimonial.company}
											</p>
										)}
									</div>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}

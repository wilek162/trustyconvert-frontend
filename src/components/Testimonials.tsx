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
    content: 'TrustyConvert saved us countless hours converting files between formats. The speed and reliability are unmatched!',
    rating: 5
  },
  {
    id: '2',
    name: 'Michael Chen',
    title: 'Data Analyst',
    company: 'DataSense',
    content: 'As someone who works with different file formats daily, having a secure and fast conversion tool is essential. TrustyConvert delivers exactly that.',
    rating: 5
  },
  {
    id: '3',
    name: 'Elena Rodriguez',
    title: 'Graphic Designer',
    company: 'Freelance',
    content: 'The image conversion quality is exceptional. I love that my files aren\'t stored on some random server. Privacy matters!',
    rating: 5
  }
]

export function Testimonials({
  title = 'What Our Users Say',
  subtitle = 'Don\'t just take our word for it. See what others have to say about TrustyConvert.',
  testimonials = defaultTestimonials
}: TestimonialsProps) {
  return (
    <section className="bg-lightGray py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-semibold tracking-tight text-deepNavy md:text-4xl">{title}</h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">{subtitle}</p>
        </div>
        
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="rounded-xl bg-white p-6 shadow-md">
              <div className="mb-4 flex">
                {[...Array(5)].map((_, index) => (
                  <svg 
                    key={index}
                    className={`h-5 w-5 ${index < (testimonial.rating || 5) ? 'text-yellow-400' : 'text-gray-300'}`}
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              
              <blockquote className="mb-6">
                <p className="text-deepNavy/80">"{testimonial.content}"</p>
              </blockquote>
              
              <div className="flex items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-trustTeal/10 text-trustTeal">
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
                  <p className="font-medium text-deepNavy">{testimonial.name}</p>
                  {(testimonial.title || testimonial.company) && (
                    <p className="text-sm text-muted-foreground">
                      {testimonial.title}
                      {testimonial.title && testimonial.company && ', '}
                      {testimonial.company}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
} 
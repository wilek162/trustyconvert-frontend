import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Define button variants
export const buttonVariants = cva(
	'inline-flex items-center justify-center rounded-button text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background',
	{
		variants: {
			variant: {
				default: 'bg-primary text-primary-foreground hover:bg-primary/90',
				destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
				outline:
					'border-2 border-input bg-background hover:bg-accent/10 hover:text-accent-foreground',
				secondary: 'bg-transparent text-secondary border-2 border-secondary hover:bg-secondary/10',
				ghost: 'hover:bg-accent/10 hover:text-accent-foreground',
				link: 'underline-offset-4 hover:underline text-primary p-0',
				accent: 'bg-accent text-accent-foreground hover:bg-accent/90'
			},
			size: {
				default: 'px-6 py-3', // 24px horizontal, 12px vertical
				sm: 'px-4 py-2 text-xs',
				lg: 'px-8 py-4 text-base',
				icon: 'h-10 w-10'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	}
)

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, asChild = false, ...props }, ref) => {
		return (
			<button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
		)
	}
)
Button.displayName = 'Button'

export { Button }
export default Button

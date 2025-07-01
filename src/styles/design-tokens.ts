export const tokens = {
	colors: {
		// TrustyConvert Brand Colors
		trustTeal: '#329697',
		deepNavy: '#2C3E50',
		pureWhite: '#FFFFFF',
		accentOrange: '#FF8C42',
		lightGray: '#F8F9FA',
		mediumGray: '#6C757D',
		successGreen: '#28A745',
		warningRed: '#DC3545',

		// Theme colors (HSL format for Tailwind)
		primary: '#329697',
		primaryLight: '#5db3b3',
		primaryDark: '#236c6c',
		secondary: '#22313a',
		accent: '#ffb347',
		success: '#3bb273',
		warning: '#ff704d',
		error: '#e74c3c',
		background: '#f7fafb',
		surface: '#ffffff',
		textMain: '#22313a',
		textMuted: '#5a7a8c',
		muted: {
			DEFAULT: 'hsl(var(--muted))',
			foreground: 'hsl(var(--muted-foreground))'
		}
	},
	spacing: {
		0: '0',
		1: '0.25rem',
		2: '0.5rem',
		3: '0.75rem',
		4: '1rem',
		5: '1.25rem',
		6: '1.5rem',
		8: '2rem',
		10: '2.5rem',
		12: '3rem',
		16: '4rem',
		20: '5rem',
		24: '6rem',
		32: '8rem',
		48: '12rem',
		64: '16rem'
	},
	typography: {
		fonts: {
			sans: [
				'Inter',
				'Poppins',
				'ui-sans-serif',
				'system-ui',
				'-apple-system',
				'BlinkMacSystemFont',
				'Segoe UI',
				'Roboto',
				'Helvetica Neue',
				'Arial',
				'sans-serif'
			].join(','),
			heading: ['Poppins', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'].join(','),
			mono: [
				'JetBrains Mono',
				'ui-monospace',
				'SFMono-Regular',
				'Menlo',
				'Monaco',
				'Consolas',
				'monospace'
			].join(',')
		},
		sizes: {
			xs: '0.75rem', // 12px
			sm: '0.875rem', // 14px
			base: '1rem', // 16px
			lg: '1.125rem', // 18px
			xl: '1.25rem', // 20px
			'2xl': '1.5rem', // 24px
			'3xl': '1.875rem', // 30px
			'4xl': '2.25rem', // 36px
			'5xl': '3rem' // 48px
		},
		weights: {
			normal: '400',
			medium: '500',
			semibold: '600',
			bold: '700'
		},
		lineHeights: {
			none: '1',
			tight: '1.25',
			snug: '1.375',
			normal: '1.5',
			relaxed: '1.625',
			loose: '2'
		}
	},
	shadows: {
		sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
		DEFAULT: '0 4px 6px rgba(0,0,0,0.1)',
		md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
		lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
		xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
	},
	radii: {
		none: '0',
		sm: '0.125rem',
		DEFAULT: '0.25rem',
		md: '0.375rem',
		lg: '0.5rem',
		xl: '0.75rem',
		'2xl': '1rem',
		card: '0.75rem', // 12px for cards
		button: '0.5rem', // 8px for buttons
		full: '9999px'
	},
	transitions: {
		DEFAULT: '200ms ease-in-out',
		fast: '100ms ease-in-out',
		slow: '300ms ease-in-out'
	},
	zIndices: {
		0: '0',
		10: '10',
		20: '20',
		30: '30',
		40: '40',
		50: '50',
		auto: 'auto'
	}
} as const

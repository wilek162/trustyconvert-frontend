import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
	test: {
		globals: true,
		environment: 'jsdom',
		include: ['**/*.{test,spec}.{js,ts,jsx,tsx}'],
		coverage: {
			provider: 'v8',
			exclude: ['node_modules/', '.astro/', 'dist/', 'coverage/']
		},
		setupFiles: ['./src/test/setup.ts']
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src')
		}
	}
})

import aspectRatio from '@tailwindcss/aspect-ratio'; // Import ES module
// import typography from '@tailwindcss/typography'; // Import ES module
import colors from 'tailwindcss/colors';

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				// Modern Minimalist Theme
				'cnc-bg': colors.stone[300],         // Pure white background
				'cnc-text': colors.black,       // Near black for primary text
				'cnc-primary': colors.black,    // Rich blue accent
				'cnc-secondary': colors.neutral[800],  // Cool gray for secondary text
				'cnc-border': colors.stone[400],     // Light gray for borders
				'cnc-highlight': colors.stone[100],  // Very light gray for highlights
				'cnc-accent': '#805AD5',     // Purple accent for special elements
				'cnc-success': '#38A169',    // Green for success states
				'cnc-error': '#E53E3E',      // Red for error states
				'cnc-warning': '#DD6B20',    // Orange for warnings
			},
			fontFamily: {
				sans: ['Inter', 'system-ui', 'sans-serif'],
				serif: ['Cormorant Garamond', 'serif'],
				mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
			},
			spacing: {
				'18': '4.5rem',
				'22': '5.5rem',
				'26': '6.5rem',
			},
			borderRadius: {
				'xl': '1rem',
				'2xl': '1.5rem',
			},
			boxShadow: {
				'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
				'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
			},
			transitionDuration: {
				'400': '400ms',
				'600': '600ms',
			},
		},
	},
	plugins: [
		aspectRatio, // Use imported variables
		// typography   // Use imported variables
	],
} 
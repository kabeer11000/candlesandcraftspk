import aspectRatio from '@tailwindcss/aspect-ratio'; // Import ES module
// import typography from '@tailwindcss/typography'; // Import ES module
import colors from 'tailwindcss/colors';

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				// Black Theme
				'cnc-black': colors.stone[300],
				'cnc-dark':  colors.stone[400], // Very dark gray for subtle contrast
				'cnc-medium': colors.stone[500], // Mid-dark gray for borders, backgrounds
				'cnc-dim':   colors.stone[800], // Dimmer text
				'cnc-light': colors.black, // Off-white primary text
				'cnc-highlight': colors.black, // Pure white for highlights
				// Accent can remain or be adjusted - maybe a muted metallic?
				'cnc-accent': '#a16207',
				'cnc-pink': '#FFC0CB'
			},fontFamily: {
				sans: ['Roboto', 'Quicksand', 'sans-serif'],
				serif: ['Roboto', 'Quicksand','sans-serif'],
				mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
			  },			  
			textColor: theme => theme('colors'),
		},
	},
	plugins: [
		aspectRatio, // Use imported variables
		// typography   // Use imported variables
	],
} 
/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				// Black Theme
				'naksh-black': '#000000',
				'naksh-dark':  '#111111', // Very dark gray for subtle contrast
				'naksh-medium':'#222222', // Mid-dark gray for borders, backgrounds
				'naksh-dim':   '#888888', // Dimmer text
				'naksh-light': '#e0e0e0', // Off-white primary text
				'naksh-highlight': '#ffffff', // Pure white for highlights
				// Accent can remain or be adjusted - maybe a muted metallic?
				'naksh-accent': '#a16207',
				'naksh-blue': '#0000FF'
			},
			fontFamily: {
				sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
				serif: ['Playfair Display', 'ui-serif', 'Georgia', 'serif'],
				// Add a mono font for potential industrial accents
				mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'] 
			}
		},
	},
	plugins: [
		require('@tailwindcss/aspect-ratio'), // Ensure aspect ratio plugin is added if not already
		require('@tailwindcss/typography'), // Ensure typography plugin is included
	],
} 
/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				surface: {
					50: '#f8fafc',
					100: '#f1f5f9',
					200: '#e2e8f0',
					300: '#cbd5e1',
					400: '#94a3b8',
					500: '#64748b',
					600: '#475569',
					700: '#334155',
					800: '#1e293b',
					900: '#0f172a',
					950: '#020617'
				},
				accent: {
					DEFAULT: '#6366f1',
					light: '#818cf8',
					dark: '#4f46e5'
				},
				priority: {
					critical: '#ef4444',
					high: '#f97316',
					medium: '#eab308',
					low: '#22c55e'
				},
				status: {
					backlog: '#64748b',
					todo: '#3b82f6',
					in_progress: '#a855f7',
					review: '#f59e0b',
					done: '#22c55e',
					closed: '#6b7280'
				}
			},
			fontFamily: {
				sans: ['JetBrains Mono', 'SF Mono', 'Menlo', 'monospace'],
				display: ['Space Grotesk', 'system-ui', 'sans-serif']
			}
		}
	},
	plugins: []
};

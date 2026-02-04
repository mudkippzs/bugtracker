/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				// True dark terminal palette
				void: {
					DEFAULT: '#0a0a0f',
					50: '#16161f',
					100: '#12121a',
					200: '#0e0e14',
					300: '#0a0a0f',
					400: '#06060a',
					500: '#030305'
				},
				// Cyan terminal accent
				cyber: {
					DEFAULT: '#00f0ff',
					dim: '#00a0aa',
					glow: '#00f0ff',
					muted: '#0a4a4f'
				},
				// Secondary green accent
				matrix: {
					DEFAULT: '#00ff9f',
					dim: '#00aa6a',
					glow: '#00ff9f'
				},
				// Warm accent for warnings/priority
				ember: {
					DEFAULT: '#ff6b35',
					dim: '#aa4520'
				},
				// Text colors
				ghost: {
					DEFAULT: '#8892a0',
					bright: '#c8d0dc',
					dim: '#4a5260'
				},
				// Priority colors - terminal style
				priority: {
					critical: '#ff2a6d',
					high: '#ff6b35',
					medium: '#f0c020',
					low: '#00ff9f'
				},
				// Status colors
				status: {
					backlog: '#4a5260',
					todo: '#00a0ff',
					in_progress: '#a855f7',
					review: '#f0c020',
					done: '#00ff9f',
					closed: '#4a5260'
				}
			},
			fontFamily: {
				mono: ['"IBM Plex Mono"', '"JetBrains Mono"', 'Consolas', 'monospace'],
				display: ['"Share Tech Mono"', 'monospace']
			},
			fontSize: {
				'2xs': ['0.65rem', { lineHeight: '0.9rem' }],
				'xs': ['0.7rem', { lineHeight: '1rem' }],
				'sm': ['0.775rem', { lineHeight: '1.1rem' }],
				'base': ['0.85rem', { lineHeight: '1.25rem' }],
				'lg': ['0.95rem', { lineHeight: '1.35rem' }],
				'xl': ['1.05rem', { lineHeight: '1.45rem' }],
				'2xl': ['1.2rem', { lineHeight: '1.6rem' }]
			},
			boxShadow: {
				'glow-cyan': '0 0 20px rgba(0, 240, 255, 0.15)',
				'glow-cyan-sm': '0 0 10px rgba(0, 240, 255, 0.1)',
				'glow-matrix': '0 0 20px rgba(0, 255, 159, 0.15)',
				'glow-ember': '0 0 20px rgba(255, 107, 53, 0.15)',
				'inner-glow': 'inset 0 0 20px rgba(0, 240, 255, 0.05)'
			},
			animation: {
				'pulse-slow': 'pulse 3s ease-in-out infinite',
				'glow': 'glow 2s ease-in-out infinite alternate',
				'scanline': 'scanline 8s linear infinite',
				'blink': 'blink 1s step-end infinite'
			},
			keyframes: {
				glow: {
					'0%': { opacity: '0.5' },
					'100%': { opacity: '1' }
				},
				scanline: {
					'0%': { transform: 'translateY(-100%)' },
					'100%': { transform: 'translateY(100vh)' }
				},
				blink: {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0' }
				}
			},
			backgroundImage: {
				'grid-pattern': `linear-gradient(rgba(0, 240, 255, 0.03) 1px, transparent 1px),
								linear-gradient(90deg, rgba(0, 240, 255, 0.03) 1px, transparent 1px)`,
				'noise': `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.02'/%3E%3C/svg%3E")`
			}
		}
	},
	plugins: []
};

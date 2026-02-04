import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'dark' | 'light';

// Get initial theme from localStorage or default to dark
function getInitialTheme(): Theme {
	if (browser) {
		const stored = localStorage.getItem('bugtracker-theme');
		if (stored === 'light' || stored === 'dark') {
			return stored;
		}
		// Check system preference
		if (window.matchMedia('(prefers-color-scheme: light)').matches) {
			return 'light';
		}
	}
	return 'dark';
}

function createThemeStore() {
	const { subscribe, set, update } = writable<Theme>(getInitialTheme());

	return {
		subscribe,
		toggle: () => {
			update(current => {
				const newTheme = current === 'dark' ? 'light' : 'dark';
				if (browser) {
					localStorage.setItem('bugtracker-theme', newTheme);
					applyTheme(newTheme);
				}
				return newTheme;
			});
		},
		set: (theme: Theme) => {
			if (browser) {
				localStorage.setItem('bugtracker-theme', theme);
				applyTheme(theme);
			}
			set(theme);
		},
		init: () => {
			if (browser) {
				const theme = getInitialTheme();
				applyTheme(theme);
				set(theme);
			}
		}
	};
}

function applyTheme(theme: Theme) {
	if (browser) {
		document.documentElement.classList.remove('dark', 'light');
		document.documentElement.classList.add(theme);
	}
}

export const theme = createThemeStore();

import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'bugtracker-watchlist';

// Load watchlist from localStorage
function loadWatchlist(): Set<number> {
	if (!browser) return new Set();
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			return new Set(JSON.parse(stored));
		}
	} catch (e) {
		console.error('Failed to load watchlist:', e);
	}
	return new Set();
}

// Persist watchlist to localStorage
function persistWatchlist(issueIds: Set<number>) {
	if (!browser) return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify([...issueIds]));
	} catch (e) {
		console.error('Failed to save watchlist:', e);
	}
}

function createWatchlistStore() {
	const { subscribe, set, update } = writable<Set<number>>(new Set());

	return {
		subscribe,

		// Initialize from localStorage
		init() {
			set(loadWatchlist());
		},

		// Check if an issue is watched
		isWatching(issueId: number): boolean {
			return get({ subscribe }).has(issueId);
		},

		// Toggle watch status
		toggle(issueId: number) {
			update(current => {
				const updated = new Set(current);
				if (updated.has(issueId)) {
					updated.delete(issueId);
				} else {
					updated.add(issueId);
				}
				persistWatchlist(updated);
				return updated;
			});
		},

		// Watch an issue
		watch(issueId: number) {
			update(current => {
				const updated = new Set(current);
				updated.add(issueId);
				persistWatchlist(updated);
				return updated;
			});
		},

		// Unwatch an issue
		unwatch(issueId: number) {
			update(current => {
				const updated = new Set(current);
				updated.delete(issueId);
				persistWatchlist(updated);
				return updated;
			});
		},

		// Get all watched issue IDs
		getAll(): number[] {
			return [...get({ subscribe })];
		}
	};
}

export const watchlist = createWatchlistStore();

import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import type { IssueFilters } from './issues';

export interface SavedFilter {
	id: string;
	name: string;
	filters: IssueFilters;
	createdAt: string;
}

const STORAGE_KEY = 'bugtracker-saved-filters';

// Load saved filters from localStorage
function loadSavedFilters(): SavedFilter[] {
	if (!browser) return [];
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			return JSON.parse(stored);
		}
	} catch (e) {
		console.error('Failed to load saved filters:', e);
	}
	return [];
}

// Persist saved filters to localStorage
function persistFilters(filters: SavedFilter[]) {
	if (!browser) return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
	} catch (e) {
		console.error('Failed to save filters:', e);
	}
}

function createSavedFiltersStore() {
	const { subscribe, set, update } = writable<SavedFilter[]>(loadSavedFilters());

	return {
		subscribe,
		
		// Initialize from localStorage (call on mount)
		init() {
			set(loadSavedFilters());
		},

		// Save a new filter
		save(name: string, filters: IssueFilters): SavedFilter {
			const newFilter: SavedFilter = {
				id: crypto.randomUUID(),
				name,
				filters: { ...filters },
				createdAt: new Date().toISOString()
			};

			update(current => {
				const updated = [...current, newFilter];
				persistFilters(updated);
				return updated;
			});

			return newFilter;
		},

		// Delete a saved filter
		delete(id: string) {
			update(current => {
				const updated = current.filter(f => f.id !== id);
				persistFilters(updated);
				return updated;
			});
		},

		// Update a saved filter
		update(id: string, name: string, filters: IssueFilters) {
			update(current => {
				const updated = current.map(f => 
					f.id === id ? { ...f, name, filters: { ...filters } } : f
				);
				persistFilters(updated);
				return updated;
			});
		},

		// Clear all saved filters
		clear() {
			set([]);
			persistFilters([]);
		}
	};
}

export const savedFilters = createSavedFiltersStore();

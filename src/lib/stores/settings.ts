import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

// Settings interface
export interface UserSettings {
	currentUser: string;
	readState: Record<number, string>; // issueId -> lastReadTimestamp (ISO string)
}

const STORAGE_KEY = 'bugtracker-settings';

// Default settings
const defaultSettings: UserSettings = {
	currentUser: 'dev',
	readState: {}
};

// Load settings from localStorage
function loadSettings(): UserSettings {
	if (!browser) return defaultSettings;
	
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			return { ...defaultSettings, ...parsed };
		}
	} catch (e) {
		console.error('Failed to load settings:', e);
	}
	return defaultSettings;
}

// Save settings to localStorage
function saveSettings(settings: UserSettings) {
	if (!browser) return;
	
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
	} catch (e) {
		console.error('Failed to save settings:', e);
	}
}

// Create the settings store
function createSettingsStore() {
	const { subscribe, set, update } = writable<UserSettings>(defaultSettings);

	return {
		subscribe,
		
		// Initialize from localStorage (call on mount)
		init() {
			const settings = loadSettings();
			set(settings);
		},
		
		// Set current user
		setUser(username: string) {
			update(s => {
				const updated = { ...s, currentUser: username };
				saveSettings(updated);
				return updated;
			});
		},
		
		// Mark an issue as read (update read timestamp)
		markAsRead(issueId: number) {
			update(s => {
				const updated = {
					...s,
					readState: {
						...s.readState,
						[issueId]: new Date().toISOString()
					}
				};
				saveSettings(updated);
				return updated;
			});
		},
		
		// Check if issue has unread content (newer than last read)
		hasUnread(issueId: number, latestActivityAt: string | null): boolean {
			if (!latestActivityAt) return false;
			
			const settings = get({ subscribe });
			const lastRead = settings.readState[issueId];
			
			if (!lastRead) return true; // Never read = unread
			
			return new Date(latestActivityAt) > new Date(lastRead);
		},
		
		// Get last read timestamp for an issue
		getLastRead(issueId: number): string | null {
			const settings = get({ subscribe });
			return settings.readState[issueId] || null;
		},
		
		// Get current user
		getCurrentUser(): string {
			return get({ subscribe }).currentUser;
		},
		
		// Reset all settings
		reset() {
			set(defaultSettings);
			saveSettings(defaultSettings);
		}
	};
}

export const settings = createSettingsStore();

// Derived store for just the current user (convenience)
export const currentUser = {
	subscribe: (fn: (value: string) => void) => {
		return settings.subscribe(s => fn(s.currentUser));
	}
};

import { writable } from 'svelte/store';

// Track if keyboard shortcuts modal is open
export const showShortcutsModal = writable(false);

// Track if command palette is open
export const showCommandPalette = writable(false);

// Track if a modal or input is active (to disable shortcuts)
export const isInputActive = writable(false);

// Track the currently focused/selected issue index for j/k navigation
export const focusedIssueIndex = writable<number>(-1);

// Shortcut definitions for display
export const shortcuts = [
	{ key: '⌘K', description: 'Open command palette', section: 'General' },
	{ key: 'n', description: 'New issue', section: 'General' },
	{ key: '/', description: 'Focus search', section: 'General' },
	{ key: 'Escape', description: 'Close modal / Clear selection', section: 'General' },
	{ key: '?', description: 'Show keyboard shortcuts', section: 'General' },
	{ key: 'j', description: 'Move down in list', section: 'Navigation' },
	{ key: 'k', description: 'Move up in list', section: 'Navigation' },
	{ key: 'Enter', description: 'Open focused issue', section: 'Navigation' },
	{ key: 'g then h', description: 'Go to dashboard', section: 'Navigation' },
	{ key: 'g then p', description: 'Go to projects', section: 'Navigation' },
	{ key: 'g then a', description: 'Go to analytics', section: 'Navigation' },
];

// Group shortcuts by section
export function getShortcutsBySection() {
	const sections: Record<string, typeof shortcuts> = {};
	for (const shortcut of shortcuts) {
		if (!sections[shortcut.section]) {
			sections[shortcut.section] = [];
		}
		sections[shortcut.section].push(shortcut);
	}
	return sections;
}

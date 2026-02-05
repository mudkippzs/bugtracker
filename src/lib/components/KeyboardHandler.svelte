<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { showShortcutsModal, focusedIssueIndex } from '$lib/stores/keyboard';
	import { filteredIssues } from '$lib/stores/issues';
	import { selectedIssues } from '$lib/stores/selection';

	interface Props {
		onNewIssue?: () => void;
	}

	let { onNewIssue }: Props = $props();

	let waitingForG = $state(false);
	let gTimeout: ReturnType<typeof setTimeout> | null = null;

	function isInputElement(target: EventTarget | null): boolean {
		if (!target) return false;
		const tagName = (target as HTMLElement).tagName?.toLowerCase();
		return tagName === 'input' || tagName === 'textarea' || tagName === 'select' ||
			(target as HTMLElement).isContentEditable;
	}

	function isModalOpen(): boolean {
		// Check for any modal overlays
		return document.querySelector('[role="dialog"]') !== null;
	}

	function handleKeydown(e: KeyboardEvent) {
		// Don't handle if typing in an input
		if (isInputElement(e.target)) return;

		// Don't handle if a modal is open (except Escape and ?)
		const modalOpen = isModalOpen();
		if (modalOpen && e.key !== 'Escape' && e.key !== '?') return;

		// Handle g+key navigation
		if (waitingForG) {
			waitingForG = false;
			if (gTimeout) clearTimeout(gTimeout);
			
			switch (e.key) {
				case 'h':
					e.preventDefault();
					goto('/');
					return;
				case 'p':
					e.preventDefault();
					goto('/projects');
					return;
				case 'a':
					e.preventDefault();
					goto('/analytics');
					return;
			}
		}

		switch (e.key) {
			case '?':
				e.preventDefault();
				showShortcutsModal.update(v => !v);
				break;

			case 'Escape':
				e.preventDefault();
				// Close shortcuts modal if open
				showShortcutsModal.set(false);
				// Clear selection
				selectedIssues.clear();
				// Reset focused index
				focusedIssueIndex.set(-1);
				break;

			case 'n':
				if (!modalOpen && onNewIssue) {
					e.preventDefault();
					onNewIssue();
				}
				break;

			case '/':
				if (!modalOpen) {
					e.preventDefault();
					// Focus the search input
					const searchInput = document.querySelector('input[placeholder="Search..."]') as HTMLInputElement;
					if (searchInput) {
						searchInput.focus();
						searchInput.select();
					}
				}
				break;

			case 'g':
				if (!modalOpen) {
					e.preventDefault();
					waitingForG = true;
					// Clear after 1 second
					gTimeout = setTimeout(() => {
						waitingForG = false;
					}, 1000);
				}
				break;

			case 'j':
				if (!modalOpen) {
					e.preventDefault();
					// Move down in the list
					focusedIssueIndex.update(idx => {
						const issues = $filteredIssues;
						if (issues.length === 0) return -1;
						return Math.min(idx + 1, issues.length - 1);
					});
				}
				break;

			case 'k':
				if (!modalOpen) {
					e.preventDefault();
					// Move up in the list
					focusedIssueIndex.update(idx => {
						if (idx <= 0) return 0;
						return idx - 1;
					});
				}
				break;

			case 'Enter':
				if (!modalOpen) {
					const idx = $focusedIssueIndex;
					const issues = $filteredIssues;
					if (idx >= 0 && idx < issues.length) {
						e.preventDefault();
						const issue = issues[idx];
						goto(`/projects/${issue.projectId}/issues/${issue.id}`);
					}
				}
				break;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

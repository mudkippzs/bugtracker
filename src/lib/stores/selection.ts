import { writable, derived } from 'svelte/store';

// Selection store for multi-select functionality
function createSelectionStore() {
	const { subscribe, set, update } = writable<Set<number>>(new Set());
	let lastSelectedId: number | null = null;

	return {
		subscribe,
		
		select: (id: number) => update(s => {
			s.add(id);
			lastSelectedId = id;
			return new Set(s);
		}),
		
		deselect: (id: number) => update(s => {
			s.delete(id);
			return new Set(s);
		}),
		
		toggle: (id: number) => update(s => {
			if (s.has(id)) {
				s.delete(id);
			} else {
				s.add(id);
				lastSelectedId = id;
			}
			return new Set(s);
		}),
		
		selectRange: (ids: number[], targetId: number) => update(s => {
			if (lastSelectedId === null) {
				s.add(targetId);
				lastSelectedId = targetId;
				return new Set(s);
			}
			
			const lastIndex = ids.indexOf(lastSelectedId);
			const currentIndex = ids.indexOf(targetId);
			
			if (lastIndex !== -1 && currentIndex !== -1) {
				const start = Math.min(lastIndex, currentIndex);
				const end = Math.max(lastIndex, currentIndex);
				for (let i = start; i <= end; i++) {
					s.add(ids[i]);
				}
			}
			return new Set(s);
		}),
		
		selectAll: (ids: number[]) => update(s => {
			for (const id of ids) {
				s.add(id);
			}
			return new Set(s);
		}),
		
		clear: () => {
			lastSelectedId = null;
			set(new Set());
		},
		
		getLastSelected: () => lastSelectedId
	};
}

export const selectedIssues = createSelectionStore();
export const hasIssueSelection = derived(selectedIssues, $s => $s.size > 0);
export const selectedIssueCount = derived(selectedIssues, $s => $s.size);

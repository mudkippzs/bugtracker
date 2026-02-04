import { writable, derived } from 'svelte/store';
import type { Issue, Project } from '$lib/db/schema';

// Store for all issues
export const issues = writable<Issue[]>([]);

// Store for current project
export const currentProject = writable<Project | null>(null);

// Store for all projects
export const projects = writable<Project[]>([]);

// Store for view mode
export type ViewMode = 'list' | 'kanban';
export const viewMode = writable<ViewMode>('kanban');

// Store for filters
export interface IssueFilters {
	type: string | null;
	priority: string | null;
	status: string | null;
	search: string;
}

export const filters = writable<IssueFilters>({
	type: null,
	priority: null,
	status: null,
	search: ''
});

// Derived store for filtered issues
export const filteredIssues = derived(
	[issues, filters],
	([$issues, $filters]) => {
		return $issues.filter(issue => {
			if ($filters.type && issue.type !== $filters.type) return false;
			if ($filters.priority && issue.priority !== $filters.priority) return false;
			if ($filters.status && issue.status !== $filters.status) return false;
			if ($filters.search) {
				const search = $filters.search.toLowerCase();
				if (!issue.title.toLowerCase().includes(search) && 
					!issue.description?.toLowerCase().includes(search)) {
					return false;
				}
			}
			return true;
		});
	}
);

// Derived store for issues grouped by status (for kanban)
export const issuesByStatus = derived(filteredIssues, ($filteredIssues) => {
	const grouped: Record<string, Issue[]> = {
		backlog: [],
		todo: [],
		in_progress: [],
		review: [],
		done: [],
		closed: []
	};

	for (const issue of $filteredIssues) {
		if (grouped[issue.status]) {
			grouped[issue.status].push(issue);
		}
	}

	return grouped;
});

// Real-time event store for WebSocket updates
export interface RealtimeEvent {
	type: 'issue_created' | 'issue_updated' | 'issue_deleted' | 'comment_added';
	data: unknown;
	timestamp: string;
}

export const realtimeEvents = writable<RealtimeEvent[]>([]);

// Add a real-time event
export function addRealtimeEvent(event: RealtimeEvent) {
	realtimeEvents.update(events => {
		const updated = [event, ...events].slice(0, 50); // Keep last 50 events
		return updated;
	});
}

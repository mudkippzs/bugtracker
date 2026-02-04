import { writable, derived, get } from 'svelte/store';
import type { Issue, Project, Comment } from '$lib/db/schema';

// Extended issue type with comment metadata
export interface IssueWithMeta extends Issue {
	commentCount?: number;
	latestCommentAt?: string | null;
}

// Store for all issues (with comment metadata)
export const issues = writable<IssueWithMeta[]>([]);

// Store for current project
export const currentProject = writable<Project | null>(null);

// Store for all projects (with issue counts)
export const projects = writable<(Project & { issueCount?: number })[]>([]);

// Store for current issue detail (with comments, commits, history)
export interface IssueDetail extends Issue {
	project?: Project;
	comments: Comment[];
	commits: Array<{ id: number; hash: string; branch?: string; title?: string; createdAt: string }>;
	history: Array<{ id: number; field: string; oldValue: string | null; newValue: string | null; changedBy: string; changedAt: string }>;
	children: Issue[];
}
export const currentIssue = writable<IssueDetail | null>(null);

// Store for view mode
export type ViewMode = 'list' | 'kanban';
export const viewMode = writable<ViewMode>('kanban');

// Store for filters
export interface IssueFilters {
	type: string | null;
	priority: string | null;
	status: string | null;
	search: string;
	assignee: string | null;
}

export const filters = writable<IssueFilters>({
	type: null,
	priority: null,
	status: null,
	search: '',
	assignee: null
});

// Filter state alias for backwards compatibility
export const filterState = filters;

// Derived store for filtered issues
export const filteredIssues = derived(
	[issues, filters],
	([$issues, $filters]) => {
		if (!$issues || !$filters) return [];
		return $issues.filter(issue => {
			if ($filters.type && issue.type !== $filters.type) return false;
			if ($filters.priority && issue.priority !== $filters.priority) return false;
			if ($filters.status && issue.status !== $filters.status) return false;
			if ($filters.assignee && issue.assignee !== $filters.assignee) return false;
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

	if (!$filteredIssues) return grouped;

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

// Fetch all projects
export async function fetchProjects() {
	try {
		const res = await fetch('/api/projects');
		if (res.ok) {
			const data = await res.json();
			projects.set(data);
			return data;
		}
	} catch (error) {
		console.error('Failed to fetch projects:', error);
	}
	return [];
}

// Fetch issues for a project
export async function getIssues(projectId: number) {
	try {
		const res = await fetch(`/api/issues?projectId=${projectId}`);
		if (res.ok) {
			const data = await res.json();
			issues.set(data);
			return data;
		}
	} catch (error) {
		console.error('Failed to fetch issues:', error);
	}
	return [];
}

// Fetch a single issue with full details
export async function fetchIssueDetail(issueId: number) {
	try {
		const res = await fetch(`/api/issues/${issueId}`);
		if (res.ok) {
			const data = await res.json();
			currentIssue.set(data);
			return data;
		}
	} catch (error) {
		console.error('Failed to fetch issue:', error);
	}
	return null;
}

// Update an issue
export async function updateIssue(projectId: number, issueId: number, data: Partial<Issue>) {
	try {
		const res = await fetch(`/api/issues/${issueId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});
		if (res.ok) {
			const updated = await res.json();
			// Local update will happen via SSE, but update currentIssue immediately for responsiveness
			currentIssue.update(current => current?.id === issueId ? { ...current, ...updated } : current);
			return updated;
		}
	} catch (error) {
		console.error('Failed to update issue:', error);
	}
	return null;
}

// Add a comment to an issue
export async function addComment(issueId: number, content: string, author: string = 'You') {
	try {
		const res = await fetch(`/api/issues/${issueId}/comments`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ content, author })
		});
		if (res.ok) {
			return await res.json();
		}
	} catch (error) {
		console.error('Failed to add comment:', error);
	}
	return null;
}

// Clear filters
export function clearFilters() {
	filters.set({
		type: null,
		priority: null,
		status: null,
		search: '',
		assignee: null
	});
}

// Apply a single filter
export function applyFilter(key: keyof IssueFilters, value: string | null) {
	filters.update(f => ({ ...f, [key]: value || null }));
}

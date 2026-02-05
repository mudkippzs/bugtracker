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

// Store for sorting
export type SortField = 'updatedAt' | 'createdAt' | 'priority' | 'title' | 'id';
export type SortOrder = 'asc' | 'desc';

export interface SortConfig {
	field: SortField;
	order: SortOrder;
}

// Load sort preference from localStorage
function loadSortConfig(): SortConfig {
	if (typeof window !== 'undefined') {
		try {
			const stored = localStorage.getItem('bugtracker-sort');
			if (stored) {
				return JSON.parse(stored);
			}
		} catch (e) {
			console.error('Failed to load sort config:', e);
		}
	}
	return { field: 'updatedAt', order: 'desc' };
}

// Save sort preference to localStorage
function saveSortConfig(config: SortConfig) {
	if (typeof window !== 'undefined') {
		try {
			localStorage.setItem('bugtracker-sort', JSON.stringify(config));
		} catch (e) {
			console.error('Failed to save sort config:', e);
		}
	}
}

// Create sort store with persistence
function createSortStore() {
	const { subscribe, set, update } = writable<SortConfig>(loadSortConfig());

	return {
		subscribe,
		setField(field: SortField) {
			update(config => {
				// If same field, toggle order; otherwise, set new field with default order
				const newConfig = config.field === field
					? { ...config, order: config.order === 'asc' ? 'desc' as SortOrder : 'asc' as SortOrder }
					: { field, order: 'desc' as SortOrder };
				saveSortConfig(newConfig);
				return newConfig;
			});
		},
		setOrder(order: SortOrder) {
			update(config => {
				const newConfig = { ...config, order };
				saveSortConfig(newConfig);
				return newConfig;
			});
		},
		reset() {
			const defaultConfig = { field: 'updatedAt' as SortField, order: 'desc' as SortOrder };
			set(defaultConfig);
			saveSortConfig(defaultConfig);
		}
	};
}

export const sortConfig = createSortStore();

// Priority order for sorting
const priorityOrder: Record<string, number> = {
	critical: 0,
	high: 1,
	medium: 2,
	low: 3
};

// Sort function
function sortIssues(issues: IssueWithMeta[], config: SortConfig): IssueWithMeta[] {
	const sorted = [...issues].sort((a, b) => {
		let comparison = 0;

		switch (config.field) {
			case 'updatedAt':
				comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
				break;
			case 'createdAt':
				comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
				break;
			case 'priority':
				comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
				break;
			case 'title':
				comparison = a.title.localeCompare(b.title);
				break;
			case 'id':
				comparison = a.id - b.id;
				break;
		}

		return config.order === 'asc' ? comparison : -comparison;
	});

	return sorted;
}

// Store for filters
export interface IssueFilters {
	type: string | null;
	priority: string | null;
	status: string | null;
	search: string;
	assignee: string | null;
	overdue: boolean;
	label: string | null;
}

export const filters = writable<IssueFilters>({
	type: null,
	priority: null,
	status: null,
	search: '',
	assignee: null,
	overdue: false,
	label: null
});

// Helper to check if an issue is overdue
function isIssueOverdue(issue: IssueWithMeta): boolean {
	if (!issue.dueDate) return false;
	if (issue.status === 'done' || issue.status === 'closed') return false;
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	return new Date(issue.dueDate) < today;
}

// Helper to check if an issue has a specific label
function issueHasLabel(issue: IssueWithMeta, label: string): boolean {
	if (!issue.labels) return false;
	try {
		const labels: string[] = JSON.parse(issue.labels);
		return labels.includes(label);
	} catch {
		return false;
	}
}

// Filter state alias for backwards compatibility
export const filterState = filters;

// Derived store for filtered and sorted issues
export const filteredIssues = derived(
	[issues, filters, sortConfig],
	([$issues, $filters, $sortConfig]) => {
		if (!$issues || !$filters) return [];
		
		// First filter
		const filtered = $issues.filter(issue => {
			if ($filters.type && issue.type !== $filters.type) return false;
			if ($filters.priority && issue.priority !== $filters.priority) return false;
			if ($filters.status && issue.status !== $filters.status) return false;
			if ($filters.assignee && issue.assignee !== $filters.assignee) return false;
			if ($filters.overdue && !isIssueOverdue(issue)) return false;
			if ($filters.label && !issueHasLabel(issue, $filters.label)) return false;
			if ($filters.search) {
				const search = $filters.search.toLowerCase();
				if (!issue.title.toLowerCase().includes(search) && 
					!issue.description?.toLowerCase().includes(search)) {
					return false;
				}
			}
			return true;
		});

		// Then sort
		return sortIssues(filtered, $sortConfig);
	}
);

// Derived store for issues grouped by status (for kanban), respecting sort order
export const issuesByStatus = derived(filteredIssues, ($filteredIssues) => {
	const grouped: Record<string, IssueWithMeta[]> = {
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
		assignee: null,
		overdue: false,
		label: null
	});
}

// Apply a single filter
export function applyFilter(key: keyof IssueFilters, value: string | null) {
	filters.update(f => ({ ...f, [key]: value || null }));
}

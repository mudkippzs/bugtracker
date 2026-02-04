import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { issues, projects, currentIssue, addRealtimeEvent, type IssueDetail } from './issues';
import type { Issue, Project, Comment } from '$lib/db/schema';

export const wsConnected = writable(false);
export const wsError = writable<string | null>(null);

// Track IDs of comments that just arrived via SSE (for flash animation)
export const newCommentIds = writable<Set<number>>(new Set());

// Helper to add a new comment ID and auto-remove after animation
export function markCommentAsNew(commentId: number) {
	newCommentIds.update(ids => {
		const newSet = new Set(ids);
		newSet.add(commentId);
		return newSet;
	});
	
	// Remove after animation completes (2 seconds)
	setTimeout(() => {
		newCommentIds.update(ids => {
			const newSet = new Set(ids);
			newSet.delete(commentId);
			return newSet;
		});
	}, 2000);
}

let eventSource: EventSource | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

export function connectWebSocket() {
	if (!browser) return;
	if (eventSource?.readyState === EventSource.OPEN) return;

	try {
		eventSource = new EventSource('/api/events');

		eventSource.onopen = () => {
			wsConnected.set(true);
			wsError.set(null);
			reconnectAttempts = 0;
			console.log('SSE connected');
		};

		eventSource.onerror = () => {
			wsConnected.set(false);
			eventSource?.close();
			eventSource = null;

			if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
				reconnectTimeout = setTimeout(() => {
					reconnectAttempts++;
					connectWebSocket();
				}, RECONNECT_DELAY);
			} else {
				wsError.set('Connection failed');
			}
		};

		eventSource.onmessage = (event) => {
			try {
				const message = JSON.parse(event.data);
				if (message.type !== 'connected') {
					handleMessage(message);
				}
			} catch (error) {
				console.error('Failed to parse SSE message:', error);
			}
		};
	} catch (error) {
		console.error('Failed to create EventSource:', error);
		wsError.set('Failed to connect');
	}
}

export function disconnectWebSocket() {
	if (reconnectTimeout) {
		clearTimeout(reconnectTimeout);
		reconnectTimeout = null;
	}
	if (eventSource) {
		eventSource.close();
		eventSource = null;
	}
	wsConnected.set(false);
}

function handleMessage(message: { type: string; data: unknown }) {
	const timestamp = new Date().toISOString();

	switch (message.type) {
		// Issue events
		case 'issue_created': {
			const newIssue = message.data as Issue;
			issues.update(currentIssues => {
				// Only add if not already present and matches current project
				if (currentIssues.some(i => i.id === newIssue.id)) return currentIssues;
				const current = currentIssues[0];
				if (current && current.projectId !== newIssue.projectId) return currentIssues;
				return [newIssue, ...currentIssues];
			});
			// Update project issue count
			projects.update(ps => ps.map(p => 
				p.id === newIssue.projectId 
					? { ...p, issueCount: (p.issueCount || 0) + 1 }
					: p
			));
			addRealtimeEvent({ type: 'issue_created', data: newIssue, timestamp });
			break;
		}

		case 'issue_updated': {
			const updatedIssue = message.data as Issue;
			issues.update(currentIssues => 
				currentIssues.map(issue => 
					issue.id === updatedIssue.id ? { ...issue, ...updatedIssue } : issue
				)
			);
			// Also update currentIssue if it's the one being viewed
			currentIssue.update(current => {
				if (current?.id === updatedIssue.id) {
					return { ...current, ...updatedIssue };
				}
				return current;
			});
			addRealtimeEvent({ type: 'issue_updated', data: updatedIssue, timestamp });
			break;
		}

		case 'issue_deleted': {
			const { id, projectId } = message.data as { id: number; projectId?: number };
			issues.update(currentIssues => 
				currentIssues.filter(issue => issue.id !== id)
			);
			// Update project issue count
			if (projectId) {
				projects.update(ps => ps.map(p => 
					p.id === projectId 
						? { ...p, issueCount: Math.max(0, (p.issueCount || 0) - 1) }
						: p
				));
			}
			addRealtimeEvent({ type: 'issue_deleted', data: { id }, timestamp });
			break;
		}

		// Comment events
		case 'comment_added': {
			const comment = message.data as Comment & { issueId: number };
			// Update currentIssue comments if viewing that issue
			currentIssue.update(current => {
				if (current?.id === comment.issueId) {
					const exists = current.comments.some(c => c.id === comment.id);
					if (!exists) {
						// Mark as new for flash animation
						markCommentAsNew(comment.id);
						return { ...current, comments: [...current.comments, comment] };
					}
				}
				return current;
			});
			// Update issue metadata (comment count and latest timestamp)
			issues.update(currentIssues => 
				currentIssues.map(issue => {
					if (issue.id === comment.issueId) {
						return {
							...issue,
							commentCount: (issue.commentCount || 0) + 1,
							latestCommentAt: comment.createdAt
						};
					}
					return issue;
				})
			);
			addRealtimeEvent({ type: 'comment_added', data: comment, timestamp });
			break;
		}

		case 'comment_updated': {
			const comment = message.data as Comment & { issueId: number };
			currentIssue.update(current => {
				if (current?.id === comment.issueId) {
					return {
						...current,
						comments: current.comments.map(c => c.id === comment.id ? comment : c)
					};
				}
				return current;
			});
			break;
		}

		case 'comment_deleted': {
			const { id, issueId } = message.data as { id: number; issueId: number };
			currentIssue.update(current => {
				if (current?.id === issueId) {
					return {
						...current,
						comments: current.comments.map(c => 
							c.id === id ? { ...c, isDeleted: true } : c
						)
					};
				}
				return current;
			});
			break;
		}

		// Project events
		case 'project_created': {
			const newProject = message.data as Project & { issueCount?: number };
			projects.update(ps => {
				if (ps.some(p => p.id === newProject.id)) return ps;
				return [...ps, { ...newProject, issueCount: 0 }];
			});
			break;
		}

		case 'project_updated': {
			const updatedProject = message.data as Project;
			projects.update(ps => 
				ps.map(p => p.id === updatedProject.id ? { ...p, ...updatedProject } : p)
			);
			break;
		}

		case 'project_deleted': {
			const { id } = message.data as { id: number };
			projects.update(ps => ps.filter(p => p.id !== id));
			break;
		}

		// Commit events
		case 'commit_linked': {
			const commit = message.data as { issueId: number; id: number; hash: string; branch?: string; title?: string; createdAt: string };
			currentIssue.update(current => {
				if (current?.id === commit.issueId) {
					const exists = current.commits.some(c => c.id === commit.id);
					if (!exists) {
						return { ...current, commits: [...current.commits, commit] };
					}
				}
				return current;
			});
			break;
		}

		// History events
		case 'history_added': {
			const entry = message.data as { issueId: number; id: number; field: string; oldValue: string | null; newValue: string | null; changedBy: string; changedAt: string };
			currentIssue.update(current => {
				if (current?.id === entry.issueId) {
					const exists = current.history.some(h => h.id === entry.id);
					if (!exists) {
						return { ...current, history: [entry, ...current.history] };
					}
				}
				return current;
			});
			break;
		}

		default:
			console.log('Unknown message type:', message.type);
	}
}

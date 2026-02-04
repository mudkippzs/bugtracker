import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { issues, addRealtimeEvent } from './issues';
import type { Issue } from '$lib/db/schema';

export const wsConnected = writable(false);
export const wsError = writable<string | null>(null);

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
		case 'issue_created': {
			const newIssue = message.data as Issue;
			issues.update(currentIssues => [newIssue, ...currentIssues]);
			addRealtimeEvent({ type: 'issue_created', data: newIssue, timestamp });
			break;
		}

		case 'issue_updated': {
			const updatedIssue = message.data as Issue;
			issues.update(currentIssues => 
				currentIssues.map(issue => 
					issue.id === updatedIssue.id ? updatedIssue : issue
				)
			);
			addRealtimeEvent({ type: 'issue_updated', data: updatedIssue, timestamp });
			break;
		}

		case 'issue_deleted': {
			const { id } = message.data as { id: number };
			issues.update(currentIssues => 
				currentIssues.filter(issue => issue.id !== id)
			);
			addRealtimeEvent({ type: 'issue_deleted', data: { id }, timestamp });
			break;
		}

		case 'comment_added': {
			addRealtimeEvent({ type: 'comment_added', data: message.data, timestamp });
			break;
		}

		default:
			console.log('Unknown message type:', message.type);
	}
}

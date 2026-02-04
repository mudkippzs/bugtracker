// Server-side event broadcasting
// This module manages real-time updates

type Listener = (event: { type: string; data: unknown }) => void;

const listeners = new Set<Listener>();

export function subscribe(listener: Listener): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function broadcast(type: string, data: unknown) {
	const event = { type, data };
	for (const listener of listeners) {
		try {
			listener(event);
		} catch (error) {
			console.error('Broadcast listener error:', error);
		}
	}
}

// Event types
export type BroadcastEvent = 
	| { type: 'issue_created'; data: unknown }
	| { type: 'issue_updated'; data: unknown }
	| { type: 'issue_deleted'; data: { id: number } }
	| { type: 'comment_added'; data: unknown }
	| { type: 'project_created'; data: unknown }
	| { type: 'project_updated'; data: unknown }
	| { type: 'project_deleted'; data: { id: number } };

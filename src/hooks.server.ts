import type { Handle } from '@sveltejs/kit';

// Store for WebSocket connections
const wsConnections = new Set<WebSocket>();

// Broadcast to all connected clients
export function broadcast(type: string, data: unknown) {
	const message = JSON.stringify({ type, data });
	for (const ws of wsConnections) {
		if (ws.readyState === 1) { // OPEN
			ws.send(message);
		}
	}
}

export const handle: Handle = async ({ event, resolve }) => {
	// Handle WebSocket upgrade for /api/ws
	if (event.url.pathname === '/api/ws') {
		// WebSocket handling would require a custom server setup
		// For now, we'll use server-sent events as a fallback
		// or implement WebSocket via a separate server
	}

	const response = await resolve(event);
	return response;
};

// Export for use in API routes
export { wsConnections };

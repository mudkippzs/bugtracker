import type { RequestHandler } from './$types';
import { subscribe } from '$lib/server/broadcast';

// Server-Sent Events endpoint for real-time updates
export const GET: RequestHandler = async ({ request }) => {
	let isClosed = false;
	let pingInterval: ReturnType<typeof setInterval> | null = null;
	let unsubscribe: (() => void) | null = null;

	const stream = new ReadableStream({
		start(controller) {
			const encoder = new TextEncoder();

			const send = (data: string) => {
				if (isClosed) return;
				try {
					controller.enqueue(encoder.encode(data));
				} catch {
					cleanup();
				}
			};

			const cleanup = () => {
				if (isClosed) return;
				isClosed = true;
				if (pingInterval) clearInterval(pingInterval);
				if (unsubscribe) unsubscribe();
				try {
					controller.close();
				} catch {
					// Already closed
				}
			};

			// Send initial connection message
			send('data: {"type":"connected"}\n\n');

			// Subscribe to broadcasts
			unsubscribe = subscribe((event) => {
				const data = JSON.stringify(event);
				send(`data: ${data}\n\n`);
			});

			// Handle client disconnect
			request.signal.addEventListener('abort', cleanup);

			// Keep-alive ping every 30 seconds
			pingInterval = setInterval(() => {
				send(': ping\n\n');
			}, 30000);
		},
		cancel() {
			isClosed = true;
			if (pingInterval) clearInterval(pingInterval);
			if (unsubscribe) unsubscribe();
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive'
		}
	});
};

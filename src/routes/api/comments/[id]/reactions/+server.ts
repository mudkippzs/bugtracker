import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/db';
import { comments } from '$lib/db/schema';
import { eq } from 'drizzle-orm';

type ReactionMap = Record<string, string[]>;

// POST /api/comments/:id/reactions - Add a reaction
export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const commentId = parseInt(params.id);
		if (isNaN(commentId)) {
			return json({ error: 'Invalid comment ID' }, { status: 400 });
		}

		const body = await request.json();
		const { emoji, user } = body;

		if (!emoji || !user) {
			return json({ error: 'Emoji and user are required' }, { status: 400 });
		}

		// Get current comment
		const [comment] = await db.select().from(comments).where(eq(comments.id, commentId));
		if (!comment) {
			return json({ error: 'Comment not found' }, { status: 404 });
		}

		// Parse existing reactions
		let reactions: ReactionMap = {};
		if (comment.reactions) {
			try {
				reactions = JSON.parse(comment.reactions);
			} catch {
				reactions = {};
			}
		}

		// Add reaction
		if (!reactions[emoji]) {
			reactions[emoji] = [];
		}
		if (!reactions[emoji].includes(user)) {
			reactions[emoji].push(user);
		}

		// Update comment
		const [updated] = await db
			.update(comments)
			.set({ reactions: JSON.stringify(reactions) })
			.where(eq(comments.id, commentId))
			.returning();

		return json({ reactions });
	} catch (error) {
		console.error('Failed to add reaction:', error);
		return json({ error: 'Failed to add reaction' }, { status: 500 });
	}
};

// DELETE /api/comments/:id/reactions - Remove a reaction
export const DELETE: RequestHandler = async ({ params, request }) => {
	try {
		const commentId = parseInt(params.id);
		if (isNaN(commentId)) {
			return json({ error: 'Invalid comment ID' }, { status: 400 });
		}

		const body = await request.json();
		const { emoji, user } = body;

		if (!emoji || !user) {
			return json({ error: 'Emoji and user are required' }, { status: 400 });
		}

		// Get current comment
		const [comment] = await db.select().from(comments).where(eq(comments.id, commentId));
		if (!comment) {
			return json({ error: 'Comment not found' }, { status: 404 });
		}

		// Parse existing reactions
		let reactions: ReactionMap = {};
		if (comment.reactions) {
			try {
				reactions = JSON.parse(comment.reactions);
			} catch {
				reactions = {};
			}
		}

		// Remove reaction
		if (reactions[emoji]) {
			reactions[emoji] = reactions[emoji].filter(u => u !== user);
			if (reactions[emoji].length === 0) {
				delete reactions[emoji];
			}
		}

		// Update comment
		await db
			.update(comments)
			.set({ reactions: Object.keys(reactions).length > 0 ? JSON.stringify(reactions) : null })
			.where(eq(comments.id, commentId));

		return json({ reactions });
	} catch (error) {
		console.error('Failed to remove reaction:', error);
		return json({ error: 'Failed to remove reaction' }, { status: 500 });
	}
};

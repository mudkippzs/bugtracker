import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { comments, issues } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { broadcast } from '$lib/server/broadcast';

// GET /api/issues/:id/comments - Get comments for an issue
export const GET: RequestHandler = async ({ params }) => {
	try {
		const issueId = parseInt(params.id);
		if (isNaN(issueId)) {
			return json({ error: 'Invalid issue ID' }, { status: 400 });
		}

		const issueComments = await db
			.select()
			.from(comments)
			.where(eq(comments.issueId, issueId))
			.orderBy(comments.createdAt);

		return json(issueComments);
	} catch (error) {
		console.error('Failed to fetch comments:', error);
		return json({ error: 'Failed to fetch comments' }, { status: 500 });
	}
};

// POST /api/issues/:id/comments - Add a comment to an issue
export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const issueId = parseInt(params.id);
		if (isNaN(issueId)) {
			return json({ error: 'Invalid issue ID' }, { status: 400 });
		}

		const body = await request.json();
		
		if (!body.content) {
			return json({ error: 'Content is required' }, { status: 400 });
		}

		// Verify issue exists
		const [issue] = await db.select().from(issues).where(eq(issues.id, issueId));
		if (!issue) {
			return json({ error: 'Issue not found' }, { status: 404 });
		}

		const now = new Date().toISOString();
		const [newComment] = await db.insert(comments).values({
			issueId,
			author: body.author || 'Anonymous',
			content: body.content,
			createdAt: now
		}).returning();

		// Update issue's updatedAt
		await db.update(issues).set({ updatedAt: now }).where(eq(issues.id, issueId));

		// Broadcast the new comment
		broadcast('comment_added', { ...newComment, issueId });

		return json(newComment, { status: 201 });
	} catch (error) {
		console.error('Failed to create comment:', error);
		return json({ error: 'Failed to create comment' }, { status: 500 });
	}
};

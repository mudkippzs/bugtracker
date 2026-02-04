import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { comments, issues, issueHistory } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { broadcast } from '$lib/server/broadcast';

// GET /api/comments/:commentId - Get a single comment
export const GET: RequestHandler = async ({ params }) => {
	try {
		const commentId = parseInt(params.commentId);
		if (isNaN(commentId)) {
			return json({ error: 'Invalid comment ID' }, { status: 400 });
		}

		const [comment] = await db.select().from(comments).where(eq(comments.id, commentId));
		
		if (!comment) {
			return json({ error: 'Comment not found' }, { status: 404 });
		}

		return json(comment);
	} catch (error) {
		console.error('Failed to fetch comment:', error);
		return json({ error: 'Failed to fetch comment' }, { status: 500 });
	}
};

// PUT /api/comments/:commentId - Edit a comment
export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const commentId = parseInt(params.commentId);
		if (isNaN(commentId)) {
			return json({ error: 'Invalid comment ID' }, { status: 400 });
		}

		const body = await request.json();
		const now = new Date().toISOString();

		// Get existing comment
		const [existingComment] = await db.select().from(comments).where(eq(comments.id, commentId));
		if (!existingComment) {
			return json({ error: 'Comment not found' }, { status: 404 });
		}

		if (existingComment.isDeleted) {
			return json({ error: 'Cannot edit a deleted comment' }, { status: 400 });
		}

		const [updated] = await db
			.update(comments)
			.set({
				content: body.content,
				editedAt: now
			})
			.where(eq(comments.id, commentId))
			.returning();

		// Update issue's updatedAt
		await db.update(issues).set({ updatedAt: now }).where(eq(issues.id, existingComment.issueId));

		// Broadcast the update with issueId for real-time updates
		broadcast('comment_updated', { ...updated, issueId: existingComment.issueId });

		return json(updated);
	} catch (error) {
		console.error('Failed to update comment:', error);
		return json({ error: 'Failed to update comment' }, { status: 500 });
	}
};

// DELETE /api/comments/:commentId - Delete a comment (soft or hard)
export const DELETE: RequestHandler = async ({ params, url }) => {
	try {
		const commentId = parseInt(params.commentId);
		if (isNaN(commentId)) {
			return json({ error: 'Invalid comment ID' }, { status: 400 });
		}

		const hardDelete = url.searchParams.get('hard') === 'true';
		const now = new Date().toISOString();

		// Get existing comment
		const [existingComment] = await db.select().from(comments).where(eq(comments.id, commentId));
		if (!existingComment) {
			return json({ error: 'Comment not found' }, { status: 404 });
		}

		if (hardDelete) {
			// Hard delete - remove from DB and log in history
			await db.delete(comments).where(eq(comments.id, commentId));

			// Add history entry
			await db.insert(issueHistory).values({
				issueId: existingComment.issueId,
				field: 'comment_deleted',
				oldValue: `Comment #${commentId} by ${existingComment.author}`,
				newValue: 'Permanently deleted',
				changedBy: 'System',
				changedAt: now
			});

			broadcast('comment_deleted', { id: commentId, issueId: existingComment.issueId, hard: true });
		} else {
			// Soft delete - just mark as deleted
			await db
				.update(comments)
				.set({ isDeleted: true })
				.where(eq(comments.id, commentId));

			broadcast('comment_deleted', { id: commentId, issueId: existingComment.issueId, hard: false });
		}

		// Update issue's updatedAt
		await db.update(issues).set({ updatedAt: now }).where(eq(issues.id, existingComment.issueId));

		return json({ success: true, hardDelete });
	} catch (error) {
		console.error('Failed to delete comment:', error);
		return json({ error: 'Failed to delete comment' }, { status: 500 });
	}
};

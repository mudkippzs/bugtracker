import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { comments, issues, issueHistory } from '$lib/db/schema';
import { eq, and, isNull, max } from 'drizzle-orm';
import { broadcast } from '$lib/server/broadcast';

// GET /api/issues/:id/comments - Get comments for an issue (excluding soft-deleted)
export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const issueId = parseInt(params.id);
		if (isNaN(issueId)) {
			return json({ error: 'Invalid issue ID' }, { status: 400 });
		}

		const includeDeleted = url.searchParams.get('includeDeleted') === 'true';

		let issueComments;
		if (includeDeleted) {
			issueComments = await db
				.select()
				.from(comments)
				.where(eq(comments.issueId, issueId))
				.orderBy(comments.createdAt);
		} else {
			issueComments = await db
				.select()
				.from(comments)
				.where(and(eq(comments.issueId, issueId), eq(comments.isDeleted, false)))
				.orderBy(comments.createdAt);
		}

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

		// If replying, verify parent comment exists
		if (body.parentId) {
			const [parentComment] = await db.select().from(comments).where(eq(comments.id, body.parentId));
			if (!parentComment || parentComment.issueId !== issueId) {
				return json({ error: 'Parent comment not found' }, { status: 404 });
			}
		}

		// Get next comment number for this issue
		const [maxResult] = await db
			.select({ maxNum: max(comments.commentNumber) })
			.from(comments)
			.where(eq(comments.issueId, issueId));
		const nextCommentNumber = (maxResult?.maxNum ?? 0) + 1;

		const now = new Date().toISOString();
		const [newComment] = await db.insert(comments).values({
			issueId,
			commentNumber: nextCommentNumber,
			parentId: body.parentId || null,
			author: body.author || 'Anonymous',
			content: body.content,
			isDeleted: false,
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

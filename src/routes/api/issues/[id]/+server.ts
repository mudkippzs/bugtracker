import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { issues, projects, comments, commits, issueHistory } from '$lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { broadcast } from '$lib/server/broadcast';

// GET /api/issues/:id - Get a single issue with related data
export const GET: RequestHandler = async ({ params }) => {
	try {
		const id = parseInt(params.id);
		if (isNaN(id)) {
			return json({ error: 'Invalid issue ID' }, { status: 400 });
		}

		const [issue] = await db.select().from(issues).where(eq(issues.id, id));
		
		if (!issue) {
			return json({ error: 'Issue not found' }, { status: 404 });
		}

		// Get related data
		const [project] = await db.select().from(projects).where(eq(projects.id, issue.projectId));
		const issueComments = await db.select().from(comments).where(eq(comments.issueId, id)).orderBy(comments.createdAt);
		const issueCommits = await db.select().from(commits).where(eq(commits.issueId, id)).orderBy(desc(commits.createdAt));
		const history = await db.select().from(issueHistory).where(eq(issueHistory.issueId, id)).orderBy(desc(issueHistory.changedAt));

		// Get child issues if this is an epic
		const children = issue.type === 'epic' 
			? await db.select().from(issues).where(eq(issues.parentId, id))
			: [];

		return json({
			...issue,
			project,
			comments: issueComments,
			commits: issueCommits,
			history,
			children
		});
	} catch (error) {
		console.error('Failed to fetch issue:', error);
		return json({ error: 'Failed to fetch issue' }, { status: 500 });
	}
};

// PUT /api/issues/:id - Update an issue
export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const id = parseInt(params.id);
		if (isNaN(id)) {
			return json({ error: 'Invalid issue ID' }, { status: 400 });
		}

		const body = await request.json();
		const now = new Date().toISOString();

		// Get current issue for history tracking
		const [currentIssue] = await db.select().from(issues).where(eq(issues.id, id));
		if (!currentIssue) {
			return json({ error: 'Issue not found' }, { status: 404 });
		}

		// Track changes for history
		const changes: { field: string; oldValue: string | null; newValue: string | null }[] = [];
		const fieldsToTrack = ['type', 'title', 'priority', 'status', 'assignee', 'projectId'] as const;
		
		for (const field of fieldsToTrack) {
			if (body[field] !== undefined && body[field] !== currentIssue[field]) {
				// For projectId, we'll record it as "project" in history with IDs
				const fieldName = field === 'projectId' ? 'project' : field;
				changes.push({
					field: fieldName,
					oldValue: String(currentIssue[field] ?? ''),
					newValue: String(body[field])
				});
			}
		}

		// Determine if we need to set/clear resolvedAt based on status change
		let resolvedAt = undefined;
		if (body.status) {
			const isResolved = body.status === 'done' || body.status === 'closed';
			const wasResolved = currentIssue.status === 'done' || currentIssue.status === 'closed';
			
			if (isResolved && !wasResolved) {
				// Moving to resolved status - set resolvedAt
				resolvedAt = now;
			} else if (!isResolved && wasResolved) {
				// Moving away from resolved status - clear resolvedAt
				resolvedAt = null;
			}
		}

		const [updated] = await db
			.update(issues)
			.set({
				...(body.projectId && { projectId: body.projectId }),
				...(body.parentId !== undefined && { parentId: body.parentId }),
				...(body.type && { type: body.type }),
				...(body.title && { title: body.title }),
				...(body.description !== undefined && { description: body.description }),
				...(body.priority && { priority: body.priority }),
				...(body.status && { status: body.status }),
				...(body.assignee !== undefined && { assignee: body.assignee }),
				...(body.labels !== undefined && { labels: JSON.stringify(body.labels) }),
				...(resolvedAt !== undefined && { resolvedAt }),
				updatedAt: now
			})
			.where(eq(issues.id, id))
			.returning();

		// Record history entries and broadcast them
		for (const change of changes) {
			const [historyEntry] = await db.insert(issueHistory).values({
				issueId: id,
				field: change.field,
				oldValue: change.oldValue,
				newValue: change.newValue,
				changedBy: body.author || 'System',
				changedAt: now
			}).returning();
			
			// Broadcast history entry for real-time updates
			broadcast('history_added', { ...historyEntry, issueId: id });
		}

		// Broadcast the update
		broadcast('issue_updated', updated);

		return json(updated);
	} catch (error) {
		console.error('Failed to update issue:', error);
		return json({ error: 'Failed to update issue' }, { status: 500 });
	}
};

// DELETE /api/issues/:id - Delete an issue
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const id = parseInt(params.id);
		if (isNaN(id)) {
			return json({ error: 'Invalid issue ID' }, { status: 400 });
		}

		const [deleted] = await db
			.delete(issues)
			.where(eq(issues.id, id))
			.returning();

		if (!deleted) {
			return json({ error: 'Issue not found' }, { status: 404 });
		}

		// Broadcast the deletion with projectId for proper store updates
		broadcast('issue_deleted', { id, projectId: deleted.projectId });

		return json({ success: true });
	} catch (error) {
		console.error('Failed to delete issue:', error);
		return json({ error: 'Failed to delete issue' }, { status: 500 });
	}
};

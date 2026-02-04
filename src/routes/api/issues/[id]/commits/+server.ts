import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { commits, issues, issueHistory } from '$lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { broadcast } from '$lib/server/broadcast';

// GET /api/issues/:id/commits - Get commits linked to an issue
export const GET: RequestHandler = async ({ params }) => {
	try {
		const issueId = parseInt(params.id);
		if (isNaN(issueId)) {
			return json({ error: 'Invalid issue ID' }, { status: 400 });
		}

		const issueCommits = await db
			.select()
			.from(commits)
			.where(eq(commits.issueId, issueId))
			.orderBy(desc(commits.createdAt));

		return json(issueCommits);
	} catch (error) {
		console.error('Failed to fetch commits:', error);
		return json({ error: 'Failed to fetch commits' }, { status: 500 });
	}
};

// POST /api/issues/:id/commits - Link a commit to an issue
export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const issueId = parseInt(params.id);
		if (isNaN(issueId)) {
			return json({ error: 'Invalid issue ID' }, { status: 400 });
		}

		const body = await request.json();
		
		if (!body.hash) {
			return json({ error: 'Commit hash is required' }, { status: 400 });
		}

		// Verify issue exists
		const [issue] = await db.select().from(issues).where(eq(issues.id, issueId));
		if (!issue) {
			return json({ error: 'Issue not found' }, { status: 404 });
		}

		const now = new Date().toISOString();
		const [newCommit] = await db.insert(commits).values({
			issueId,
			hash: body.hash,
			branch: body.branch || null,
			title: body.title || null,
			url: body.url || null,
			createdAt: now
		}).returning();

		// Add history entry
		const [historyEntry] = await db.insert(issueHistory).values({
			issueId,
			field: 'commit',
			oldValue: null,
			newValue: `Linked commit ${body.hash.substring(0, 7)}`,
			changedBy: body.author || 'System',
			changedAt: now
		}).returning();

		// Update issue's updatedAt
		await db.update(issues).set({ updatedAt: now }).where(eq(issues.id, issueId));

		// Broadcast commit linked and history entry
		broadcast('commit_linked', { ...newCommit, issueId });
		broadcast('history_added', { ...historyEntry, issueId });

		return json(newCommit, { status: 201 });
	} catch (error) {
		console.error('Failed to link commit:', error);
		return json({ error: 'Failed to link commit' }, { status: 500 });
	}
};

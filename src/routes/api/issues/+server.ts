import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { issues, projects, issueHistory, comments } from '$lib/db/schema';
import { eq, and, desc, count, max, sql } from 'drizzle-orm';
import { broadcast } from '$lib/server/broadcast';

// GET /api/issues - List issues with optional filters
export const GET: RequestHandler = async ({ url }) => {
	try {
		const projectId = url.searchParams.get('projectId');
		const status = url.searchParams.get('status');
		const type = url.searchParams.get('type');
		const priority = url.searchParams.get('priority');

		const conditions = [];
		
		if (projectId) {
			conditions.push(eq(issues.projectId, parseInt(projectId)));
		}
		if (status) {
			conditions.push(eq(issues.status, status as typeof issues.status.dataType));
		}
		if (type) {
			conditions.push(eq(issues.type, type as typeof issues.type.dataType));
		}
		if (priority) {
			conditions.push(eq(issues.priority, priority as typeof issues.priority.dataType));
		}

		const query = conditions.length > 0
			? db.select().from(issues).where(and(...conditions)).orderBy(desc(issues.updatedAt))
			: db.select().from(issues).orderBy(desc(issues.updatedAt));

		const allIssues = await query;
		
		// Get comment metadata for each issue (count and latest timestamp)
		const commentStats = await db
			.select({
				issueId: comments.issueId,
				commentCount: count(comments.id),
				latestCommentAt: max(comments.createdAt)
			})
			.from(comments)
			.where(eq(comments.isDeleted, false))
			.groupBy(comments.issueId);
		
		// Create a map for quick lookup
		const statsMap = new Map(commentStats.map(s => [s.issueId, s]));
		
		// Enrich issues with comment metadata
		const enrichedIssues = allIssues.map(issue => ({
			...issue,
			commentCount: statsMap.get(issue.id)?.commentCount || 0,
			latestCommentAt: statsMap.get(issue.id)?.latestCommentAt || null
		}));
		
		return json(enrichedIssues);
	} catch (error) {
		console.error('Failed to fetch issues:', error);
		return json({ error: 'Failed to fetch issues' }, { status: 500 });
	}
};

// POST /api/issues - Create a new issue
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		
		if (!body.projectId || !body.title) {
			return json({ error: 'Project ID and title are required' }, { status: 400 });
		}

		// Verify project exists
		const [project] = await db.select().from(projects).where(eq(projects.id, body.projectId));
		if (!project) {
			return json({ error: 'Project not found' }, { status: 404 });
		}

		const now = new Date().toISOString();
		const [newIssue] = await db.insert(issues).values({
			projectId: body.projectId,
			parentId: body.parentId || null,
			type: body.type || 'bug',
			title: body.title,
			description: body.description || null,
			priority: body.priority || 'medium',
			status: body.status || 'backlog',
			assignee: body.assignee || null,
			labels: body.labels ? JSON.stringify(body.labels) : null,
			dueDate: body.dueDate || null,
			estimate: body.estimate || null,
			timeSpent: body.timeSpent || 0,
			createdAt: now,
			updatedAt: now
		}).returning();

		// Create history entry for creation
		await db.insert(issueHistory).values({
			issueId: newIssue.id,
			field: 'created',
			oldValue: null,
			newValue: 'Issue created',
			changedBy: body.author || 'System',
			changedAt: now
		});

		// Broadcast the new issue
		broadcast('issue_created', newIssue);

		return json(newIssue, { status: 201 });
	} catch (error) {
		console.error('Failed to create issue:', error);
		return json({ error: 'Failed to create issue' }, { status: 500 });
	}
};

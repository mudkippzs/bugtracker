import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/db';
import { issueHistory, comments, issues, projects } from '$lib/db/schema';
import { desc, eq, and, gte } from 'drizzle-orm';

export interface ActivityItem {
	id: string;
	type: 'issue_created' | 'issue_updated' | 'comment_added';
	issueId: number;
	issueTitle: string;
	projectId: number;
	projectName: string;
	actor: string;
	field?: string;
	oldValue?: string | null;
	newValue?: string | null;
	content?: string;
	timestamp: string;
}

// GET /api/activity - Get recent activity across all projects
export const GET: RequestHandler = async ({ url }) => {
	try {
		const limit = parseInt(url.searchParams.get('limit') || '50');
		const projectId = url.searchParams.get('projectId');
		const since = url.searchParams.get('since'); // ISO date string

		// Fetch recent history entries
		let historyQuery = db
			.select({
				id: issueHistory.id,
				issueId: issueHistory.issueId,
				field: issueHistory.field,
				oldValue: issueHistory.oldValue,
				newValue: issueHistory.newValue,
				changedBy: issueHistory.changedBy,
				changedAt: issueHistory.changedAt,
				issueTitle: issues.title,
				projectId: issues.projectId,
				projectName: projects.name
			})
			.from(issueHistory)
			.innerJoin(issues, eq(issueHistory.issueId, issues.id))
			.innerJoin(projects, eq(issues.projectId, projects.id))
			.orderBy(desc(issueHistory.changedAt))
			.limit(limit);

		if (projectId) {
			historyQuery = historyQuery.where(eq(issues.projectId, parseInt(projectId)));
		}

		const historyEntries = await historyQuery;

		// Fetch recent comments
		let commentsQuery = db
			.select({
				id: comments.id,
				issueId: comments.issueId,
				author: comments.author,
				content: comments.content,
				createdAt: comments.createdAt,
				issueTitle: issues.title,
				projectId: issues.projectId,
				projectName: projects.name
			})
			.from(comments)
			.innerJoin(issues, eq(comments.issueId, issues.id))
			.innerJoin(projects, eq(issues.projectId, projects.id))
			.where(eq(comments.isDeleted, false))
			.orderBy(desc(comments.createdAt))
			.limit(limit);

		if (projectId) {
			commentsQuery = commentsQuery.where(
				and(
					eq(issues.projectId, parseInt(projectId)),
					eq(comments.isDeleted, false)
				)
			);
		}

		const commentEntries = await commentsQuery;

		// Combine and sort by timestamp
		const activities: ActivityItem[] = [];

		for (const entry of historyEntries) {
			activities.push({
				id: `history-${entry.id}`,
				type: entry.field === 'created' ? 'issue_created' : 'issue_updated',
				issueId: entry.issueId,
				issueTitle: entry.issueTitle,
				projectId: entry.projectId,
				projectName: entry.projectName,
				actor: entry.changedBy || 'System',
				field: entry.field,
				oldValue: entry.oldValue,
				newValue: entry.newValue,
				timestamp: entry.changedAt
			});
		}

		for (const entry of commentEntries) {
			activities.push({
				id: `comment-${entry.id}`,
				type: 'comment_added',
				issueId: entry.issueId,
				issueTitle: entry.issueTitle,
				projectId: entry.projectId,
				projectName: entry.projectName,
				actor: entry.author || 'Anonymous',
				content: entry.content.length > 100 ? entry.content.slice(0, 100) + '...' : entry.content,
				timestamp: entry.createdAt
			});
		}

		// Sort by timestamp descending
		activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

		// Apply since filter
		let filteredActivities = activities;
		if (since) {
			const sinceDate = new Date(since);
			filteredActivities = activities.filter(a => new Date(a.timestamp) >= sinceDate);
		}

		return json(filteredActivities.slice(0, limit));
	} catch (error) {
		console.error('Failed to fetch activity:', error);
		return json({ error: 'Failed to fetch activity' }, { status: 500 });
	}
};

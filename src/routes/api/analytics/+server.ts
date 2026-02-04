import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { projects, issues, comments, issueHistory } from '$lib/db/schema';
import { count, eq, desc, sql, avg, isNotNull, and } from 'drizzle-orm';

// GET /api/analytics - Get analytics overview
export const GET: RequestHandler = async () => {
	try {
		// Total counts
		const [projectCount] = await db.select({ count: count() }).from(projects);
		const [issueCount] = await db.select({ count: count() }).from(issues);
		const [openCount] = await db
			.select({ count: count() })
			.from(issues)
			.where(sql`${issues.status} NOT IN ('done', 'closed')`);
		const [closedCount] = await db
			.select({ count: count() })
			.from(issues)
			.where(sql`${issues.status} IN ('done', 'closed')`);

		// Issues by type
		const typeStats = await db
			.select({
				type: issues.type,
				count: count()
			})
			.from(issues)
			.groupBy(issues.type);
		
		const issuesByType: Record<string, number> = {};
		for (const stat of typeStats) {
			issuesByType[stat.type] = stat.count;
		}

		// Issues by priority
		const priorityStats = await db
			.select({
				priority: issues.priority,
				count: count()
			})
			.from(issues)
			.groupBy(issues.priority);
		
		const issuesByPriority: Record<string, number> = {};
		for (const stat of priorityStats) {
			issuesByPriority[stat.priority] = stat.count;
		}

		// Issues by status
		const statusStats = await db
			.select({
				status: issues.status,
				count: count()
			})
			.from(issues)
			.groupBy(issues.status);
		
		const issuesByStatus: Record<string, number> = {};
		for (const stat of statusStats) {
			issuesByStatus[stat.status] = stat.count;
		}

		// Recent activity (last 10 issues)
		const recentIssues = await db
			.select({
				id: issues.id,
				type: issues.type,
				title: issues.title,
				status: issues.status,
				priority: issues.priority,
				createdAt: issues.createdAt
			})
			.from(issues)
			.orderBy(desc(issues.updatedAt))
			.limit(10);

		// Issues created over time (last 30 days)
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
		
		const issuesOverTime = await db
			.select({
				date: sql<string>`date(${issues.createdAt})`,
				count: count()
			})
			.from(issues)
			.where(sql`${issues.createdAt} >= ${thirtyDaysAgo.toISOString()}`)
			.groupBy(sql`date(${issues.createdAt})`)
			.orderBy(sql`date(${issues.createdAt})`);

		// === NEW METRICS ===

		// Time to Resolution (TTR) - average hours from creation to resolution
		const resolvedIssues = await db
			.select({
				createdAt: issues.createdAt,
				resolvedAt: issues.resolvedAt
			})
			.from(issues)
			.where(isNotNull(issues.resolvedAt));
		
		let avgTTRHours = 0;
		if (resolvedIssues.length > 0) {
			const totalHours = resolvedIssues.reduce((sum, issue) => {
				const created = new Date(issue.createdAt).getTime();
				const resolved = new Date(issue.resolvedAt!).getTime();
				return sum + (resolved - created) / (1000 * 60 * 60); // hours
			}, 0);
			avgTTRHours = totalHours / resolvedIssues.length;
		}

		// Average comments per issue
		const commentStats = await db
			.select({
				issueId: comments.issueId,
				count: count()
			})
			.from(comments)
			.where(eq(comments.isDeleted, false))
			.groupBy(comments.issueId);
		
		const totalComments = commentStats.reduce((sum, s) => sum + s.count, 0);
		const avgCommentsPerIssue = (issueCount?.count || 0) > 0 
			? totalComments / (issueCount?.count || 1) 
			: 0;

		// Time in state - calculate average time spent in each status
		const timeInState: Record<string, number> = {
			backlog: 0,
			todo: 0,
			in_progress: 0,
			review: 0,
			done: 0,
			closed: 0
		};

		// Get status change history
		const statusChanges = await db
			.select({
				issueId: issueHistory.issueId,
				field: issueHistory.field,
				oldValue: issueHistory.oldValue,
				newValue: issueHistory.newValue,
				changedAt: issueHistory.changedAt
			})
			.from(issueHistory)
			.where(eq(issueHistory.field, 'status'))
			.orderBy(issueHistory.issueId, issueHistory.changedAt);

		// Group by issue and calculate time in each state
		const issueStatusTimelines = new Map<number, Array<{ status: string; timestamp: string }>>();
		
		for (const change of statusChanges) {
			if (!issueStatusTimelines.has(change.issueId)) {
				issueStatusTimelines.set(change.issueId, []);
			}
			// Add the old value as a state we were in
			if (change.oldValue) {
				issueStatusTimelines.get(change.issueId)!.push({ 
					status: change.oldValue, 
					timestamp: change.changedAt 
				});
			}
		}

		// Calculate average time per status
		const statusDurations: Record<string, number[]> = {
			backlog: [], todo: [], in_progress: [], review: [], done: [], closed: []
		};

		for (const [issueId, timeline] of issueStatusTimelines) {
			for (let i = 0; i < timeline.length - 1; i++) {
				const current = timeline[i];
				const next = timeline[i + 1];
				const duration = new Date(next.timestamp).getTime() - new Date(current.timestamp).getTime();
				const hours = duration / (1000 * 60 * 60);
				if (statusDurations[current.status] && hours > 0) {
					statusDurations[current.status].push(hours);
				}
			}
		}

		for (const status of Object.keys(timeInState)) {
			const durations = statusDurations[status];
			if (durations.length > 0) {
				timeInState[status] = durations.reduce((a, b) => a + b, 0) / durations.length;
			}
		}

		// Issues resolved this week
		const weekAgo = new Date();
		weekAgo.setDate(weekAgo.getDate() - 7);
		const [resolvedThisWeek] = await db
			.select({ count: count() })
			.from(issues)
			.where(sql`${issues.resolvedAt} >= ${weekAgo.toISOString()}`);

		return json({
			totalProjects: projectCount?.count || 0,
			totalIssues: issueCount?.count || 0,
			openIssues: openCount?.count || 0,
			closedIssues: closedCount?.count || 0,
			issuesByType,
			issuesByPriority,
			issuesByStatus,
			recentActivity: recentIssues,
			issuesOverTime,
			// New metrics
			avgTTRHours: Math.round(avgTTRHours * 10) / 10,
			avgCommentsPerIssue: Math.round(avgCommentsPerIssue * 10) / 10,
			timeInState,
			resolvedThisWeek: resolvedThisWeek?.count || 0,
			totalComments
		});
	} catch (error) {
		console.error('Failed to fetch analytics:', error);
		return json({ error: 'Failed to fetch analytics' }, { status: 500 });
	}
};

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { projects, issues, comments } from '$lib/db/schema';
import { count, eq, desc, sql } from 'drizzle-orm';

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

		return json({
			totalProjects: projectCount?.count || 0,
			totalIssues: issueCount?.count || 0,
			openIssues: openCount?.count || 0,
			closedIssues: closedCount?.count || 0,
			issuesByType,
			issuesByPriority,
			issuesByStatus,
			recentActivity: recentIssues,
			issuesOverTime
		});
	} catch (error) {
		console.error('Failed to fetch analytics:', error);
		return json({ error: 'Failed to fetch analytics' }, { status: 500 });
	}
};

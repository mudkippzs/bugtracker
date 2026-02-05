import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/db';
import { issues, comments } from '$lib/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/issues/export - Export issues as JSON
export const GET: RequestHandler = async ({ url }) => {
	try {
		const projectId = url.searchParams.get('projectId');
		const includeComments = url.searchParams.get('includeComments') === 'true';

		let query = db.select().from(issues);
		if (projectId) {
			query = query.where(eq(issues.projectId, parseInt(projectId)));
		}

		const allIssues = await query;

		// Format issues for export
		const exportData = await Promise.all(allIssues.map(async (issue) => {
			const exportIssue: Record<string, unknown> = {
				id: issue.id,
				title: issue.title,
				description: issue.description,
				type: issue.type,
				priority: issue.priority,
				status: issue.status,
				assignee: issue.assignee,
				labels: issue.labels ? JSON.parse(issue.labels) : [],
				dueDate: issue.dueDate,
				estimate: issue.estimate,
				timeSpent: issue.timeSpent,
				createdAt: issue.createdAt,
				updatedAt: issue.updatedAt,
				resolvedAt: issue.resolvedAt
			};

			if (includeComments) {
				const issueComments = await db
					.select()
					.from(comments)
					.where(eq(comments.issueId, issue.id));
				exportIssue.comments = issueComments.filter(c => !c.isDeleted).map(c => ({
					author: c.author,
					content: c.content,
					createdAt: c.createdAt
				}));
			}

			return exportIssue;
		}));

		const exportPayload = {
			exportedAt: new Date().toISOString(),
			projectId: projectId ? parseInt(projectId) : null,
			issueCount: exportData.length,
			issues: exportData
		};

		return new Response(JSON.stringify(exportPayload, null, 2), {
			headers: {
				'Content-Type': 'application/json',
				'Content-Disposition': `attachment; filename="issues-export-${new Date().toISOString().split('T')[0]}.json"`
			}
		});
	} catch (error) {
		console.error('Failed to export issues:', error);
		return json({ error: 'Failed to export issues' }, { status: 500 });
	}
};

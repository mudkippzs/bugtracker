import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/db';
import { issues, comments } from '$lib/db/schema';

// POST /api/issues/import - Import issues from JSON
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { projectId, issues: importIssues, skipExisting = true } = body;

		if (!projectId) {
			return json({ error: 'projectId is required' }, { status: 400 });
		}

		if (!importIssues || !Array.isArray(importIssues)) {
			return json({ error: 'issues array is required' }, { status: 400 });
		}

		const results = {
			imported: 0,
			skipped: 0,
			errors: [] as string[]
		};

		for (const issue of importIssues) {
			try {
				const now = new Date().toISOString();

				// Create the issue
				const [newIssue] = await db.insert(issues).values({
					projectId,
					title: issue.title || 'Untitled',
					description: issue.description || null,
					type: issue.type || 'bug',
					priority: issue.priority || 'medium',
					status: issue.status || 'backlog',
					assignee: issue.assignee || null,
					labels: issue.labels ? JSON.stringify(issue.labels) : null,
					dueDate: issue.dueDate || null,
					estimate: issue.estimate || null,
					timeSpent: issue.timeSpent || 0,
					createdAt: issue.createdAt || now,
					updatedAt: now
				}).returning();

				// Import comments if provided
				if (issue.comments && Array.isArray(issue.comments)) {
					for (let i = 0; i < issue.comments.length; i++) {
						const comment = issue.comments[i];
						await db.insert(comments).values({
							issueId: newIssue.id,
							commentNumber: i + 1,
							author: comment.author || 'Imported',
							content: comment.content || '',
							createdAt: comment.createdAt || now
						});
					}
				}

				results.imported++;
			} catch (err) {
				results.errors.push(`Failed to import issue "${issue.title}": ${err}`);
			}
		}

		return json({
			success: true,
			...results
		});
	} catch (error) {
		console.error('Failed to import issues:', error);
		return json({ error: 'Failed to import issues' }, { status: 500 });
	}
};

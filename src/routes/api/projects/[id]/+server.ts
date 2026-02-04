import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { projects, issues } from '$lib/db/schema';
import { eq, count } from 'drizzle-orm';
import { broadcast } from '$lib/server/broadcast';

// GET /api/projects/:id - Get a single project with issue counts
export const GET: RequestHandler = async ({ params }) => {
	try {
		const id = parseInt(params.id);
		if (isNaN(id)) {
			return json({ error: 'Invalid project ID' }, { status: 400 });
		}

		const [project] = await db.select().from(projects).where(eq(projects.id, id));
		
		if (!project) {
			return json({ error: 'Project not found' }, { status: 404 });
		}

		// Get issue counts
		const [issueCount] = await db
			.select({ count: count() })
			.from(issues)
			.where(eq(issues.projectId, id));

		return json({ ...project, issueCount: issueCount?.count || 0 });
	} catch (error) {
		console.error('Failed to fetch project:', error);
		return json({ error: 'Failed to fetch project' }, { status: 500 });
	}
};

// PUT /api/projects/:id - Update a project
export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const id = parseInt(params.id);
		if (isNaN(id)) {
			return json({ error: 'Invalid project ID' }, { status: 400 });
		}

		const body = await request.json();
		const now = new Date().toISOString();

		const [updated] = await db
			.update(projects)
			.set({
				...(body.name && { name: body.name }),
				...(body.path && { path: body.path }),
				...(body.description !== undefined && { description: body.description }),
				...(body.color && { color: body.color }),
				updatedAt: now
			})
			.where(eq(projects.id, id))
			.returning();

		if (!updated) {
			return json({ error: 'Project not found' }, { status: 404 });
		}

		// Broadcast the update
		broadcast('project_updated', updated);

		return json(updated);
	} catch (error) {
		console.error('Failed to update project:', error);
		return json({ error: 'Failed to update project' }, { status: 500 });
	}
};

// DELETE /api/projects/:id - Delete a project
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const id = parseInt(params.id);
		if (isNaN(id)) {
			return json({ error: 'Invalid project ID' }, { status: 400 });
		}

		const [deleted] = await db
			.delete(projects)
			.where(eq(projects.id, id))
			.returning();

		if (!deleted) {
			return json({ error: 'Project not found' }, { status: 404 });
		}

		// Broadcast the deletion
		broadcast('project_deleted', { id });

		return json({ success: true });
	} catch (error) {
		console.error('Failed to delete project:', error);
		return json({ error: 'Failed to delete project' }, { status: 500 });
	}
};

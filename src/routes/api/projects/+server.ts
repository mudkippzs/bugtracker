import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { projects, issues } from '$lib/db/schema';
import { eq, count, sql } from 'drizzle-orm';

// GET /api/projects - List all projects with issue counts
export const GET: RequestHandler = async () => {
	try {
		const allProjects = await db.select().from(projects).orderBy(projects.updatedAt);
		
		// Get issue counts for each project
		const projectsWithCounts = await Promise.all(
			allProjects.map(async (project) => {
				const [result] = await db
					.select({ count: count() })
					.from(issues)
					.where(eq(issues.projectId, project.id));
				return { ...project, issueCount: result?.count || 0 };
			})
		);
		
		return json(projectsWithCounts);
	} catch (error) {
		console.error('Failed to fetch projects:', error);
		return json({ error: 'Failed to fetch projects' }, { status: 500 });
	}
};

// POST /api/projects - Create a new project
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		
		if (!body.name || !body.path) {
			return json({ error: 'Name and path are required' }, { status: 400 });
		}

		const now = new Date().toISOString();
		const [newProject] = await db.insert(projects).values({
			name: body.name,
			path: body.path,
			description: body.description || null,
			color: body.color || '#6366f1',
			createdAt: now,
			updatedAt: now
		}).returning();

		return json(newProject, { status: 201 });
	} catch (error) {
		console.error('Failed to create project:', error);
		if ((error as Error).message?.includes('UNIQUE constraint')) {
			return json({ error: 'A project with this path already exists' }, { status: 409 });
		}
		return json({ error: 'Failed to create project' }, { status: 500 });
	}
};

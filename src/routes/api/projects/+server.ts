import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { projects, issues } from '$lib/db/schema';
import { eq, count, sql } from 'drizzle-orm';
import { existsSync, mkdirSync } from 'fs';
import { resolve, normalize } from 'path';

const PROJECT_ROOT = '/home/dev/Code';

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

		// Normalize and resolve the path
		let projectPath = body.path;
		
		// If path doesn't start with PROJECT_ROOT, prepend it
		if (!projectPath.startsWith(PROJECT_ROOT)) {
			// If it starts with a slash, it's treated as relative to PROJECT_ROOT
			if (projectPath.startsWith('/')) {
				projectPath = projectPath.slice(1);
			}
			projectPath = resolve(PROJECT_ROOT, projectPath);
		}
		
		// Normalize to resolve any .. or . segments
		projectPath = normalize(projectPath);
		
		// Security check: ensure the path is still under PROJECT_ROOT
		if (!projectPath.startsWith(PROJECT_ROOT)) {
			return json({ error: 'Project path must be under ' + PROJECT_ROOT }, { status: 400 });
		}

		// Check if directory exists, create if it doesn't
		if (!existsSync(projectPath)) {
			try {
				mkdirSync(projectPath, { recursive: true });
				console.log(`Created project directory: ${projectPath}`);
			} catch (mkdirError) {
				console.error('Failed to create directory:', mkdirError);
				return json({ error: 'Failed to create project directory' }, { status: 500 });
			}
		}

		const now = new Date().toISOString();
		const [newProject] = await db.insert(projects).values({
			name: body.name,
			path: projectPath,
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

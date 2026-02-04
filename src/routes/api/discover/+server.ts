import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { db } from '$lib/db';
import { projects } from '$lib/db/schema';
import { env } from '$env/dynamic/private';

const CODE_DIR = env.CODE_DIR || '/home/dev/Code';

// GET /api/discover - Discover projects in the Code directory
export const GET: RequestHandler = async () => {
	try {
		// Get existing project paths
		const existingProjects = await db.select({ path: projects.path }).from(projects);
		const existingPaths = new Set(existingProjects.map(p => p.path));

		// Scan directory for potential projects
		const entries = readdirSync(CODE_DIR);
		const discovered: { name: string; path: string; isTracked: boolean }[] = [];

		for (const entry of entries) {
			const fullPath = join(CODE_DIR, entry);
			try {
				const stat = statSync(fullPath);
				if (stat.isDirectory() && !entry.startsWith('.')) {
					discovered.push({
						name: entry,
						path: fullPath,
						isTracked: existingPaths.has(fullPath)
					});
				}
			} catch {
				// Skip entries we can't read
			}
		}

		return json({
			baseDir: CODE_DIR,
			projects: discovered.sort((a, b) => a.name.localeCompare(b.name))
		});
	} catch (error) {
		console.error('Failed to discover projects:', error);
		return json({ error: 'Failed to discover projects' }, { status: 500 });
	}
};

import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/db';
import { issueDependencies, issues } from '$lib/db/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/issues/:id/dependencies - Get dependencies for an issue
export const GET: RequestHandler = async ({ params }) => {
	try {
		const issueId = parseInt(params.id);
		if (isNaN(issueId)) {
			return json({ error: 'Invalid issue ID' }, { status: 400 });
		}

		// Get issues this issue depends on (blockers)
		const blockers = await db
			.select({
				id: issueDependencies.id,
				dependsOnId: issueDependencies.dependsOnId,
				issueTitle: issues.title,
				issueStatus: issues.status
			})
			.from(issueDependencies)
			.innerJoin(issues, eq(issueDependencies.dependsOnId, issues.id))
			.where(eq(issueDependencies.issueId, issueId));

		// Get issues that depend on this issue (blocking)
		const blocking = await db
			.select({
				id: issueDependencies.id,
				issueId: issueDependencies.issueId,
				issueTitle: issues.title,
				issueStatus: issues.status
			})
			.from(issueDependencies)
			.innerJoin(issues, eq(issueDependencies.issueId, issues.id))
			.where(eq(issueDependencies.dependsOnId, issueId));

		return json({ blockers, blocking });
	} catch (error) {
		console.error('Failed to fetch dependencies:', error);
		return json({ error: 'Failed to fetch dependencies' }, { status: 500 });
	}
};

// POST /api/issues/:id/dependencies - Add a dependency
export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const issueId = parseInt(params.id);
		if (isNaN(issueId)) {
			return json({ error: 'Invalid issue ID' }, { status: 400 });
		}

		const body = await request.json();
		const { dependsOnId, author } = body;

		if (!dependsOnId) {
			return json({ error: 'dependsOnId is required' }, { status: 400 });
		}

		// Prevent self-dependency
		if (issueId === dependsOnId) {
			return json({ error: 'An issue cannot depend on itself' }, { status: 400 });
		}

		// Check if dependency already exists
		const [existing] = await db
			.select()
			.from(issueDependencies)
			.where(
				and(
					eq(issueDependencies.issueId, issueId),
					eq(issueDependencies.dependsOnId, dependsOnId)
				)
			);

		if (existing) {
			return json({ error: 'Dependency already exists' }, { status: 400 });
		}

		// Create dependency
		const [newDep] = await db
			.insert(issueDependencies)
			.values({
				issueId,
				dependsOnId,
				createdAt: new Date().toISOString(),
				createdBy: author || 'System'
			})
			.returning();

		return json(newDep, { status: 201 });
	} catch (error) {
		console.error('Failed to add dependency:', error);
		return json({ error: 'Failed to add dependency' }, { status: 500 });
	}
};

// DELETE /api/issues/:id/dependencies - Remove a dependency
export const DELETE: RequestHandler = async ({ params, request }) => {
	try {
		const issueId = parseInt(params.id);
		if (isNaN(issueId)) {
			return json({ error: 'Invalid issue ID' }, { status: 400 });
		}

		const body = await request.json();
		const { dependsOnId } = body;

		if (!dependsOnId) {
			return json({ error: 'dependsOnId is required' }, { status: 400 });
		}

		await db
			.delete(issueDependencies)
			.where(
				and(
					eq(issueDependencies.issueId, issueId),
					eq(issueDependencies.dependsOnId, dependsOnId)
				)
			);

		return json({ success: true });
	} catch (error) {
		console.error('Failed to remove dependency:', error);
		return json({ error: 'Failed to remove dependency' }, { status: 500 });
	}
};

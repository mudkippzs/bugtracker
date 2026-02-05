import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { milestones, issues } from '$lib/db/schema';
import { eq, count, sql } from 'drizzle-orm';

// GET - Get a single milestone with issue stats
export const GET: RequestHandler = async ({ params }) => {
    const id = parseInt(params.id);
    
    const [result] = await db
        .select({
            milestone: milestones,
            totalIssues: count(issues.id),
            closedIssues: sql<number>`sum(case when ${issues.status} in ('done', 'closed') then 1 else 0 end)`
        })
        .from(milestones)
        .leftJoin(issues, eq(issues.milestoneId, milestones.id))
        .where(eq(milestones.id, id))
        .groupBy(milestones.id);

    if (!result) {
        throw error(404, 'Milestone not found');
    }

    return json({
        ...result.milestone,
        totalIssues: result.totalIssues || 0,
        closedIssues: result.closedIssues || 0
    });
};

// PUT - Update a milestone
export const PUT: RequestHandler = async ({ params, request }) => {
    const id = parseInt(params.id);
    const data = await request.json();

    const [milestone] = await db
        .update(milestones)
        .set({
            title: data.title,
            description: data.description,
            startDate: data.startDate,
            dueDate: data.dueDate,
            status: data.status,
            updatedAt: new Date().toISOString()
        })
        .where(eq(milestones.id, id))
        .returning();

    if (!milestone) {
        throw error(404, 'Milestone not found');
    }

    return json(milestone);
};

// DELETE - Delete a milestone
export const DELETE: RequestHandler = async ({ params }) => {
    const id = parseInt(params.id);

    // First, unlink issues from this milestone
    await db
        .update(issues)
        .set({ milestoneId: null })
        .where(eq(issues.milestoneId, id));

    // Then delete the milestone
    await db.delete(milestones).where(eq(milestones.id, id));

    return json({ success: true });
};

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { milestones, issues } from '$lib/db/schema';
import { eq, and, count, sql } from 'drizzle-orm';

// GET - List all milestones (optionally filtered by projectId)
export const GET: RequestHandler = async ({ url }) => {
    const projectId = url.searchParams.get('projectId');
    
    let query = db
        .select({
            milestone: milestones,
            totalIssues: count(issues.id),
            closedIssues: sql<number>`sum(case when ${issues.status} in ('done', 'closed') then 1 else 0 end)`
        })
        .from(milestones)
        .leftJoin(issues, eq(issues.milestoneId, milestones.id))
        .groupBy(milestones.id)
        .orderBy(milestones.dueDate);

    if (projectId) {
        const results = await db
            .select({
                milestone: milestones,
                totalIssues: count(issues.id),
                closedIssues: sql<number>`sum(case when ${issues.status} in ('done', 'closed') then 1 else 0 end)`
            })
            .from(milestones)
            .leftJoin(issues, eq(issues.milestoneId, milestones.id))
            .where(eq(milestones.projectId, parseInt(projectId)))
            .groupBy(milestones.id)
            .orderBy(milestones.dueDate);
        
        return json(results.map(r => ({
            ...r.milestone,
            totalIssues: r.totalIssues || 0,
            closedIssues: r.closedIssues || 0
        })));
    }

    const results = await query;
    return json(results.map(r => ({
        ...r.milestone,
        totalIssues: r.totalIssues || 0,
        closedIssues: r.closedIssues || 0
    })));
};

// POST - Create a new milestone
export const POST: RequestHandler = async ({ request }) => {
    const data = await request.json();
    
    const [milestone] = await db.insert(milestones).values({
        projectId: data.projectId,
        title: data.title,
        description: data.description || null,
        startDate: data.startDate || null,
        dueDate: data.dueDate || null,
        status: data.status || 'open'
    }).returning();

    return json(milestone, { status: 201 });
};

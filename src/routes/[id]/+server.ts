import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { issues } from '$lib/db/schema';
import { eq } from 'drizzle-orm';

// Short URL handler: /123 redirects to /projects/X/issues/123
export const GET: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id);
	
	if (isNaN(id)) {
		return redirect(302, '/');
	}

	// Look up the issue to get its project ID
	const [issue] = await db.select().from(issues).where(eq(issues.id, id));
	
	if (!issue) {
		return redirect(302, '/?error=issue_not_found');
	}

	return redirect(302, `/projects/${issue.projectId}/issues/${issue.id}`);
};

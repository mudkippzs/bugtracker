import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { attachments } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const UPLOAD_DIR = 'static/uploads';

// DELETE - Remove an attachment
export const DELETE: RequestHandler = async ({ params }) => {
    const id = parseInt(params.id);

    // Get attachment info first
    const [attachment] = await db
        .select()
        .from(attachments)
        .where(eq(attachments.id, id));

    if (!attachment) {
        throw error(404, 'Attachment not found');
    }

    // Delete file from disk
    const filepath = path.join(UPLOAD_DIR, attachment.filename);
    if (existsSync(filepath)) {
        await unlink(filepath);
    }

    // Delete from database
    await db.delete(attachments).where(eq(attachments.id, id));

    return json({ success: true });
};

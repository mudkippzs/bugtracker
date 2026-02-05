import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { attachments } from '$lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

const UPLOAD_DIR = 'static/uploads';

// Ensure upload directory exists
async function ensureUploadDir() {
    if (!existsSync(UPLOAD_DIR)) {
        await mkdir(UPLOAD_DIR, { recursive: true });
    }
}

// Generate a unique filename
function generateFilename(originalName: string): string {
    const ext = path.extname(originalName);
    const hash = crypto.randomBytes(8).toString('hex');
    const timestamp = Date.now();
    return `${timestamp}-${hash}${ext}`;
}

// GET - List attachments for an issue
export const GET: RequestHandler = async ({ url }) => {
    const issueId = url.searchParams.get('issueId');
    
    if (!issueId) {
        return json({ error: 'issueId is required' }, { status: 400 });
    }

    const results = await db
        .select()
        .from(attachments)
        .where(eq(attachments.issueId, parseInt(issueId)));

    return json(results);
};

// POST - Upload a new attachment
export const POST: RequestHandler = async ({ request }) => {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const issueId = formData.get('issueId') as string;
        const commentId = formData.get('commentId') as string | null;
        const uploadedBy = formData.get('uploadedBy') as string || 'System';

        if (!file || !issueId) {
            return json({ error: 'file and issueId are required' }, { status: 400 });
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            return json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
        }

        await ensureUploadDir();

        // Generate unique filename and save
        const filename = generateFilename(file.name);
        const filepath = path.join(UPLOAD_DIR, filename);
        
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(filepath, buffer);

        // Save to database
        const [attachment] = await db.insert(attachments).values({
            issueId: parseInt(issueId),
            commentId: commentId ? parseInt(commentId) : null,
            filename,
            originalName: file.name,
            mimeType: file.type || 'application/octet-stream',
            size: file.size,
            uploadedBy
        }).returning();

        return json(attachment, { status: 201 });
    } catch (error) {
        console.error('Upload error:', error);
        return json({ error: 'Failed to upload file' }, { status: 500 });
    }
};

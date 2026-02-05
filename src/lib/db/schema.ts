import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Enums as const arrays for type safety
export const issueTypes = ['bug', 'feature', 'refactor', 'cleanup', 'task', 'epic'] as const;
export const priorities = ['critical', 'high', 'medium', 'low'] as const;
export const statuses = ['backlog', 'todo', 'in_progress', 'review', 'done', 'closed'] as const;

export type IssueType = (typeof issueTypes)[number];
export type Priority = (typeof priorities)[number];
export type Status = (typeof statuses)[number];

// Projects table
export const projects = sqliteTable('projects', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	path: text('path').notNull().unique(),
	description: text('description'),
	color: text('color').default('#6366f1'),
	createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString())
});

// Issues table
export const issues = sqliteTable('issues', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
	parentId: integer('parent_id').references((): ReturnType<typeof integer> => issues.id, { onDelete: 'set null' }),
	type: text('type', { enum: issueTypes }).notNull().default('bug'),
	title: text('title').notNull(),
	description: text('description'),
	priority: text('priority', { enum: priorities }).notNull().default('medium'),
	status: text('status', { enum: statuses }).notNull().default('backlog'),
	assignee: text('assignee'),
	labels: text('labels'), // JSON array stored as text
	dueDate: text('due_date'), // ISO date string for due date (YYYY-MM-DD)
	createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
	resolvedAt: text('resolved_at') // Set when status changes to 'done' or 'closed'
});

// Comments table
export const comments = sqliteTable('comments', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	issueId: integer('issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
	commentNumber: integer('comment_number').notNull().default(1), // Local number per issue (1, 2, 3...)
	parentId: integer('parent_id').references((): ReturnType<typeof integer> => comments.id, { onDelete: 'cascade' }),
	author: text('author').default('System'),
	content: text('content').notNull(),
	isDeleted: integer('is_deleted', { mode: 'boolean' }).default(false),
	editedAt: text('edited_at'),
	createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString())
});

// Commits table (for linking issues to git commits/PRs)
export const commits = sqliteTable('commits', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	issueId: integer('issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
	hash: text('hash').notNull(),
	branch: text('branch'),
	title: text('title'),
	url: text('url'),
	createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString())
});

// Issue history table (for tracking changes)
export const issueHistory = sqliteTable('issue_history', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	issueId: integer('issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
	field: text('field').notNull(),
	oldValue: text('old_value'),
	newValue: text('new_value'),
	changedBy: text('changed_by').default('System'),
	changedAt: text('changed_at').notNull().$defaultFn(() => new Date().toISOString())
});

// Define relations
export const projectsRelations = relations(projects, ({ many }) => ({
	issues: many(issues)
}));

export const issuesRelations = relations(issues, ({ one, many }) => ({
	project: one(projects, {
		fields: [issues.projectId],
		references: [projects.id]
	}),
	parent: one(issues, {
		fields: [issues.parentId],
		references: [issues.id],
		relationName: 'parentChild'
	}),
	children: many(issues, { relationName: 'parentChild' }),
	comments: many(comments),
	commits: many(commits),
	history: many(issueHistory)
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
	issue: one(issues, {
		fields: [comments.issueId],
		references: [issues.id]
	}),
	parent: one(comments, {
		fields: [comments.parentId],
		references: [comments.id],
		relationName: 'commentReplies'
	}),
	replies: many(comments, { relationName: 'commentReplies' })
}));

export const commitsRelations = relations(commits, ({ one }) => ({
	issue: one(issues, {
		fields: [commits.issueId],
		references: [issues.id]
	})
}));

export const issueHistoryRelations = relations(issueHistory, ({ one }) => ({
	issue: one(issues, {
		fields: [issueHistory.issueId],
		references: [issues.id]
	})
}));

// Type exports for use in the app
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Issue = typeof issues.$inferSelect;
export type NewIssue = typeof issues.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type Commit = typeof commits.$inferSelect;
export type NewCommit = typeof commits.$inferInsert;
export type IssueHistoryEntry = typeof issueHistory.$inferSelect;

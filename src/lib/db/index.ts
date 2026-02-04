import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';

// Ensure data directory exists
const dataDir = join(process.cwd(), 'data');
if (!existsSync(dataDir)) {
	mkdirSync(dataDir, { recursive: true });
}

const dbPath = join(dataDir, 'bugtracker.db');
const sqlite = new Database(dbPath);

// Enable WAL mode for better performance
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });

// Initialize tables
function initializeDatabase() {
	sqlite.exec(`
		CREATE TABLE IF NOT EXISTS projects (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			path TEXT NOT NULL UNIQUE,
			description TEXT,
			color TEXT DEFAULT '#6366f1',
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS issues (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
			parent_id INTEGER REFERENCES issues(id) ON DELETE SET NULL,
			type TEXT NOT NULL DEFAULT 'bug',
			title TEXT NOT NULL,
			description TEXT,
			priority TEXT NOT NULL DEFAULT 'medium',
			status TEXT NOT NULL DEFAULT 'backlog',
			assignee TEXT,
			labels TEXT,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			resolved_at TEXT
		);

		CREATE TABLE IF NOT EXISTS comments (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
			comment_number INTEGER NOT NULL DEFAULT 1,
			parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
			author TEXT DEFAULT 'System',
			content TEXT NOT NULL,
			is_deleted INTEGER DEFAULT 0,
			edited_at TEXT,
			created_at TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS commits (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
			hash TEXT NOT NULL,
			branch TEXT,
			title TEXT,
			url TEXT,
			created_at TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS issue_history (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
			field TEXT NOT NULL,
			old_value TEXT,
			new_value TEXT,
			changed_by TEXT DEFAULT 'System',
			changed_at TEXT NOT NULL
		);

		CREATE INDEX IF NOT EXISTS idx_issues_project ON issues(project_id);
		CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
		CREATE INDEX IF NOT EXISTS idx_issues_priority ON issues(priority);
		CREATE INDEX IF NOT EXISTS idx_issues_type ON issues(type);
		CREATE INDEX IF NOT EXISTS idx_comments_issue ON comments(issue_id);
		CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
		CREATE INDEX IF NOT EXISTS idx_commits_issue ON commits(issue_id);
		CREATE INDEX IF NOT EXISTS idx_history_issue ON issue_history(issue_id);
	`);
}

initializeDatabase();

export { schema };

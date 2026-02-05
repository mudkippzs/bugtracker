PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`issue_id` integer NOT NULL,
	`comment_number` integer DEFAULT 1 NOT NULL,
	`parent_id` integer,
	`author` text DEFAULT 'System',
	`content` text NOT NULL,
	`is_deleted` integer DEFAULT false,
	`edited_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`issue_id`) REFERENCES `issues`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_comments`("id", "issue_id", "comment_number", "parent_id", "author", "content", "is_deleted", "edited_at", "created_at") SELECT "id", "issue_id", "comment_number", "parent_id", "author", "content", "is_deleted", "edited_at", "created_at" FROM `comments`;--> statement-breakpoint
DROP TABLE `comments`;--> statement-breakpoint
ALTER TABLE `__new_comments` RENAME TO `comments`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `issues` ADD `due_date` text;--> statement-breakpoint
ALTER TABLE `issues` ADD `resolved_at` text;
# BugTracker API Skill

This document teaches LLMs how to interact with the BugTracker API for managing projects, issues, comments, and commits.

## Base URL

```
http://bugtracker  (or http://b for short URLs)
http://localhost:5177  (direct access, fixed port)
```

## Quick Reference

| Resource | Create | Read | Update | Delete |
|----------|--------|------|--------|--------|
| Projects | `POST /api/projects` | `GET /api/projects` | `PUT /api/projects/:id` | `DELETE /api/projects/:id` |
| Issues | `POST /api/issues` | `GET /api/issues` | `PUT /api/issues/:id` | `DELETE /api/issues/:id` |
| Comments | `POST /api/issues/:id/comments` | `GET /api/issues/:id/comments` | `PUT /api/comments/:id` | `DELETE /api/comments/:id` |
| Commits | `POST /api/issues/:id/commits` | `GET /api/issues/:id/commits` | - | - |

---

## Projects

Projects represent code repositories or workspaces. All projects live under `/home/dev/Code/`.

### Create a Project

```bash
curl -X POST http://bugtracker/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-awesome-app",
    "path": "my-awesome-app",
    "description": "A cool project",
    "color": "#00f0ff"
  }'
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✓ | Display name for the project |
| `path` | string | ✓ | Path relative to `/home/dev/Code/` (directory will be created if it doesn't exist) |
| `description` | string | | Optional description |
| `color` | string | | Hex color for UI (default: `#6366f1`) |

**Response:** `201 Created`
```json
{
  "id": 1,
  "name": "my-awesome-app",
  "path": "/home/dev/Code/my-awesome-app",
  "description": "A cool project",
  "color": "#00f0ff",
  "createdAt": "2026-02-04T21:00:00.000Z",
  "updatedAt": "2026-02-04T21:00:00.000Z"
}
```

### List All Projects

```bash
curl http://bugtracker/api/projects
```

**Response:** Array of projects with issue counts
```json
[
  {
    "id": 1,
    "name": "my-awesome-app",
    "path": "/home/dev/Code/my-awesome-app",
    "issueCount": 5
  }
]
```

### Get a Single Project

```bash
curl http://bugtracker/api/projects/1
```

### Update a Project

```bash
curl -X PUT http://bugtracker/api/projects/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "renamed-app",
    "color": "#00ff9f"
  }'
```

### Delete a Project

```bash
curl -X DELETE http://bugtracker/api/projects/1
```

⚠️ **Warning:** This deletes all associated issues, comments, and history.

---

## Issues

Issues represent bugs, features, tasks, or other work items.

### Issue Types

| Type | Description |
|------|-------------|
| `bug` | Something is broken |
| `feature` | New functionality request |
| `refactor` | Code improvement without changing behavior |
| `cleanup` | Technical debt, formatting, etc. |
| `task` | General work item |
| `epic` | Large feature containing child issues |

### Priority Levels

| Priority | Description |
|----------|-------------|
| `critical` | Blocks all work, needs immediate fix |
| `high` | Important, should be addressed soon |
| `medium` | Normal priority (default) |
| `low` | Nice to have, can wait |

### Status Values

| Status | Description |
|--------|-------------|
| `backlog` | Not yet planned (default) |
| `todo` | Planned for current work |
| `in_progress` | Currently being worked on |
| `review` | Waiting for review |
| `done` | Completed |
| `closed` | Resolved and closed |

### Create an Issue

```bash
curl -X POST http://bugtracker/api/issues \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "title": "Fix login button not responding",
    "description": "## Steps to Reproduce\n1. Click login\n2. Nothing happens\n\n## Expected\nShould open login modal",
    "type": "bug",
    "priority": "high",
    "status": "todo",
    "assignee": "dev",
    "author": "claude"
  }'
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectId` | integer | ✓ | ID of the parent project |
| `title` | string | ✓ | Brief description of the issue |
| `description` | string | | Detailed description (supports Markdown) |
| `type` | string | | One of: `bug`, `feature`, `refactor`, `cleanup`, `task`, `epic` |
| `priority` | string | | One of: `critical`, `high`, `medium`, `low` |
| `status` | string | | One of: `backlog`, `todo`, `in_progress`, `review`, `done`, `closed` |
| `assignee` | string | | Username to assign |
| `parentId` | integer | | Parent issue ID (for epics) |
| `labels` | array | | Array of label strings |
| `author` | string | | Who created this (for history) |

**Response:** `201 Created`
```json
{
  "id": 42,
  "projectId": 1,
  "title": "Fix login button not responding",
  "type": "bug",
  "priority": "high",
  "status": "todo",
  "assignee": "dev",
  "createdAt": "2026-02-04T21:00:00.000Z",
  "updatedAt": "2026-02-04T21:00:00.000Z"
}
```

### List Issues

```bash
# All issues
curl http://bugtracker/api/issues

# Filter by project
curl "http://bugtracker/api/issues?projectId=1"

# Filter by status
curl "http://bugtracker/api/issues?status=in_progress"

# Filter by type
curl "http://bugtracker/api/issues?type=bug"

# Filter by priority
curl "http://bugtracker/api/issues?priority=critical"

# Combine filters
curl "http://bugtracker/api/issues?projectId=1&status=todo&type=bug"
```

### Get Issue Details

```bash
curl http://bugtracker/api/issues/42
```

**Response:** Issue with all related data
```json
{
  "id": 42,
  "projectId": 1,
  "title": "Fix login button",
  "description": "...",
  "type": "bug",
  "priority": "high",
  "status": "in_progress",
  "project": { "id": 1, "name": "my-app" },
  "comments": [...],
  "commits": [...],
  "history": [...],
  "children": []
}
```

### Update an Issue

```bash
# Change status
curl -X PUT http://bugtracker/api/issues/42 \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress", "author": "claude"}'

# Change priority
curl -X PUT http://bugtracker/api/issues/42 \
  -H "Content-Type: application/json" \
  -d '{"priority": "critical"}'

# Assign to someone
curl -X PUT http://bugtracker/api/issues/42 \
  -H "Content-Type: application/json" \
  -d '{"assignee": "dev"}'

# Update multiple fields
curl -X PUT http://bugtracker/api/issues/42 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "done",
    "title": "Fixed login button",
    "description": "## Solution\nAdded click handler",
    "author": "claude"
  }'
```

All changes are tracked in issue history.

### Delete an Issue

```bash
curl -X DELETE http://bugtracker/api/issues/42
```

---

## Comments

Comments are threaded discussions on issues. Supports Markdown.

### Add a Comment

```bash
curl -X POST http://bugtracker/api/issues/42/comments \
  -H "Content-Type: application/json" \
  -d '{
    "content": "I found the root cause - missing event listener.",
    "author": "claude"
  }'
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | ✓ | Comment text (supports Markdown) |
| `author` | string | | Who wrote this (default: "Anonymous") |
| `parentId` | integer | | Reply to another comment |

### Reply to a Comment

```bash
curl -X POST http://bugtracker/api/issues/42/comments \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Good catch! Can you submit a PR?",
    "author": "dev",
    "parentId": 5
  }'
```

### List Comments

```bash
# Active comments only
curl http://bugtracker/api/issues/42/comments

# Include soft-deleted comments
curl "http://bugtracker/api/issues/42/comments?includeDeleted=true"
```

### Edit a Comment

```bash
curl -X PUT http://bugtracker/api/comments/5 \
  -H "Content-Type: application/json" \
  -d '{"content": "Updated: Found the actual root cause."}'
```

### Delete a Comment

```bash
# Soft delete (hides but preserves)
curl -X DELETE http://bugtracker/api/comments/5

# Hard delete (permanently removes)
curl -X DELETE "http://bugtracker/api/comments/5?hard=true"
```

---

## Commits

Link git commits to issues for traceability.

### Link a Commit

```bash
curl -X POST http://bugtracker/api/issues/42/commits \
  -H "Content-Type: application/json" \
  -d '{
    "hash": "abc123def456",
    "branch": "fix/login-button",
    "title": "Fix click handler on login button",
    "url": "https://github.com/user/repo/commit/abc123",
    "author": "claude"
  }'
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hash` | string | ✓ | Git commit hash |
| `branch` | string | | Branch name |
| `title` | string | | Commit message |
| `url` | string | | Link to commit on GitHub/GitLab |
| `author` | string | | Who linked this |

### List Commits for an Issue

```bash
curl http://bugtracker/api/issues/42/commits
```

---

## Short URLs

Issues can be accessed via short URLs:

```
http://b/42           → Full issue page
http://b/42#5         → Issue page, scrolled to comment #5
```

---

## Common Workflows

### 1. Report a Bug

```bash
# Create the bug
curl -X POST http://bugtracker/api/issues \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "title": "App crashes when clicking save",
    "description": "## Error\n```\nTypeError: undefined is not a function\n```\n\n## Steps\n1. Open editor\n2. Click save",
    "type": "bug",
    "priority": "high",
    "author": "claude"
  }'
```

### 2. Start Working on an Issue

```bash
# Move to in_progress and assign
curl -X PUT http://bugtracker/api/issues/42 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress",
    "assignee": "dev",
    "author": "claude"
  }'

# Add a comment about approach
curl -X POST http://bugtracker/api/issues/42/comments \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Starting work on this. Plan:\n1. Add null check\n2. Write tests",
    "author": "claude"
  }'
```

### 3. Complete an Issue with Commit

```bash
# Link the fix commit
curl -X POST http://bugtracker/api/issues/42/commits \
  -H "Content-Type: application/json" \
  -d '{
    "hash": "abc123",
    "branch": "fix/save-crash",
    "title": "Add null check before save"
  }'

# Move to review
curl -X PUT http://bugtracker/api/issues/42 \
  -H "Content-Type: application/json" \
  -d '{"status": "review", "author": "claude"}'

# After approval, mark done
curl -X PUT http://bugtracker/api/issues/42 \
  -H "Content-Type: application/json" \
  -d '{"status": "done", "author": "claude"}'
```

### 4. Create a Feature Request

```bash
curl -X POST http://bugtracker/api/issues \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "title": "Add dark mode support",
    "description": "## User Story\nAs a user, I want dark mode so I can work at night.\n\n## Acceptance Criteria\n- [ ] Toggle in settings\n- [ ] Persists across sessions\n- [ ] Follows system preference",
    "type": "feature",
    "priority": "medium",
    "author": "claude"
  }'
```

### 5. Create an Epic with Sub-tasks

```bash
# Create the epic
EPIC_ID=$(curl -s -X POST http://bugtracker/api/issues \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "title": "User Authentication System",
    "type": "epic",
    "priority": "high"
  }' | jq -r '.id')

# Create child tasks
curl -X POST http://bugtracker/api/issues \
  -H "Content-Type: application/json" \
  -d "{
    \"projectId\": 1,
    \"parentId\": $EPIC_ID,
    \"title\": \"Implement login form\",
    \"type\": \"task\"
  }"

curl -X POST http://bugtracker/api/issues \
  -H "Content-Type: application/json" \
  -d "{
    \"projectId\": 1,
    \"parentId\": $EPIC_ID,
    \"title\": \"Add password reset flow\",
    \"type\": \"task\"
  }"
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Description of what went wrong"
}
```

| Status | Meaning |
|--------|---------|
| `400` | Bad request (missing/invalid fields) |
| `404` | Resource not found |
| `409` | Conflict (e.g., duplicate path) |
| `500` | Server error |

---

## Tips for AI Agents

1. **Always include `author`** when creating/updating issues and comments - it helps track who (or what) made changes.

2. **Use Markdown** in descriptions and comments for better formatting:
   - Code blocks with ` ``` `
   - Checklists with `- [ ]`
   - Headers with `##`

3. **Link commits** when making code changes related to an issue.

4. **Update status progressively**: `backlog` → `todo` → `in_progress` → `review` → `done`

5. **Use appropriate types**:
   - `bug` for defects
   - `feature` for new functionality
   - `refactor` for code improvements
   - `cleanup` for tech debt
   - `task` for general work
   - `epic` for large features with sub-tasks

6. **Set priority accurately**:
   - `critical` = production is down
   - `high` = important, blocks work
   - `medium` = normal work
   - `low` = nice to have

7. **Add context in comments** when working on issues - future you (or humans) will appreciate it.

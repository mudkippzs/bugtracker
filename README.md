# BugTracker

A modern, local-first bug tracking web application built with SvelteKit. Designed for personal projects with a REST API that allows AI agents and scripts to create and manage issues programmatically.

![SvelteKit](https://img.shields.io/badge/SvelteKit-5.x-orange)
![SQLite](https://img.shields.io/badge/SQLite-3.x-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)

## Features

- **Project Management** - Link projects to directories in `/home/dev/Code/`
- **Multiple Issue Types** - Bugs, Features, Refactors, Cleanups, Tasks, Epics
- **Priority Levels** - Critical, High, Medium, Low
- **Status Workflow** - Backlog → To Do → In Progress → Review → Done → Closed
- **Multiple Views** - List view and Kanban board with drag-and-drop
- **Markdown Support** - Rich formatting for descriptions and comments
- **Commit Linking** - Associate git commits with issues
- **Real-time Updates** - Server-Sent Events for live UI updates
- **Analytics Dashboard** - Visualize issue distribution and trends
- **REST API** - Full CRUD API for programmatic access

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# App runs at http://localhost:5177
```

## Project Structure

```
src/
├── lib/
│   ├── db/              # Database schema and connection
│   ├── components/      # Reusable Svelte components
│   ├── stores/          # Svelte stores for state
│   └── utils/           # Utility functions
├── routes/
│   ├── api/             # REST API endpoints
│   ├── projects/        # Project pages
│   └── analytics/       # Analytics dashboard
└── app.css              # Tailwind styles
```

## REST API Reference

All endpoints return JSON. Base URL: `http://localhost:5177/api`

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects` | List all projects with issue counts |
| POST | `/projects` | Create a new project |
| GET | `/projects/:id` | Get project details |
| PUT | `/projects/:id` | Update a project |
| DELETE | `/projects/:id` | Delete project and all issues |

**Create Project Example:**
```bash
curl -X POST http://localhost:5177/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Project",
    "path": "/home/dev/Code/myproject",
    "description": "Project description",
    "color": "#6366f1"
  }'
```

### Issues

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/issues` | List issues (supports filters) |
| POST | `/issues` | Create a new issue |
| GET | `/issues/:id` | Get issue with comments, commits, history |
| PUT | `/issues/:id` | Update an issue |
| DELETE | `/issues/:id` | Delete an issue |

**Query Parameters for GET /issues:**
- `projectId` - Filter by project
- `type` - Filter by type (bug, feature, refactor, cleanup, task, epic)
- `priority` - Filter by priority (critical, high, medium, low)
- `status` - Filter by status (backlog, todo, in_progress, review, done, closed)

**Create Issue Example (for AI agents):**
```bash
curl -X POST http://localhost:5177/api/issues \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "type": "bug",
    "title": "Null pointer in auth module",
    "description": "## Steps to Reproduce\n\n1. Login with invalid credentials\n2. Application crashes\n\n## Expected\nShow error message",
    "priority": "high",
    "status": "backlog",
    "assignee": "Claude"
  }'
```

**Update Issue Status:**
```bash
curl -X PUT http://localhost:5177/api/issues/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'
```

### Comments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/issues/:id/comments` | Get all comments for an issue |
| POST | `/issues/:id/comments` | Add a comment |

**Add Comment Example:**
```bash
curl -X POST http://localhost:5177/api/issues/1/comments \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Fixed in commit abc123. Ready for review.",
    "author": "Claude"
  }'
```

### Commits

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/issues/:id/commits` | Get linked commits |
| POST | `/issues/:id/commits` | Link a commit to issue |

**Link Commit Example:**
```bash
curl -X POST http://localhost:5177/api/issues/1/commits \
  -H "Content-Type: application/json" \
  -d '{
    "hash": "abc123def456",
    "branch": "fix/auth-bug",
    "title": "Fix null pointer in auth module"
  }'
```

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analytics` | Get overview statistics |

### Project Discovery

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/discover` | Discover projects in /home/dev/Code |

### Real-time Updates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/events` | Server-Sent Events stream |

**SSE Events:**
- `issue_created` - New issue created
- `issue_updated` - Issue updated
- `issue_deleted` - Issue deleted
- `comment_added` - Comment added

## Issue Types

| Type | Use Case |
|------|----------|
| `bug` | Something is broken |
| `feature` | New functionality request |
| `refactor` | Code improvement without behavior change |
| `cleanup` | Tech debt, code cleanup |
| `task` | General work item |
| `epic` | Parent issue grouping related work |

## Database

SQLite database stored at `./data/bugtracker.db`. Uses WAL mode for better performance.

## Integration with AI Agents

This API is designed to be called by AI agents like Claude. Example workflow:

```python
import requests

BASE_URL = "http://localhost:5177/api"

# Create a bug when found during code review
def report_bug(project_id, title, description):
    return requests.post(f"{BASE_URL}/issues", json={
        "projectId": project_id,
        "type": "bug",
        "title": title,
        "description": description,
        "priority": "medium",
        "author": "Claude"
    }).json()

# Link a commit when fix is complete
def link_fix(issue_id, commit_hash, branch):
    requests.post(f"{BASE_URL}/issues/{issue_id}/commits", json={
        "hash": commit_hash,
        "branch": branch
    })
    # Update status to review
    requests.put(f"{BASE_URL}/issues/{issue_id}", json={
        "status": "review"
    })
```

## Deployment

### Docker (Recommended)

```bash
# Clone the repo
git clone https://github.com/yourusername/bugtracker.git
cd bugtracker

# Set your code directory
export CODE_DIR=/path/to/your/projects

# Build and run
docker compose up -d

# App runs at http://localhost:3000
```

### Manual Deployment

```bash
# Install dependencies
npm ci

# Build for production
npm run build

# Set environment variables
export CODE_DIR=/path/to/your/projects
export PORT=3000

# Run
node build
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CODE_DIR` | `/home/dev/Code` | Directory to scan for projects |
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Host binding |

## Tech Stack

- **Framework**: SvelteKit 2.x
- **Styling**: Tailwind CSS
- **Database**: SQLite + Drizzle ORM
- **Icons**: Lucide Svelte
- **Markdown**: marked + DOMPurify

## License

MIT

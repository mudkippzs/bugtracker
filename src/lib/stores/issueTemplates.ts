import type { IssueType } from '$lib/db/schema';

export interface IssueTemplate {
	id: string;
	name: string;
	type: IssueType;
	title: string;
	description: string;
}

export const defaultTemplates: IssueTemplate[] = [
	{
		id: 'bug-default',
		name: 'Bug Report',
		type: 'bug',
		title: '[Bug] ',
		description: `## Description
A clear description of the bug.

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Environment
- OS: [e.g. Windows 11, macOS 14]
- Browser: [e.g. Chrome 120, Firefox 121]
- Version: [e.g. 1.0.0]

## Additional Context
Any other context, screenshots, or logs.`
	},
	{
		id: 'feature-default',
		name: 'Feature Request',
		type: 'feature',
		title: '[Feature] ',
		description: `## Summary
A brief summary of the feature.

## Problem Statement
What problem does this solve? Who is affected?

## Proposed Solution
Describe the solution you'd like.

## Alternatives Considered
Other solutions or features you've considered.

## Additional Context
Any mockups, diagrams, or references.`
	},
	{
		id: 'task-default',
		name: 'Task',
		type: 'task',
		title: '[Task] ',
		description: `## Objective
What needs to be done?

## Acceptance Criteria
- [ ] Criteria 1
- [ ] Criteria 2
- [ ] Criteria 3

## Notes
Any additional details or dependencies.`
	},
	{
		id: 'refactor-default',
		name: 'Refactoring',
		type: 'refactor',
		title: '[Refactor] ',
		description: `## Current State
Describe the current implementation.

## Proposed Changes
What changes are needed?

## Rationale
Why is this refactoring needed?

## Impact
- Performance impact:
- Breaking changes:
- Files affected:

## Testing Plan
How will you verify the refactoring works?`
	},
	{
		id: 'epic-default',
		name: 'Epic',
		type: 'epic',
		title: '[Epic] ',
		description: `## Vision
High-level description of the epic.

## Goals
- Goal 1
- Goal 2
- Goal 3

## User Stories
- As a [user], I want [feature], so that [benefit]
- As a [user], I want [feature], so that [benefit]

## Success Metrics
How will we measure success?

## Timeline
Estimated duration and milestones.

## Dependencies
Other epics or features this depends on.`
	},
	{
		id: 'cleanup-default',
		name: 'Cleanup',
		type: 'cleanup',
		title: '[Cleanup] ',
		description: `## What
What needs to be cleaned up?

## Why
Why is this cleanup needed?

## Scope
- [ ] Item 1
- [ ] Item 2
- [ ] Item 3

## Notes
Any considerations or caveats.`
	}
];

export function getTemplatesForType(type: IssueType): IssueTemplate[] {
	return defaultTemplates.filter(t => t.type === type);
}

export function getTemplateById(id: string): IssueTemplate | undefined {
	return defaultTemplates.find(t => t.id === id);
}

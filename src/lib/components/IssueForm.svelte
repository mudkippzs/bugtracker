<script lang="ts">
	import { issueTypes, priorities, statuses } from '$lib/db/schema';
	import type { Issue, NewIssue } from '$lib/db/schema';
	import { X } from 'lucide-svelte';

	interface Props {
		issue?: Partial<Issue>;
		projectId: number;
		onsubmit: (data: NewIssue) => void;
		oncancel: () => void;
	}

	let { issue, projectId, onsubmit, oncancel }: Props = $props();

	let title = $state(issue?.title || '');
	let description = $state(issue?.description || '');
	let type = $state(issue?.type || 'bug');
	let priority = $state(issue?.priority || 'medium');
	let status = $state(issue?.status || 'backlog');
	let assignee = $state(issue?.assignee || '');

	function handleSubmit(e: Event) {
		e.preventDefault();
		onsubmit({
			projectId,
			title,
			description: description || null,
			type,
			priority,
			status,
			assignee: assignee || null
		});
	}

	const typeLabels: Record<string, string> = {
		bug: 'Bug',
		feature: 'Feature Request',
		refactor: 'Refactor',
		cleanup: 'Cleanup / Tech Debt',
		task: 'Task',
		epic: 'Epic'
	};

	const priorityLabels: Record<string, string> = {
		critical: 'Critical',
		high: 'High',
		medium: 'Medium',
		low: 'Low'
	};

	const statusLabels: Record<string, string> = {
		backlog: 'Backlog',
		todo: 'To Do',
		in_progress: 'In Progress',
		review: 'Review',
		done: 'Done',
		closed: 'Closed'
	};
</script>

<div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={oncancel} role="dialog">
	<div 
		class="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up"
		onclick={(e) => e.stopPropagation()}
		role="document"
	>
		<div class="flex items-center justify-between p-6 border-b border-surface-700">
			<h2 class="text-xl font-semibold text-surface-100">
				{issue?.id ? 'Edit Issue' : 'New Issue'}
			</h2>
			<button class="btn-ghost p-2 rounded-lg" onclick={oncancel}>
				<X size={20} />
			</button>
		</div>

		<form onsubmit={handleSubmit} class="p-6 space-y-5">
			<div>
				<label for="title" class="label">Title</label>
				<input
					id="title"
					type="text"
					class="input"
					placeholder="Brief description of the issue"
					bind:value={title}
					required
				/>
			</div>

			<div>
				<label for="description" class="label">Description (Markdown supported)</label>
				<textarea
					id="description"
					class="input min-h-[150px] font-mono text-sm"
					placeholder="Detailed description, steps to reproduce, expected behavior..."
					bind:value={description}
				></textarea>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div>
					<label for="type" class="label">Type</label>
					<select id="type" class="input" bind:value={type}>
						{#each issueTypes as t}
							<option value={t}>{typeLabels[t]}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="priority" class="label">Priority</label>
					<select id="priority" class="input" bind:value={priority}>
						{#each priorities as p}
							<option value={p}>{priorityLabels[p]}</option>
						{/each}
					</select>
				</div>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div>
					<label for="status" class="label">Status</label>
					<select id="status" class="input" bind:value={status}>
						{#each statuses as s}
							<option value={s}>{statusLabels[s]}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="assignee" class="label">Assignee</label>
					<input
						id="assignee"
						type="text"
						class="input"
						placeholder="Name or username"
						bind:value={assignee}
					/>
				</div>
			</div>

			<div class="flex justify-end gap-3 pt-4">
				<button type="button" class="btn btn-secondary" onclick={oncancel}>
					Cancel
				</button>
				<button type="submit" class="btn btn-primary">
					{issue?.id ? 'Update Issue' : 'Create Issue'}
				</button>
			</div>
		</form>
	</div>
</div>

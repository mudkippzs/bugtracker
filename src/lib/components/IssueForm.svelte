<script lang="ts">
	import { issueTypes, priorities, statuses, type NewIssue, type Issue } from '$lib/db/schema';
	import { X } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import LabelPicker from './LabelPicker.svelte';

	interface Props {
		projectId: number;
		issue?: Issue;
		onsubmit: (data: NewIssue | Partial<Issue>) => void | Promise<void>;
		oncancel: () => void;
	}

	let { projectId, issue, onsubmit, oncancel }: Props = $props();

	// Parse existing labels from JSON string
	function parseLabels(labelsJson: string | null | undefined): string[] {
		if (!labelsJson) return [];
		try {
			return JSON.parse(labelsJson);
		} catch {
			return [];
		}
	}

	let title = $state(issue?.title ?? '');
	let description = $state(issue?.description ?? '');
	let type = $state<typeof issueTypes[number]>(issue?.type ?? 'bug');
	let priority = $state<typeof priorities[number]>(issue?.priority ?? 'medium');
	let status = $state<typeof statuses[number]>(issue?.status ?? 'backlog');
	let assignee = $state(issue?.assignee ?? '');
	let dueDate = $state(issue?.dueDate ?? '');
	let labels = $state<string[]>(parseLabels(issue?.labels));
	let submitting = $state(false);

	const isEditing = !!issue;

	const typeLabels: Record<string, string> = {
		bug: 'BUG',
		feature: 'FEATURE',
		refactor: 'REFACTOR',
		cleanup: 'CLEANUP',
		task: 'TASK',
		epic: 'EPIC'
	};

	const priorityLabels: Record<string, string> = {
		critical: 'CRITICAL',
		high: 'HIGH',
		medium: 'MEDIUM',
		low: 'LOW'
	};

	const statusLabels: Record<string, string> = {
		backlog: 'BACKLOG',
		todo: 'TODO',
		in_progress: 'IN_PROGRESS',
		review: 'REVIEW',
		done: 'DONE',
		closed: 'CLOSED'
	};

	async function handleSubmit() {
		if (!title.trim() || submitting) return;

		submitting = true;
		try {
			if (isEditing) {
				await onsubmit({
					title: title.trim(),
					description: description.trim() || null,
					type,
					priority,
					status,
					assignee: assignee.trim() || null,
					dueDate: dueDate || null,
					labels: labels.length > 0 ? labels : null
				});
			} else {
				await onsubmit({
					projectId,
					title: title.trim(),
					description: description.trim() || null,
					type,
					priority,
					status,
					assignee: assignee.trim() || null,
					dueDate: dueDate || null,
					labels: labels.length > 0 ? labels : null
				});
			}
		} finally {
			submitting = false;
		}
	}
</script>

<div class="fixed inset-0 bg-void/90 backdrop-blur-sm z-50 flex items-start justify-center pt-12 px-4 overflow-y-auto" onclick={oncancel}>
	<div 
		class="bg-void-100 border border-void-50 w-full max-w-lg mb-8 animate-slide-up"
		onclick={(e) => e.stopPropagation()}
		role="dialog"
	>
		<!-- Header -->
		<div class="flex items-center justify-between p-3 border-b border-void-50">
			<h2 class="text-sm text-ghost-bright font-display tracking-wide">
				{isEditing ? 'EDIT ISSUE' : 'NEW ISSUE'}
			</h2>
			<button class="btn btn-ghost p-1" onclick={oncancel}>
				<X size={14} />
			</button>
		</div>

		<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="p-3 space-y-3">
			<!-- Title -->
			<div>
				<label for="title" class="label">Title</label>
				<input 
					id="title" 
					type="text" 
					class="input" 
					placeholder="Brief description..."
					bind:value={title}
					required 
				/>
			</div>

			<!-- Type + Priority -->
			<div class="grid grid-cols-2 gap-3">
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

			<!-- Status + Assignee -->
			<div class="grid grid-cols-2 gap-3">
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
						placeholder="username"
						bind:value={assignee}
					/>
				</div>
			</div>

			<!-- Due Date -->
			<div>
				<label for="dueDate" class="label">Due Date</label>
				<input 
					id="dueDate" 
					type="date" 
					class="input"
					bind:value={dueDate}
				/>
			</div>

			<!-- Labels -->
			<div>
				<label class="label">Labels</label>
				<LabelPicker {labels} onchange={(newLabels) => labels = newLabels} />
			</div>

			<!-- Description -->
			<div>
				<label for="desc" class="label">Description <span class="text-ghost-dim">(markdown)</span></label>
				<textarea 
					id="desc" 
					class="input min-h-[100px] resize-y text-xs"
					placeholder="## Details&#10;&#10;Describe the issue..."
					bind:value={description}
				></textarea>
			</div>

			<!-- Actions -->
			<div class="flex justify-end gap-2 pt-2">
				<button type="button" class="btn btn-secondary" onclick={oncancel} disabled={submitting}>CANCEL</button>
				<button type="submit" class="btn btn-primary" disabled={submitting}>
					{submitting ? 'SAVING...' : (isEditing ? 'SAVE' : 'CREATE')}
				</button>
			</div>
		</form>
	</div>
</div>

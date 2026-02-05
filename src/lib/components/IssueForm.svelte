<script lang="ts">
	import { issueTypes, priorities, statuses, type NewIssue, type Issue } from '$lib/db/schema';
	import { X, Eye, Edit3, FileText } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import LabelPicker from './LabelPicker.svelte';
	import MarkdownContent from './MarkdownContent.svelte';
	import { defaultTemplates, getTemplatesForType, type IssueTemplate } from '$lib/stores/issueTemplates';

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
	let estimate = $state(issue?.estimate ? String(issue.estimate) : '');
	let labels = $state<string[]>(parseLabels(issue?.labels));
	let submitting = $state(false);
	let showPreview = $state(false);
	let showTemplates = $state(false);

	const isEditing = !!issue;

	// Get available templates for the current type
	const availableTemplates = $derived(getTemplatesForType(type));

	function applyTemplate(template: IssueTemplate) {
		title = template.title;
		description = template.description;
		showTemplates = false;
	}

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
					estimate: estimate ? parseInt(estimate) : null,
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
					estimate: estimate ? parseInt(estimate) : null,
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
				<div class="flex items-center justify-between mb-1">
					<label for="title" class="label mb-0">Title</label>
					{#if !isEditing && availableTemplates.length > 0}
						<div class="relative">
							<button 
								type="button"
								class="text-2xs text-ghost-dim hover:text-cyber flex items-center gap-1"
								onclick={() => showTemplates = !showTemplates}
							>
								<FileText size={10} />
								Use Template
							</button>
							{#if showTemplates}
								<div class="absolute right-0 top-full mt-1 bg-void-100 border border-void-50 z-20 min-w-[150px] shadow-lg">
									{#each availableTemplates as template}
										<button 
											type="button"
											class="w-full text-left px-2 py-1.5 text-xs text-ghost hover:bg-void-50"
											onclick={() => applyTemplate(template)}
										>
											{template.name}
										</button>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
				</div>
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

			<!-- Due Date + Estimate -->
			<div class="grid grid-cols-2 gap-3">
				<div>
					<label for="dueDate" class="label">Due Date</label>
					<input 
						id="dueDate" 
						type="date" 
						class="input"
						bind:value={dueDate}
					/>
				</div>
				<div>
					<label for="estimate" class="label">Estimate (minutes)</label>
					<input 
						id="estimate" 
						type="number" 
						class="input"
						placeholder="e.g. 60"
						min="0"
						bind:value={estimate}
					/>
				</div>
			</div>

			<!-- Labels -->
			<div>
				<label class="label">Labels</label>
				<LabelPicker {labels} onchange={(newLabels) => labels = newLabels} />
			</div>

			<!-- Description with Preview -->
			<div>
				<div class="flex items-center justify-between mb-1">
					<label for="desc" class="label mb-0">Description</label>
					<div class="flex items-center bg-void-200 border border-void-50">
						<button 
							type="button"
							class="p-1 px-2 text-2xs flex items-center gap-1 transition-colors
								{!showPreview ? 'bg-cyber-muted text-cyber' : 'text-ghost-dim hover:text-ghost'}"
							onclick={() => showPreview = false}
						>
							<Edit3 size={10} />
							WRITE
						</button>
						<button 
							type="button"
							class="p-1 px-2 text-2xs flex items-center gap-1 transition-colors
								{showPreview ? 'bg-cyber-muted text-cyber' : 'text-ghost-dim hover:text-ghost'}"
							onclick={() => showPreview = true}
						>
							<Eye size={10} />
							PREVIEW
						</button>
					</div>
				</div>
				
				{#if showPreview}
					<div class="input min-h-[100px] overflow-y-auto bg-void-200">
						{#if description.trim()}
							<MarkdownContent content={description} />
						{:else}
							<p class="text-ghost-dim text-xs italic">Nothing to preview</p>
						{/if}
					</div>
				{:else}
					<textarea 
						id="desc" 
						class="input min-h-[100px] resize-y text-xs"
						placeholder="## Details&#10;&#10;Describe the issue..."
						bind:value={description}
					></textarea>
				{/if}
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

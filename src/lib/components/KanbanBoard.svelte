<script lang="ts">
	import { issuesByStatus } from '$lib/stores/issues';
	import IssueCard from './IssueCard.svelte';
	import { goto } from '$app/navigation';
	import type { Issue } from '$lib/db/schema';

	interface Props {
		projectId?: number;
		onUpdateStatus?: (issueId: number, newStatus: string) => void;
	}

	let { projectId, onUpdateStatus }: Props = $props();

	const columns = [
		{ id: 'backlog', label: 'Backlog', color: 'bg-status-backlog' },
		{ id: 'todo', label: 'To Do', color: 'bg-status-todo' },
		{ id: 'in_progress', label: 'In Progress', color: 'bg-status-in_progress' },
		{ id: 'review', label: 'Review', color: 'bg-status-review' },
		{ id: 'done', label: 'Done', color: 'bg-status-done' }
	];

	let draggedIssue: Issue | null = $state(null);
	let dragOverColumn: string | null = $state(null);

	function handleDragStart(e: DragEvent, issue: Issue) {
		draggedIssue = issue;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', String(issue.id));
		}
	}

	function handleDragOver(e: DragEvent, columnId: string) {
		e.preventDefault();
		dragOverColumn = columnId;
	}

	function handleDragLeave() {
		dragOverColumn = null;
	}

	function handleDrop(e: DragEvent, columnId: string) {
		e.preventDefault();
		dragOverColumn = null;

		if (draggedIssue && draggedIssue.status !== columnId && onUpdateStatus) {
			onUpdateStatus(draggedIssue.id, columnId);
		}
		draggedIssue = null;
	}

	function handleIssueClick(issue: Issue) {
		goto(`/projects/${issue.projectId}/issues/${issue.id}`);
	}
</script>

<div class="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-16rem)]">
	{#each columns as column}
		{@const columnIssues = $issuesByStatus[column.id] || []}
		<div
			class="flex-shrink-0 w-72 rounded-xl border transition-all duration-200 {dragOverColumn === column.id ? 'border-accent bg-accent/5' : 'border-surface-700 bg-surface-900/50'}"
			ondragover={(e) => handleDragOver(e, column.id)}
			ondragleave={handleDragLeave}
			ondrop={(e) => handleDrop(e, column.id)}
			role="region"
			aria-label="{column.label} column"
		>
			<!-- Column Header -->
			<div class="p-3 border-b border-surface-700 flex items-center gap-2">
				<span class="{column.color} w-2 h-2 rounded-full"></span>
				<h3 class="font-medium text-surface-200">{column.label}</h3>
				<span class="ml-auto text-xs text-surface-500 bg-surface-800 px-2 py-0.5 rounded-full">
					{columnIssues.length}
				</span>
			</div>

			<!-- Issues -->
			<div class="p-2 space-y-2 min-h-[200px]">
				{#each columnIssues as issue (issue.id)}
					<div
						draggable="true"
						ondragstart={(e) => handleDragStart(e, issue)}
						class="transition-opacity"
						class:opacity-50={draggedIssue?.id === issue.id}
						role="listitem"
					>
						<IssueCard 
							{issue} 
							compact 
							draggable
							onclick={() => handleIssueClick(issue)}
						/>
					</div>
				{/each}

				{#if columnIssues.length === 0}
					<div class="text-center py-8 text-surface-500 text-sm">
						No issues
					</div>
				{/if}
			</div>
		</div>
	{/each}
</div>

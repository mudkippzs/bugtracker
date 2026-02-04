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
		{ id: 'backlog', label: 'BACKLOG', color: 'bg-status-backlog' },
		{ id: 'todo', label: 'TODO', color: 'bg-status-todo' },
		{ id: 'in_progress', label: 'IN_PROG', color: 'bg-status-in_progress' },
		{ id: 'review', label: 'REVIEW', color: 'bg-status-review' },
		{ id: 'done', label: 'DONE', color: 'bg-status-done' }
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

<div class="flex gap-2 overflow-x-auto pb-2 min-h-[calc(100vh-12rem)]">
	{#each columns as column}
		{@const columnIssues = $issuesByStatus[column.id] || []}
		{@const isOver = dragOverColumn === column.id}
		<div
			class="flex-shrink-0 w-56 bg-void-100 border transition-all duration-150 {isOver ? 'border-cyber-dim shadow-glow-cyan-sm' : 'border-void-50'}"
			ondragover={(e) => handleDragOver(e, column.id)}
			ondragleave={handleDragLeave}
			ondrop={(e) => handleDrop(e, column.id)}
			role="region"
			aria-label="{column.label} column"
		>
			<!-- Column Header -->
			<div class="px-2 py-1.5 border-b border-void-50 flex items-center gap-2 bg-void-200">
				<span class="{column.color} w-1.5 h-1.5"></span>
				<span class="text-2xs text-ghost-dim uppercase tracking-wider flex-1">{column.label}</span>
				<span class="text-2xs text-ghost-dim bg-void-100 px-1">
					{columnIssues.length}
				</span>
			</div>

			<!-- Issues -->
			<div class="p-1 space-y-1 min-h-[150px]">
				{#each columnIssues as issue (issue.id)}
					<div
						draggable="true"
						ondragstart={(e) => handleDragStart(e, issue)}
						class="transition-opacity"
						class:opacity-40={draggedIssue?.id === issue.id}
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
					<div class="text-center py-6 text-ghost-dim text-2xs uppercase">
						Empty
					</div>
				{/if}
			</div>
		</div>
	{/each}
</div>

<script lang="ts">
	import { issuesByStatus, filteredIssues } from '$lib/stores/issues';
	import { selectedIssues, hasIssueSelection } from '$lib/stores/selection';
	import IssueCard from './IssueCard.svelte';
	import ContextMenu from './ContextMenu.svelte';
	import { goto } from '$app/navigation';
	import { FolderOpen, ArrowRight, Trash2, Check, X, MoveRight } from 'lucide-svelte';
	import type { Issue } from '$lib/db/schema';

	interface Props {
		projectId?: number;
		onUpdateStatus?: (issueId: number, newStatus: string) => void;
		onBulkStatusChange?: (issueIds: number[], status: string) => void;
		onBulkDelete?: (issueIds: number[]) => void;
	}

	let { projectId, onUpdateStatus, onBulkStatusChange, onBulkDelete }: Props = $props();

	const columns = [
		{ id: 'backlog', label: 'BACKLOG', color: 'bg-status-backlog' },
		{ id: 'todo', label: 'TODO', color: 'bg-status-todo' },
		{ id: 'in_progress', label: 'IN_PROG', color: 'bg-status-in_progress' },
		{ id: 'review', label: 'REVIEW', color: 'bg-status-review' },
		{ id: 'done', label: 'DONE', color: 'bg-status-done' }
	];

	let draggedIssue: Issue | null = $state(null);
	let dragOverColumn: string | null = $state(null);
	let contextMenu = $state<{ x: number; y: number; issueId: number } | null>(null);

	// Get all issue IDs in display order for range selection
	const allIssueIds = $derived(
		$filteredIssues.map(i => i.id)
	);

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

		// If we have selected items and dragged one of them, move all selected
		if ($hasIssueSelection && draggedIssue && $selectedIssues.has(draggedIssue.id)) {
			const selectedIds = Array.from($selectedIssues);
			if (onBulkStatusChange) {
				onBulkStatusChange(selectedIds, columnId);
			}
		} else if (draggedIssue && draggedIssue.status !== columnId && onUpdateStatus) {
			onUpdateStatus(draggedIssue.id, columnId);
		}
		draggedIssue = null;
	}

	function handleIssueClick(e: MouseEvent, issue: Issue) {
		if (e.shiftKey) {
			// Shift+click: select range
			selectedIssues.selectRange(allIssueIds, issue.id);
		} else if (e.ctrlKey || e.metaKey) {
			// Ctrl/Cmd+click: toggle selection
			selectedIssues.toggle(issue.id);
		} else {
			// Regular click
			if ($hasIssueSelection) {
				// If there's a selection, toggle this item
				selectedIssues.toggle(issue.id);
			} else {
				// Navigate to issue
				goto(`/projects/${issue.projectId}/issues/${issue.id}`);
			}
		}
	}

	function handleContextMenu(e: MouseEvent, issue: Issue) {
		e.preventDefault();
		contextMenu = { x: e.clientX, y: e.clientY, issueId: issue.id };
		
		// Add to selection if not already selected
		if (!$selectedIssues.has(issue.id)) {
			selectedIssues.select(issue.id);
		}
	}

	function closeContextMenu() {
		contextMenu = null;
	}

	function getContextMenuItems(issueId: number) {
		const items = [
			{
				label: 'Open Issue',
				icon: FolderOpen,
				action: () => {
					const issue = $filteredIssues.find(i => i.id === issueId);
					if (issue) goto(`/projects/${issue.projectId}/issues/${issue.id}`);
				}
			},
			{ divider: true, label: '', action: () => {} },
			{
				label: 'Select All',
				icon: Check,
				action: () => selectedIssues.selectAll(allIssueIds)
			},
			{
				label: 'Clear Selection',
				icon: X,
				action: () => selectedIssues.clear()
			}
		];

		// Add status change options
		items.push({ divider: true, label: '', action: () => {} });
		for (const col of columns) {
			items.push({
				label: `Move to ${col.label}`,
				icon: ArrowRight,
				action: () => {
					if (onBulkStatusChange) {
						onBulkStatusChange(Array.from($selectedIssues), col.id);
					}
				}
			});
		}

		// Add delete option
		if (onBulkDelete) {
			items.push({ divider: true, label: '', action: () => {} });
			items.push({
				label: `Delete Selected (${$selectedIssues.size})`,
				icon: Trash2,
				danger: true,
				action: () => onBulkDelete(Array.from($selectedIssues))
			});
		}

		return items;
	}
</script>

<svelte:window onclick={closeContextMenu} onkeydown={(e) => e.key === 'Escape' && (selectedIssues.clear(), closeContextMenu())} />

<div class="flex gap-2 overflow-x-auto pb-2 min-h-[calc(100vh-14rem)]">
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
							selectable={$hasIssueSelection}
							onclick={(e) => handleIssueClick(e, issue)}
							oncontextmenu={(e) => handleContextMenu(e, issue)}
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

<!-- Context Menu -->
{#if contextMenu}
	<ContextMenu 
		x={contextMenu.x}
		y={contextMenu.y}
		items={getContextMenuItems(contextMenu.issueId)}
		onClose={closeContextMenu}
	/>
{/if}

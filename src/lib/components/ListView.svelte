<script lang="ts">
	import { filteredIssues } from '$lib/stores/issues';
	import { selectedIssues, hasIssueSelection } from '$lib/stores/selection';
	import { focusedIssueIndex } from '$lib/stores/keyboard';
	import { goto } from '$app/navigation';
	import { Bug, Lightbulb, Wrench, Trash2, ClipboardList, Layers, ArrowUpDown, Check, FolderOpen, ArrowRight, X } from 'lucide-svelte';
	import ContextMenu from './ContextMenu.svelte';
	import type { Issue } from '$lib/db/schema';

	interface Props {
		projectId?: number;
		onBulkStatusChange?: (issueIds: number[], status: string) => void;
		onBulkDelete?: (issueIds: number[]) => void;
	}

	let { projectId, onBulkStatusChange, onBulkDelete }: Props = $props();

	const typeIcons = {
		bug: Bug,
		feature: Lightbulb,
		refactor: Wrench,
		cleanup: Trash2,
		task: ClipboardList,
		epic: Layers
	};

	const statusLabels: Record<string, string> = {
		backlog: 'BACKLOG',
		todo: 'TODO',
		in_progress: 'IN_PROG',
		review: 'REVIEW',
		done: 'DONE',
		closed: 'CLOSED'
	};

	const priorityLabels: Record<string, string> = {
		critical: 'CRIT',
		high: 'HIGH',
		medium: 'MED',
		low: 'LOW'
	};

	const statuses = ['backlog', 'todo', 'in_progress', 'review', 'done', 'closed'];

	type SortField = 'id' | 'title' | 'priority' | 'status' | 'updatedAt';
	let sortField = $state<SortField>('updatedAt');
	let sortDir = $state<'asc' | 'desc'>('desc');
	let contextMenu = $state<{ x: number; y: number; issueId: number } | null>(null);

	const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
	const statusOrder = { backlog: 0, todo: 1, in_progress: 2, review: 3, done: 4, closed: 5 };

	let sortedIssues = $derived(() => {
		const issues = [...$filteredIssues];
		issues.sort((a, b) => {
			let cmp = 0;
			switch (sortField) {
				case 'id': cmp = a.id - b.id; break;
				case 'title': cmp = a.title.localeCompare(b.title); break;
				case 'priority': cmp = priorityOrder[a.priority] - priorityOrder[b.priority]; break;
				case 'status': cmp = statusOrder[a.status] - statusOrder[b.status]; break;
				case 'updatedAt': cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(); break;
			}
			return sortDir === 'asc' ? cmp : -cmp;
		});
		return issues;
	});

	const allIssueIds = $derived(sortedIssues().map(i => i.id));

	function toggleSort(field: SortField) {
		if (sortField === field) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortField = field;
			sortDir = 'desc';
		}
	}

	function handleRowClick(e: MouseEvent, issue: Issue) {
		if (e.shiftKey) {
			selectedIssues.selectRange(allIssueIds, issue.id);
		} else if (e.ctrlKey || e.metaKey) {
			selectedIssues.toggle(issue.id);
		} else {
			if ($hasIssueSelection) {
				selectedIssues.toggle(issue.id);
			} else {
				goto(`/projects/${issue.projectId}/issues/${issue.id}`);
			}
		}
	}

	function handleContextMenu(e: MouseEvent, issue: Issue) {
		e.preventDefault();
		contextMenu = { x: e.clientX, y: e.clientY, issueId: issue.id };
		if (!$selectedIssues.has(issue.id)) {
			selectedIssues.select(issue.id);
		}
	}

	function closeContextMenu() {
		contextMenu = null;
	}

	function handleSelectAll(e: Event) {
		const checkbox = e.target as HTMLInputElement;
		if (checkbox.checked) {
			selectedIssues.selectAll(allIssueIds);
		} else {
			selectedIssues.clear();
		}
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

		if (onBulkStatusChange) {
			items.push({ divider: true, label: '', action: () => {} });
			for (const status of statuses) {
				items.push({
					label: `Move to ${statusLabels[status]}`,
					icon: ArrowRight,
					action: () => onBulkStatusChange(Array.from($selectedIssues), status)
				});
			}
		}

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

	function formatDate(dateStr: string) {
		const date = new Date(dateStr);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		
		if (days === 0) return 'today';
		if (days === 1) return '1d';
		if (days < 7) return `${days}d`;
		return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
	}

	const allSelected = $derived(allIssueIds.length > 0 && allIssueIds.every(id => $selectedIssues.has(id)));
	const someSelected = $derived($selectedIssues.size > 0 && !allSelected);
</script>

<svelte:window onclick={closeContextMenu} onkeydown={(e) => e.key === 'Escape' && (selectedIssues.clear(), closeContextMenu())} />

<div class="bg-void-100 border border-void-50 overflow-hidden">
	<table class="w-full text-xs">
		<thead class="bg-void-200 border-b border-void-50">
			<tr>
				<th class="px-2 py-1.5 w-8">
					<div class="flex items-center justify-center">
						<input 
							type="checkbox" 
							class="w-3.5 h-3.5 accent-cyber"
							checked={allSelected}
							indeterminate={someSelected}
							onchange={handleSelectAll}
						/>
					</div>
				</th>
				<th class="px-2 py-1.5 text-left w-12">
					<button class="flex items-center gap-1 text-2xs text-ghost-dim hover:text-ghost uppercase tracking-wider" onclick={() => toggleSort('id')}>
						ID {#if sortField === 'id'}<ArrowUpDown size={10} />{/if}
					</button>
				</th>
				<th class="px-2 py-1.5 text-left">
					<button class="flex items-center gap-1 text-2xs text-ghost-dim hover:text-ghost uppercase tracking-wider" onclick={() => toggleSort('title')}>
						TITLE {#if sortField === 'title'}<ArrowUpDown size={10} />{/if}
					</button>
				</th>
				<th class="px-2 py-1.5 text-left w-16 text-2xs text-ghost-dim uppercase tracking-wider">TYPE</th>
				<th class="px-2 py-1.5 text-left w-16">
					<button class="flex items-center gap-1 text-2xs text-ghost-dim hover:text-ghost uppercase tracking-wider" onclick={() => toggleSort('priority')}>
						PRI {#if sortField === 'priority'}<ArrowUpDown size={10} />{/if}
					</button>
				</th>
				<th class="px-2 py-1.5 text-left w-20">
					<button class="flex items-center gap-1 text-2xs text-ghost-dim hover:text-ghost uppercase tracking-wider" onclick={() => toggleSort('status')}>
						STATUS {#if sortField === 'status'}<ArrowUpDown size={10} />{/if}
					</button>
				</th>
				<th class="px-2 py-1.5 text-left w-16">
					<button class="flex items-center gap-1 text-2xs text-ghost-dim hover:text-ghost uppercase tracking-wider" onclick={() => toggleSort('updatedAt')}>
						AGE {#if sortField === 'updatedAt'}<ArrowUpDown size={10} />{/if}
					</button>
				</th>
			</tr>
		</thead>
		<tbody class="divide-y divide-void-50">
			{#each sortedIssues() as issue, idx (issue.id)}
				{@const TypeIcon = typeIcons[issue.type] || Bug}
				{@const isSelected = $selectedIssues.has(issue.id)}
				{@const isFocused = $focusedIssueIndex === idx}
				<tr 
					class="cursor-pointer transition-colors select-none
						{isSelected ? 'bg-cyber-muted' : isFocused ? 'bg-void-50 ring-1 ring-cyber-dim ring-inset' : 'hover:bg-void-50'}"
					onclick={(e) => handleRowClick(e, issue)}
					oncontextmenu={(e) => handleContextMenu(e, issue)}
				>
					<td class="px-2 py-1.5">
						<div class="flex items-center justify-center">
							<div 
								class="w-3.5 h-3.5 border flex items-center justify-center transition-colors
									{isSelected ? 'bg-cyber border-cyber' : 'border-ghost-dim/30'}"
							>
								{#if isSelected}
									<Check size={10} class="text-void" />
								{/if}
							</div>
						</div>
					</td>
					<td class="px-2 py-1.5 text-ghost-dim">#{issue.id}</td>
					<td class="px-2 py-1.5 text-ghost-bright truncate max-w-xs">{issue.title}</td>
					<td class="px-2 py-1.5">
						<span class="flex items-center gap-1 text-ghost-dim">
							<TypeIcon size={10} />
						</span>
					</td>
					<td class="px-2 py-1.5">
						<span class="badge badge-priority-{issue.priority}">{priorityLabels[issue.priority]}</span>
					</td>
					<td class="px-2 py-1.5">
						<span class="badge badge-status-{issue.status}">{statusLabels[issue.status]}</span>
					</td>
					<td class="px-2 py-1.5 text-ghost-dim">{formatDate(issue.updatedAt)}</td>
				</tr>
			{:else}
				<tr>
					<td colspan="7" class="px-2 py-8 text-center text-ghost-dim">
						No issues found
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
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

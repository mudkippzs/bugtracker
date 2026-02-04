<script lang="ts">
	import { filteredIssues } from '$lib/stores/issues';
	import { goto } from '$app/navigation';
	import { Bug, Lightbulb, Wrench, Trash2, ClipboardList, Layers, ArrowUpDown } from 'lucide-svelte';
	import type { Issue } from '$lib/db/schema';

	interface Props {
		projectId?: number;
	}

	let { projectId }: Props = $props();

	const typeIcons = {
		bug: Bug,
		feature: Lightbulb,
		refactor: Wrench,
		cleanup: Trash2,
		task: ClipboardList,
		epic: Layers
	};

	const statusLabels: Record<string, string> = {
		backlog: 'Backlog',
		todo: 'To Do',
		in_progress: 'In Progress',
		review: 'Review',
		done: 'Done',
		closed: 'Closed'
	};

	const priorityLabels: Record<string, string> = {
		critical: 'Critical',
		high: 'High',
		medium: 'Medium',
		low: 'Low'
	};

	type SortField = 'id' | 'title' | 'priority' | 'status' | 'updatedAt';
	let sortField = $state<SortField>('updatedAt');
	let sortDir = $state<'asc' | 'desc'>('desc');

	const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
	const statusOrder = { backlog: 0, todo: 1, in_progress: 2, review: 3, done: 4, closed: 5 };

	let sortedIssues = $derived(() => {
		const issues = [...$filteredIssues];
		issues.sort((a, b) => {
			let cmp = 0;
			switch (sortField) {
				case 'id':
					cmp = a.id - b.id;
					break;
				case 'title':
					cmp = a.title.localeCompare(b.title);
					break;
				case 'priority':
					cmp = priorityOrder[a.priority] - priorityOrder[b.priority];
					break;
				case 'status':
					cmp = statusOrder[a.status] - statusOrder[b.status];
					break;
				case 'updatedAt':
					cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
					break;
			}
			return sortDir === 'asc' ? cmp : -cmp;
		});
		return issues;
	});

	function toggleSort(field: SortField) {
		if (sortField === field) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortField = field;
			sortDir = 'desc';
		}
	}

	function handleRowClick(issue: Issue) {
		goto(`/projects/${issue.projectId}/issues/${issue.id}`);
	}

	function formatDate(dateStr: string) {
		const date = new Date(dateStr);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		
		if (days === 0) return 'Today';
		if (days === 1) return 'Yesterday';
		if (days < 7) return `${days} days ago`;
		return date.toLocaleDateString();
	}
</script>

<div class="bg-surface-900 rounded-xl border border-surface-700 overflow-hidden">
	<table class="w-full">
		<thead class="bg-surface-800 border-b border-surface-700">
			<tr>
				<th class="px-4 py-3 text-left">
					<button class="flex items-center gap-1 text-sm font-medium text-surface-300 hover:text-surface-100" onclick={() => toggleSort('id')}>
						ID
						{#if sortField === 'id'}<ArrowUpDown size={14} />{/if}
					</button>
				</th>
				<th class="px-4 py-3 text-left">
					<button class="flex items-center gap-1 text-sm font-medium text-surface-300 hover:text-surface-100" onclick={() => toggleSort('title')}>
						Title
						{#if sortField === 'title'}<ArrowUpDown size={14} />{/if}
					</button>
				</th>
				<th class="px-4 py-3 text-left">Type</th>
				<th class="px-4 py-3 text-left">
					<button class="flex items-center gap-1 text-sm font-medium text-surface-300 hover:text-surface-100" onclick={() => toggleSort('priority')}>
						Priority
						{#if sortField === 'priority'}<ArrowUpDown size={14} />{/if}
					</button>
				</th>
				<th class="px-4 py-3 text-left">
					<button class="flex items-center gap-1 text-sm font-medium text-surface-300 hover:text-surface-100" onclick={() => toggleSort('status')}>
						Status
						{#if sortField === 'status'}<ArrowUpDown size={14} />{/if}
					</button>
				</th>
				<th class="px-4 py-3 text-left">Assignee</th>
				<th class="px-4 py-3 text-left">
					<button class="flex items-center gap-1 text-sm font-medium text-surface-300 hover:text-surface-100" onclick={() => toggleSort('updatedAt')}>
						Updated
						{#if sortField === 'updatedAt'}<ArrowUpDown size={14} />{/if}
					</button>
				</th>
			</tr>
		</thead>
		<tbody class="divide-y divide-surface-800">
			{#each sortedIssues() as issue (issue.id)}
				{@const TypeIcon = typeIcons[issue.type] || Bug}
				<tr 
					class="hover:bg-surface-800/50 cursor-pointer transition-colors"
					onclick={() => handleRowClick(issue)}
				>
					<td class="px-4 py-3 text-sm text-surface-400">#{issue.id}</td>
					<td class="px-4 py-3">
						<span class="text-surface-100 font-medium">{issue.title}</span>
					</td>
					<td class="px-4 py-3">
						<span class="flex items-center gap-1.5 text-surface-400">
							<TypeIcon size={14} />
							<span class="text-sm capitalize">{issue.type}</span>
						</span>
					</td>
					<td class="px-4 py-3">
						<span class="badge badge-priority-{issue.priority}">{priorityLabels[issue.priority]}</span>
					</td>
					<td class="px-4 py-3">
						<span class="badge badge-status-{issue.status}">{statusLabels[issue.status]}</span>
					</td>
					<td class="px-4 py-3 text-sm text-surface-400">
						{issue.assignee || '—'}
					</td>
					<td class="px-4 py-3 text-sm text-surface-500">
						{formatDate(issue.updatedAt)}
					</td>
				</tr>
			{:else}
				<tr>
					<td colspan="7" class="px-4 py-12 text-center text-surface-500">
						No issues found
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

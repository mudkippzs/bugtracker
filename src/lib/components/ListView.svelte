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
		
		if (days === 0) return 'today';
		if (days === 1) return '1d';
		if (days < 7) return `${days}d`;
		return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
	}
</script>

<div class="bg-void-100 border border-void-50 overflow-hidden">
	<table class="w-full text-xs">
		<thead class="bg-void-200 border-b border-void-50">
			<tr>
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
			{#each sortedIssues() as issue (issue.id)}
				{@const TypeIcon = typeIcons[issue.type] || Bug}
				<tr 
					class="hover:bg-void-50 cursor-pointer transition-colors"
					onclick={() => handleRowClick(issue)}
				>
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
					<td colspan="6" class="px-2 py-8 text-center text-ghost-dim">
						No issues found
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

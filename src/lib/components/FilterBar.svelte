<script lang="ts">
	import { filters, viewMode, type ViewMode } from '$lib/stores/issues';
	import { issueTypes, priorities, statuses } from '$lib/db/schema';
	import { Search, LayoutList, Columns3, X, Filter } from 'lucide-svelte';

	interface Props {
		showViewToggle?: boolean;
	}

	let { showViewToggle = true }: Props = $props();

	const typeLabels: Record<string, string> = {
		bug: 'Bug',
		feature: 'Feature',
		refactor: 'Refactor',
		cleanup: 'Cleanup',
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

	function setViewMode(mode: ViewMode) {
		viewMode.set(mode);
	}

	function clearFilters() {
		filters.set({
			type: null,
			priority: null,
			status: null,
			search: ''
		});
	}

	let hasFilters = $derived(
		$filters.type || $filters.priority || $filters.status || $filters.search
	);
</script>

<div class="flex flex-wrap items-center gap-3">
	<!-- Search -->
	<div class="relative flex-1 min-w-[200px] max-w-md">
		<Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
		<input
			type="text"
			class="input pl-10 py-2"
			placeholder="Search issues..."
			bind:value={$filters.search}
		/>
	</div>

	<!-- Filters -->
	<div class="flex items-center gap-2">
		<Filter size={16} class="text-surface-500" />
		
		<select 
			class="input py-2 w-auto min-w-[100px]"
			bind:value={$filters.type}
		>
			<option value={null}>All Types</option>
			{#each issueTypes as t}
				<option value={t}>{typeLabels[t]}</option>
			{/each}
		</select>

		<select 
			class="input py-2 w-auto min-w-[100px]"
			bind:value={$filters.priority}
		>
			<option value={null}>All Priorities</option>
			{#each priorities as p}
				<option value={p}>{priorityLabels[p]}</option>
			{/each}
		</select>

		<select 
			class="input py-2 w-auto min-w-[100px]"
			bind:value={$filters.status}
		>
			<option value={null}>All Statuses</option>
			{#each statuses as s}
				<option value={s}>{statusLabels[s]}</option>
			{/each}
		</select>

		{#if hasFilters}
			<button class="btn-ghost p-2 rounded-lg text-surface-400 hover:text-surface-100" onclick={clearFilters} title="Clear filters">
				<X size={16} />
			</button>
		{/if}
	</div>

	<!-- View Toggle -->
	{#if showViewToggle}
		<div class="flex items-center bg-surface-800 rounded-lg p-1 border border-surface-700 ml-auto">
			<button 
				class="p-2 rounded-md transition-colors"
				class:bg-surface-700={$viewMode === 'list'}
				class:text-surface-100={$viewMode === 'list'}
				class:text-surface-400={$viewMode !== 'list'}
				onclick={() => setViewMode('list')}
				title="List view"
			>
				<LayoutList size={18} />
			</button>
			<button 
				class="p-2 rounded-md transition-colors"
				class:bg-surface-700={$viewMode === 'kanban'}
				class:text-surface-100={$viewMode === 'kanban'}
				class:text-surface-400={$viewMode !== 'kanban'}
				onclick={() => setViewMode('kanban')}
				title="Kanban view"
			>
				<Columns3 size={18} />
			</button>
		</div>
	{/if}
</div>

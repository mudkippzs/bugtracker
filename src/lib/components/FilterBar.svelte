<script lang="ts">
	import { filters, viewMode, type ViewMode } from '$lib/stores/issues';
	import { issueTypes, priorities, statuses } from '$lib/db/schema';
	import { Search, LayoutList, Columns3, X, Filter } from 'lucide-svelte';

	interface Props {
		showViewToggle?: boolean;
	}

	let { showViewToggle = true }: Props = $props();

	const typeLabels: Record<string, string> = {
		bug: 'BUG',
		feature: 'FEAT',
		refactor: 'REF',
		cleanup: 'CLN',
		task: 'TSK',
		epic: 'EPC'
	};

	const priorityLabels: Record<string, string> = {
		critical: 'CRIT',
		high: 'HIGH',
		medium: 'MED',
		low: 'LOW'
	};

	const statusLabels: Record<string, string> = {
		backlog: 'BACKLOG',
		todo: 'TODO',
		in_progress: 'IN_PROG',
		review: 'REVIEW',
		done: 'DONE',
		closed: 'CLOSED'
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

<div class="flex flex-wrap items-center gap-2">
	<!-- Search -->
	<div class="relative flex-1 min-w-[150px] max-w-xs">
		<Search size={12} class="absolute left-2 top-1/2 -translate-y-1/2 text-ghost-dim" />
		<input
			type="text"
			class="input-sm pl-7 w-full"
			placeholder="Search..."
			bind:value={$filters.search}
		/>
	</div>

	<!-- Filters -->
	<div class="flex items-center gap-1.5">
		<Filter size={12} class="text-ghost-dim" />
		
		<select class="input-sm w-auto pr-6" bind:value={$filters.type}>
			<option value={null}>TYPE</option>
			{#each issueTypes as t}
				<option value={t}>{typeLabels[t]}</option>
			{/each}
		</select>

		<select class="input-sm w-auto pr-6" bind:value={$filters.priority}>
			<option value={null}>PRI</option>
			{#each priorities as p}
				<option value={p}>{priorityLabels[p]}</option>
			{/each}
		</select>

		<select class="input-sm w-auto pr-6" bind:value={$filters.status}>
			<option value={null}>STATUS</option>
			{#each statuses as s}
				<option value={s}>{statusLabels[s]}</option>
			{/each}
		</select>

		{#if hasFilters}
			<button class="btn btn-ghost p-1" onclick={clearFilters} title="Clear">
				<X size={12} />
			</button>
		{/if}
	</div>

	<!-- View Toggle -->
	{#if showViewToggle}
		<div class="flex items-center bg-void-200 border border-void-50 ml-auto">
			<button 
				class="p-1.5 transition-colors {$viewMode === 'list' ? 'bg-cyber-muted text-cyber' : 'text-ghost-dim'}"
				onclick={() => setViewMode('list')}
				title="List"
			>
				<LayoutList size={14} />
			</button>
			<button 
				class="p-1.5 transition-colors {$viewMode === 'kanban' ? 'bg-cyber-muted text-cyber' : 'text-ghost-dim'}"
				onclick={() => setViewMode('kanban')}
				title="Board"
			>
				<Columns3 size={14} />
			</button>
		</div>
	{/if}
</div>

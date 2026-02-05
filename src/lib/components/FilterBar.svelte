<script lang="ts">
	import { filters, viewMode, sortConfig, type ViewMode, type SortField } from '$lib/stores/issues';
	import { savedFilters, type SavedFilter } from '$lib/stores/savedFilters';
	import { users } from '$lib/stores/users';
	import { issueTypes, priorities, statuses } from '$lib/db/schema';
	import { Search, LayoutList, Columns3, X, Filter, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, Tag, Bookmark, ChevronDown, Trash2, Save, User } from 'lucide-svelte';

	interface Props {
		showViewToggle?: boolean;
	}

	let { showViewToggle = true }: Props = $props();
	
	let showSaveDialog = $state(false);
	let showSavedList = $state(false);
	let newFilterName = $state('');
	let containerRef = $state<HTMLDivElement | null>(null);

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

	const sortFieldLabels: Record<SortField, string> = {
		updatedAt: 'UPDATED',
		createdAt: 'CREATED',
		priority: 'PRIORITY',
		title: 'TITLE',
		id: 'ID'
	};

	const sortFields: SortField[] = ['updatedAt', 'createdAt', 'priority', 'title', 'id'];

	function setViewMode(mode: ViewMode) {
		viewMode.set(mode);
	}

	function handleSortFieldChange(e: Event) {
		const select = e.target as HTMLSelectElement;
		sortConfig.setField(select.value as SortField);
	}

	function toggleSortOrder() {
		sortConfig.setOrder($sortConfig.order === 'asc' ? 'desc' : 'asc');
	}

	function clearFilters() {
		filters.set({
			type: null,
			priority: null,
			status: null,
			search: '',
			assignee: null,
			overdue: false,
			label: null
		});
	}

	let hasFilters = $derived(
		$filters.type || $filters.priority || $filters.status || $filters.search || $filters.assignee || $filters.overdue || $filters.label
	);

	function saveCurrentFilter() {
		if (!newFilterName.trim()) return;
		savedFilters.save(newFilterName.trim(), $filters);
		newFilterName = '';
		showSaveDialog = false;
	}

	function loadFilter(filter: SavedFilter) {
		filters.set({ ...filter.filters });
		showSavedList = false;
	}

	function deleteFilter(e: Event, id: string) {
		e.stopPropagation();
		savedFilters.delete(id);
	}

	function handleClickOutside(event: MouseEvent) {
		if (containerRef && !containerRef.contains(event.target as Node)) {
			showSavedList = false;
			showSaveDialog = false;
		}
	}

	$effect(() => {
		if (showSavedList || showSaveDialog) {
			window.addEventListener('click', handleClickOutside);
		} else {
			window.removeEventListener('click', handleClickOutside);
		}
		return () => window.removeEventListener('click', handleClickOutside);
	});
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

		<select class="input-sm w-auto pr-6" bind:value={$filters.assignee}>
			<option value={null}>ASSIGNEE</option>
			{#each $users as user}
				<option value={user.id}>{user.name}</option>
			{/each}
		</select>

		<button 
			class="btn btn-ghost p-1.5 flex items-center gap-1 text-2xs
				{$filters.overdue ? 'bg-blood/20 text-blood border-blood/30' : 'text-ghost-dim'}"
			onclick={() => filters.update(f => ({ ...f, overdue: !f.overdue }))}
			title="Show overdue issues only"
		>
			<AlertTriangle size={12} />
			<span class="hidden sm:inline">OVERDUE</span>
		</button>

		{#if hasFilters}
			<button class="btn btn-ghost p-1" onclick={clearFilters} title="Clear filters">
				<X size={12} />
			</button>
			<button 
				class="btn btn-ghost p-1 text-cyber" 
				onclick={(e) => { e.stopPropagation(); showSaveDialog = true; }}
				title="Save current filter"
			>
				<Save size={12} />
			</button>
		{/if}

		<!-- Saved Filters Dropdown -->
		<div bind:this={containerRef} class="relative">
			<button 
				class="btn btn-ghost p-1.5 flex items-center gap-1 text-2xs text-ghost-dim"
				onclick={(e) => { e.stopPropagation(); showSavedList = !showSavedList; }}
				title="Load saved filter"
			>
				<Bookmark size={12} />
				<ChevronDown size={10} />
			</button>

			{#if showSavedList}
				<div class="absolute top-full left-0 mt-1 bg-void-100 border border-void-50 z-20 min-w-[180px] shadow-lg">
					<div class="panel-header text-2xs">
						<span>SAVED FILTERS</span>
					</div>
					{#if $savedFilters.length === 0}
						<p class="p-2 text-2xs text-ghost-dim">No saved filters</p>
					{:else}
						{#each $savedFilters as filter}
							<button 
								class="w-full flex items-center justify-between px-2 py-1.5 text-xs text-ghost hover:bg-void-50 group"
								onclick={() => loadFilter(filter)}
							>
								<span class="truncate">{filter.name}</span>
								<button 
									class="p-0.5 text-ghost-dim hover:text-blood opacity-0 group-hover:opacity-100"
									onclick={(e) => deleteFilter(e, filter.id)}
									title="Delete"
								>
									<Trash2 size={10} />
								</button>
							</button>
						{/each}
					{/if}
				</div>
			{/if}

			{#if showSaveDialog}
				<div class="absolute top-full left-0 mt-1 bg-void-100 border border-void-50 z-20 p-2 shadow-lg" onclick={(e) => e.stopPropagation()}>
					<label class="label text-2xs mb-1">Filter Name</label>
					<div class="flex gap-1">
						<input 
							type="text" 
							class="input-sm flex-1" 
							placeholder="My filter..."
							bind:value={newFilterName}
							onkeydown={(e) => e.key === 'Enter' && saveCurrentFilter()}
						/>
						<button 
							class="btn btn-primary text-2xs"
							onclick={saveCurrentFilter}
							disabled={!newFilterName.trim()}
						>
							SAVE
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Sort Controls -->
	<div class="flex items-center gap-1">
		<ArrowUpDown size={12} class="text-ghost-dim" />
		
		<select 
			class="input-sm w-auto pr-6" 
			value={$sortConfig.field}
			onchange={handleSortFieldChange}
		>
			{#each sortFields as field}
				<option value={field}>{sortFieldLabels[field]}</option>
			{/each}
		</select>

		<button 
			class="btn btn-ghost p-1" 
			onclick={toggleSortOrder}
			title={$sortConfig.order === 'asc' ? 'Ascending (click to change)' : 'Descending (click to change)'}
		>
			{#if $sortConfig.order === 'asc'}
				<ArrowUp size={12} />
			{:else}
				<ArrowDown size={12} />
			{/if}
		</button>
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

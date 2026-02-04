<script lang="ts">
	import { X, Trash2, Archive, PlayCircle, CheckCircle, ArrowRight, MoveRight } from 'lucide-svelte';
	import { selectedIssues, selectedIssueCount, hasIssueSelection } from '$lib/stores/selection';
	import { projects, fetchProjects } from '$lib/stores/issues';
	import { onMount } from 'svelte';

	interface Props {
		onBulkStatusChange?: (status: string) => void;
		onBulkDelete?: () => void;
		onBulkMove?: (projectId: number) => void;
	}

	let { onBulkStatusChange, onBulkDelete, onBulkMove }: Props = $props();
	
	let showStatusMenu = $state(false);
	let showMoveMenu = $state(false);

	const statuses = [
		{ id: 'backlog', label: 'Backlog' },
		{ id: 'todo', label: 'Todo' },
		{ id: 'in_progress', label: 'In Progress' },
		{ id: 'review', label: 'Review' },
		{ id: 'done', label: 'Done' },
		{ id: 'closed', label: 'Closed' }
	];

	onMount(() => {
		fetchProjects();
	});

	function closeMenus() {
		showStatusMenu = false;
		showMoveMenu = false;
	}
</script>

<svelte:window onclick={closeMenus} />

{#if $hasIssueSelection}
	<div class="mb-3 p-2 bg-cyber-muted border border-cyber-dim flex items-center gap-2 animate-slide-up flex-wrap">
		<span class="text-xs text-cyber font-medium">{$selectedIssueCount} selected</span>
		
		<div class="h-4 w-px bg-cyber-dim/50"></div>
		
		<!-- Status change dropdown -->
		<div class="relative">
			<button 
				class="btn btn-ghost text-xs text-ghost-dim hover:text-ghost flex items-center gap-1"
				onclick={(e) => { e.stopPropagation(); showStatusMenu = !showStatusMenu; showMoveMenu = false; }}
			>
				<ArrowRight size={12} />
				STATUS
			</button>
			{#if showStatusMenu}
				<div class="absolute top-full left-0 mt-1 bg-void-100 border border-void-50 shadow-lg z-50 min-w-[120px]" onclick={(e) => e.stopPropagation()}>
					{#each statuses as status}
						<button 
							class="w-full px-3 py-1.5 text-left text-xs text-ghost hover:bg-void-50"
							onclick={() => { onBulkStatusChange?.(status.id); closeMenus(); }}
						>
							{status.label}
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Move to project dropdown -->
		{#if onBulkMove}
			<div class="relative">
				<button 
					class="btn btn-ghost text-xs text-ghost-dim hover:text-ghost flex items-center gap-1"
					onclick={(e) => { e.stopPropagation(); showMoveMenu = !showMoveMenu; showStatusMenu = false; }}
				>
					<MoveRight size={12} />
					MOVE
				</button>
				{#if showMoveMenu}
					<div class="absolute top-full left-0 mt-1 bg-void-100 border border-void-50 shadow-lg z-50 min-w-[160px] max-h-60 overflow-y-auto" onclick={(e) => e.stopPropagation()}>
						{#each $projects as project}
							<button 
								class="w-full px-3 py-1.5 text-left text-xs text-ghost hover:bg-void-50 flex items-center gap-2"
								onclick={() => { onBulkMove?.(project.id); closeMenus(); }}
							>
								<div class="w-2 h-2 flex-shrink-0" style="background-color: {project.color}"></div>
								<span class="truncate">{project.name}</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		<div class="flex-1"></div>
		
		<!-- Delete -->
		{#if onBulkDelete}
			<button 
				class="btn btn-ghost text-xs text-ghost-dim hover:text-priority-critical flex items-center gap-1"
				onclick={onBulkDelete}
			>
				<Trash2 size={12} />
				DELETE
			</button>
		{/if}
		
		<!-- Clear selection -->
		<button 
			class="btn btn-ghost text-xs text-ghost-dim hover:text-ghost flex items-center gap-1"
			onclick={() => selectedIssues.clear()}
		>
			<X size={12} />
			CLEAR
		</button>
	</div>
{/if}

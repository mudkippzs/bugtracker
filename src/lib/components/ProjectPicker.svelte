<script lang="ts">
	import { onMount } from 'svelte';
	import { FolderKanban, ChevronRight, Search, Check } from 'lucide-svelte';
	import type { Project } from '$lib/db/schema';

	interface Props {
		currentProjectId: number;
		currentProjectName: string;
		onSelect: (projectId: number) => void;
		oncancel: () => void;
	}

	let { currentProjectId, currentProjectName, onSelect, oncancel }: Props = $props();

	let projects = $state<Project[]>([]);
	let searchQuery = $state('');
	let loading = $state(true);
	let selectedIndex = $state(0);
	let inputElement: HTMLInputElement;

	const filteredProjects = $derived(
		projects.filter(p => 
			p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			p.path.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	onMount(async () => {
		const res = await fetch('/api/projects');
		if (res.ok) {
			projects = await res.json();
		}
		loading = false;
		// Focus input after mount
		setTimeout(() => inputElement?.focus(), 50);
	});

	function handleKeydown(e: KeyboardEvent) {
		switch (e.key) {
			case 'Escape':
				oncancel();
				break;
			case 'ArrowDown':
				e.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, filteredProjects.length - 1);
				break;
			case 'ArrowUp':
				e.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, 0);
				break;
			case 'Enter':
				e.preventDefault();
				if (filteredProjects[selectedIndex]) {
					handleSelect(filteredProjects[selectedIndex]);
				}
				break;
		}
	}

	function handleSelect(project: Project) {
		if (project.id !== currentProjectId) {
			onSelect(project.id);
		} else {
			oncancel();
		}
	}

	// Reset selection when search changes
	$effect(() => {
		if (searchQuery) {
			selectedIndex = 0;
		}
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<div 
	class="fixed inset-0 bg-void/80 backdrop-blur-sm z-50"
	onclick={oncancel}
	role="dialog"
	aria-modal="true"
>
	<div 
		class="absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-md bg-void-100 border border-cyber-dim shadow-glow-cyan-sm animate-slide-up"
		onclick={(e) => e.stopPropagation()}
	>
		<!-- Search Header -->
		<div class="p-3 border-b border-void-50 flex items-center gap-2">
			<Search size={14} class="text-ghost-dim" />
			<input
				bind:this={inputElement}
				type="text"
				class="flex-1 bg-transparent text-ghost-bright placeholder-ghost-dim text-sm focus:outline-none"
				placeholder="Search projects..."
				bind:value={searchQuery}
			/>
			<span class="text-2xs text-ghost-dim">ESC to close</span>
		</div>

		<!-- Current Location -->
		<div class="px-3 py-2 border-b border-void-50 bg-void-200">
			<span class="text-2xs text-ghost-dim uppercase tracking-wider">Moving from:</span>
			<div class="flex items-center gap-2 mt-1">
				<FolderKanban size={14} class="text-cyber" />
				<span class="text-sm text-ghost-bright">{currentProjectName}</span>
			</div>
		</div>

		<!-- Project List -->
		<div class="max-h-64 overflow-y-auto">
			{#if loading}
				<div class="p-4 text-center text-ghost-dim text-xs">
					<span class="animate-pulse">Loading projects...</span>
				</div>
			{:else if filteredProjects.length === 0}
				<div class="p-4 text-center text-ghost-dim text-xs">
					No projects found
				</div>
			{:else}
				{#each filteredProjects as project, index (project.id)}
					{@const isSelected = index === selectedIndex}
					{@const isCurrent = project.id === currentProjectId}
					<button
						class="w-full px-3 py-2 text-left flex items-center gap-3 transition-colors {isSelected ? 'bg-cyber-muted' : 'hover:bg-void-50'}"
						onclick={() => handleSelect(project)}
						onmouseenter={() => selectedIndex = index}
					>
						<div 
							class="w-3 h-3 flex-shrink-0"
							style="background-color: {project.color}"
						></div>
						<div class="flex-1 min-w-0">
							<p class="text-sm {isCurrent ? 'text-ghost-dim' : 'text-ghost-bright'} truncate">
								{project.name}
							</p>
							<p class="text-2xs text-ghost-dim truncate">{project.path}</p>
						</div>
						{#if isCurrent}
							<Check size={14} class="text-cyber flex-shrink-0" />
						{/if}
					</button>
				{/each}
			{/if}
		</div>

		<!-- Footer hint -->
		<div class="px-3 py-2 border-t border-void-50 flex items-center gap-4 text-2xs text-ghost-dim">
			<span><kbd class="px-1 bg-void-200 border border-void-50">↑↓</kbd> navigate</span>
			<span><kbd class="px-1 bg-void-200 border border-void-50">Enter</kbd> select</span>
			<span><kbd class="px-1 bg-void-200 border border-void-50">Esc</kbd> cancel</span>
		</div>
	</div>
</div>

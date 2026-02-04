<script lang="ts">
	import type { Project } from '$lib/db/schema';
	import { Folder, Bug, ChevronRight } from 'lucide-svelte';
	import { goto } from '$app/navigation';

	interface Props {
		project: Project & { issueCount?: number };
	}

	let { project }: Props = $props();

	function handleClick() {
		goto(`/projects/${project.id}`);
	}
</script>

<button
	class="card-hover text-left group w-full"
	onclick={handleClick}
>
	<div class="flex items-start gap-4">
		<div 
			class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
			style="background-color: {project.color}20; color: {project.color}"
		>
			<Folder size={24} />
		</div>
		
		<div class="flex-1 min-w-0">
			<div class="flex items-center gap-2">
				<h3 class="font-semibold text-surface-100 truncate">{project.name}</h3>
				<ChevronRight size={16} class="text-surface-500 opacity-0 group-hover:opacity-100 transition-opacity" />
			</div>
			
			<p class="text-sm text-surface-500 truncate mt-0.5 font-mono">
				{project.path}
			</p>
			
			{#if project.description}
				<p class="text-sm text-surface-400 mt-2 line-clamp-2">
					{project.description}
				</p>
			{/if}
			
			<div class="flex items-center gap-4 mt-3 text-sm">
				<span class="flex items-center gap-1.5 text-surface-400">
					<Bug size={14} />
					<span>{project.issueCount ?? 0} issues</span>
				</span>
			</div>
		</div>
	</div>
</button>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>

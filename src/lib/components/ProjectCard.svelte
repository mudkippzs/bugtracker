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
	<div class="flex items-start gap-2">
		<div 
			class="w-1 h-full min-h-[40px] flex-shrink-0"
			style="background-color: {project.color}"
		></div>
		
		<div class="flex-1 min-w-0">
			<div class="flex items-center gap-2">
				<h3 class="text-sm text-ghost-bright truncate">{project.name}</h3>
				<ChevronRight size={12} class="text-ghost-dim opacity-0 group-hover:opacity-100 transition-opacity" />
			</div>
			
			<p class="text-2xs text-ghost-dim truncate mt-0.5 font-mono">
				{project.path}
			</p>
			
			{#if project.description}
				<p class="text-2xs text-ghost mt-1.5 line-clamp-2">
					{project.description}
				</p>
			{/if}
			
			<div class="flex items-center gap-2 mt-2 text-2xs">
				<span class="flex items-center gap-1 text-ghost-dim">
					<Bug size={10} />
					<span>{project.issueCount ?? 0}</span>
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

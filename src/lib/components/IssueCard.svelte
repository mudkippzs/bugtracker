<script lang="ts">
	import type { Issue } from '$lib/db/schema';
	import { Bug, Lightbulb, Wrench, Trash2, ClipboardList, Layers, GripVertical } from 'lucide-svelte';

	interface Props {
		issue: Issue;
		compact?: boolean;
		draggable?: boolean;
		onclick?: () => void;
	}

	let { issue, compact = false, draggable = false, onclick }: Props = $props();

	const typeIcons = {
		bug: Bug,
		feature: Lightbulb,
		refactor: Wrench,
		cleanup: Trash2,
		task: ClipboardList,
		epic: Layers
	};

	const typeLabels = {
		bug: 'Bug',
		feature: 'Feature',
		refactor: 'Refactor',
		cleanup: 'Cleanup',
		task: 'Task',
		epic: 'Epic'
	};

	const priorityLabels = {
		critical: 'Critical',
		high: 'High',
		medium: 'Medium',
		low: 'Low'
	};

	const TypeIcon = typeIcons[issue.type] || Bug;
</script>

<button
	class="card-hover w-full text-left group animate-fade-in"
	class:p-3={compact}
	class:p-4={!compact}
	onclick={onclick}
	{draggable}
>
	<div class="flex items-start gap-3">
		{#if draggable}
			<div class="opacity-0 group-hover:opacity-50 transition-opacity cursor-grab text-surface-500 mt-0.5">
				<GripVertical size={16} />
			</div>
		{/if}
		
		<div class="flex-1 min-w-0">
			<div class="flex items-center gap-2 mb-1.5">
				<span class="text-surface-400">
					<svelte:component this={TypeIcon} size={14} />
				</span>
				<span class="text-xs text-surface-500 font-medium">#{issue.id}</span>
				<span class="badge badge-type text-xs">{typeLabels[issue.type]}</span>
			</div>
			
			<h3 class="font-medium text-surface-100 truncate" class:text-sm={compact}>
				{issue.title}
			</h3>
			
			{#if !compact && issue.description}
				<p class="text-sm text-surface-400 mt-1 line-clamp-2">
					{issue.description.replace(/[#*`]/g, '').slice(0, 100)}
				</p>
			{/if}
			
			<div class="flex items-center gap-2 mt-2">
				<span class="badge badge-priority-{issue.priority}">{priorityLabels[issue.priority]}</span>
				
				{#if issue.assignee}
					<span class="text-xs text-surface-400 flex items-center gap-1">
						<span class="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-medium">
							{issue.assignee.charAt(0).toUpperCase()}
						</span>
						{issue.assignee}
					</span>
				{/if}
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

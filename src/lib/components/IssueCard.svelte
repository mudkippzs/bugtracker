<script lang="ts">
	import type { Issue } from '$lib/db/schema';
	import { Bug, Lightbulb, Wrench, Trash2, ClipboardList, Layers, GripVertical, MessageSquare, Check } from 'lucide-svelte';
	import { settings } from '$lib/stores/settings';
	import { selectedIssues } from '$lib/stores/selection';

	interface IssueWithMeta extends Issue {
		commentCount?: number;
		latestCommentAt?: string | null;
	}

	interface Props {
		issue: IssueWithMeta;
		compact?: boolean;
		draggable?: boolean;
		selectable?: boolean;
		onclick?: () => void;
		oncontextmenu?: (e: MouseEvent) => void;
	}

	let { issue, compact = false, draggable = false, selectable = false, onclick, oncontextmenu }: Props = $props();

	// Check if selected
	const isSelected = $derived($selectedIssues.has(issue.id));

	// Check if issue has unread comments
	const hasUnread = $derived(
		issue.latestCommentAt 
			? settings.hasUnread(issue.id, issue.latestCommentAt) 
			: false
	);

	const typeIcons = {
		bug: Bug,
		feature: Lightbulb,
		refactor: Wrench,
		cleanup: Trash2,
		task: ClipboardList,
		epic: Layers
	};

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

	const TypeIcon = typeIcons[issue.type] || Bug;
</script>

<button
	class="w-full text-left group p-2 animate-fade-in transition-all border select-none
		status-tint-{issue.status}
		{isSelected 
			? 'border-cyber-dim bg-cyber-muted ring-1 ring-cyber-dim/50' 
			: 'border-transparent hover:border-void-50 hover:bg-void-50/50'}"
	onclick={onclick}
	oncontextmenu={oncontextmenu}
	{draggable}
>
	<div class="flex items-start gap-2">
		{#if selectable}
			<!-- Selection checkbox -->
			<div 
				class="w-4 h-4 border flex items-center justify-center transition-colors flex-shrink-0 mt-0.5
					{isSelected ? 'bg-cyber border-cyber' : 'border-ghost-dim/30 group-hover:border-ghost-dim'}"
			>
				{#if isSelected}
					<Check size={10} class="text-void" />
				{/if}
			</div>
		{:else if draggable}
			<div class="opacity-0 group-hover:opacity-50 transition-opacity cursor-grab text-ghost-dim">
				<GripVertical size={12} />
			</div>
		{/if}
		
		<div class="flex-1 min-w-0">
			<!-- Header row -->
			<div class="flex items-center gap-1.5 mb-1">
				<span class="text-ghost-dim">
					<svelte:component this={TypeIcon} size={10} />
				</span>
				<span class="text-2xs text-ghost-dim">#{issue.id}</span>
				<span class="badge badge-type text-2xs">{typeLabels[issue.type]}</span>
				<span class="badge badge-priority-{issue.priority} text-2xs">{priorityLabels[issue.priority]}</span>
				{#if hasUnread}
					<span class="badge-new text-2xs animate-pulse">NEW</span>
				{/if}
			</div>
			
			<!-- Title -->
			<h3 class="text-sm text-ghost-bright truncate leading-tight">
				{issue.title}
			</h3>
			
			<!-- Meta row -->
			{#if !compact && (issue.assignee || issue.commentCount)}
				<div class="flex items-center gap-2 mt-1.5 text-2xs text-ghost-dim">
					{#if issue.assignee}
						<span class="flex items-center gap-1">
							<span class="w-3 h-3 bg-cyber/20 border border-cyber/30 flex items-center justify-center text-cyber text-2xs">
								{issue.assignee.charAt(0).toUpperCase()}
							</span>
							{issue.assignee}
						</span>
					{/if}
					{#if issue.commentCount && issue.commentCount > 0}
						<span class="flex items-center gap-0.5" class:text-cyber={hasUnread}>
							<MessageSquare size={10} />
							{issue.commentCount}
						</span>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</button>

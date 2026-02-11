<script lang="ts">
	import type { Issue } from '$lib/db/schema';
	import { Bug, Lightbulb, Wrench, Trash2, ClipboardList, Layers, GripVertical, MessageSquare, Check, Calendar, AlertTriangle, Eye } from 'lucide-svelte';
	import { settings } from '$lib/stores/settings';
	import { selectedIssues } from '$lib/stores/selection';
	import { watchlist } from '$lib/stores/watchlist';
	import LabelBadge from './LabelBadge.svelte';

	interface IssueWithMeta extends Issue {
		commentCount?: number;
		latestCommentAt?: string | null;
	}

	interface Props {
		issue: IssueWithMeta;
		compact?: boolean;
		draggable?: boolean;
		selectable?: boolean;
		focused?: boolean;
		onclick?: () => void;
		oncontextmenu?: (e: MouseEvent) => void;
	}

	let { issue, compact = false, draggable = false, selectable = false, focused = false, onclick, oncontextmenu }: Props = $props();

	// Check if selected
	const isSelected = $derived($selectedIssues.has(issue.id));

	// Check if issue has unread comments
	const hasUnread = $derived(
		issue.latestCommentAt 
			? settings.hasUnread(issue.id, issue.latestCommentAt) 
			: false
	);

	// Check if issue is overdue
	const isOverdue = $derived(() => {
		if (!issue.dueDate) return false;
		if (issue.status === 'done' || issue.status === 'closed') return false;
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const due = new Date(issue.dueDate);
		return due < today;
	});

	// Check if due date is approaching (within 3 days)
	const isDueSoon = $derived(() => {
		if (!issue.dueDate) return false;
		if (issue.status === 'done' || issue.status === 'closed') return false;
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const due = new Date(issue.dueDate);
		const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
		return diffDays >= 0 && diffDays <= 3;
	});

	// Format due date for display
	function formatDueDate(dateStr: string): string {
		const due = new Date(dateStr);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
		
		if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
		if (diffDays === 0) return 'Due today';
		if (diffDays === 1) return 'Due tomorrow';
		if (diffDays <= 7) return `Due in ${diffDays}d`;
		return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

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

	// Parse labels from JSON string
	function getLabels(): string[] {
		if (!issue.labels) return [];
		try {
			return JSON.parse(issue.labels);
		} catch {
			return [];
		}
	}
</script>

<button
	class="w-full text-left group p-2 animate-fade-in transition-all border select-none
		status-tint-{issue.status}
		{isSelected 
			? 'border-cyber-dim bg-cyber-muted ring-1 ring-cyber-dim/50' 
			: focused
				? 'border-cyber-dim/50 bg-void-50 ring-1 ring-cyber-dim/30'
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
				{#if $watchlist.has(issue.id)}
					<Eye size={10} class="text-cyber" />
				{/if}
			</div>
			
			<!-- Title -->
			<h3 class="text-sm text-ghost-bright truncate leading-tight">
				{issue.title}
			</h3>

			<!-- Labels -->
			{#if !compact && getLabels().length > 0}
				<div class="flex flex-wrap gap-1 mt-1">
					{#each getLabels().slice(0, 3) as label}
						<LabelBadge {label} />
					{/each}
					{#if getLabels().length > 3}
						<span class="text-2xs text-ghost-dim">+{getLabels().length - 3}</span>
					{/if}
				</div>
			{/if}
			
			<!-- Meta row -->
			{#if !compact && (issue.assignee || issue.commentCount || issue.dueDate)}
				<div class="flex items-center gap-2 mt-1.5 text-2xs text-ghost-dim">
					{#if issue.assignee}
						<span class="flex items-center gap-1">
							<span class="w-3 h-3 bg-cyber/20 border border-cyber/30 flex items-center justify-center text-cyber text-2xs">
								{issue.assignee.charAt(0).toUpperCase()}
							</span>
							{issue.assignee}
						</span>
					{/if}
					{#if issue.dueDate}
						<span 
							class="flex items-center gap-0.5 px-1 border
								{isOverdue() 
									? 'text-blood bg-blood/10 border-blood/30' 
									: isDueSoon() 
										? 'text-warn bg-warn/10 border-warn/30' 
										: 'border-transparent'}"
						>
							{#if isOverdue()}
								<AlertTriangle size={10} />
							{:else}
								<Calendar size={10} />
							{/if}
							{formatDueDate(issue.dueDate)}
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

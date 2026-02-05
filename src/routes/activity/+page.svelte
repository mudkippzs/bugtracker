<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Activity, MessageSquare, FileText, Edit2, Plus, Filter, RefreshCw } from 'lucide-svelte';
	import { projects } from '$lib/stores/issues';
	import RelativeTime from '$lib/components/RelativeTime.svelte';

	interface ActivityItem {
		id: string;
		type: 'issue_created' | 'issue_updated' | 'comment_added';
		issueId: number;
		issueTitle: string;
		projectId: number;
		projectName: string;
		actor: string;
		field?: string;
		oldValue?: string | null;
		newValue?: string | null;
		content?: string;
		timestamp: string;
	}

	let activities = $state<ActivityItem[]>([]);
	let loading = $state(true);
	let selectedProject = $state<number | null>(null);
	let selectedType = $state<string | null>(null);

	async function fetchActivity() {
		loading = true;
		try {
			let url = '/api/activity?limit=100';
			if (selectedProject) {
				url += `&projectId=${selectedProject}`;
			}
			const res = await fetch(url);
			if (res.ok) {
				activities = await res.json();
			}
		} catch (error) {
			console.error('Failed to fetch activity:', error);
		}
		loading = false;
	}

	onMount(() => {
		fetchActivity();
	});

	$effect(() => {
		selectedProject;
		fetchActivity();
	});

	const filteredActivities = $derived(
		selectedType 
			? activities.filter(a => a.type === selectedType)
			: activities
	);

	function getActivityIcon(type: string) {
		switch (type) {
			case 'issue_created': return Plus;
			case 'issue_updated': return Edit2;
			case 'comment_added': return MessageSquare;
			default: return FileText;
		}
	}

	function getActivityColor(type: string) {
		switch (type) {
			case 'issue_created': return 'text-matrix';
			case 'issue_updated': return 'text-ember';
			case 'comment_added': return 'text-cyber';
			default: return 'text-ghost';
		}
	}

	function formatFieldChange(field: string, oldValue: string | null, newValue: string | null): string {
		if (field === 'created') return 'created this issue';
		if (field === 'status') return `changed status from ${oldValue} to ${newValue}`;
		if (field === 'priority') return `changed priority from ${oldValue} to ${newValue}`;
		if (field === 'assignee') {
			if (!oldValue) return `assigned to ${newValue}`;
			if (!newValue) return `unassigned from ${oldValue}`;
			return `reassigned from ${oldValue} to ${newValue}`;
		}
		return `updated ${field}`;
	}
</script>

<svelte:head>
	<title>Activity Feed | BugTracker</title>
</svelte:head>

<div class="p-4 max-w-4xl mx-auto">
	<!-- Header -->
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center gap-2">
			<Activity size={20} class="text-cyber" />
			<h1 class="text-xl text-ghost-bright font-display tracking-wide">ACTIVITY FEED</h1>
		</div>
		<button 
			class="btn btn-ghost"
			onclick={fetchActivity}
			disabled={loading}
		>
			<RefreshCw size={14} class={loading ? 'animate-spin' : ''} />
			REFRESH
		</button>
	</div>

	<!-- Filters -->
	<div class="flex items-center gap-2 mb-4">
		<Filter size={14} class="text-ghost-dim" />
		
		<select 
			class="input-sm w-auto"
			bind:value={selectedProject}
		>
			<option value={null}>All Projects</option>
			{#each $projects as project}
				<option value={project.id}>{project.name}</option>
			{/each}
		</select>

		<select 
			class="input-sm w-auto"
			bind:value={selectedType}
		>
			<option value={null}>All Types</option>
			<option value="issue_created">Created</option>
			<option value="issue_updated">Updated</option>
			<option value="comment_added">Comments</option>
		</select>

		<span class="text-2xs text-ghost-dim ml-2">
			{filteredActivities.length} activities
		</span>
	</div>

	<!-- Activity List -->
	{#if loading}
		<div class="text-center py-8 text-ghost-dim">
			<RefreshCw size={20} class="animate-spin mx-auto mb-2" />
			Loading activity...
		</div>
	{:else if filteredActivities.length === 0}
		<div class="text-center py-8 text-ghost-dim">
			<Activity size={24} class="mx-auto mb-2 opacity-50" />
			<p>No activity found</p>
		</div>
	{:else}
		<div class="space-y-1">
			{#each filteredActivities as activity (activity.id)}
				{@const Icon = getActivityIcon(activity.type)}
				<div class="card p-3 flex items-start gap-3 hover:bg-void-50 transition-colors">
					<div class={`p-1.5 bg-void-200 border border-void-50 ${getActivityColor(activity.type)}`}>
						<svelte:component this={Icon} size={12} />
					</div>
					
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 text-xs">
							<span class="text-ghost-bright font-medium">{activity.actor}</span>
							{#if activity.type === 'issue_created'}
								<span class="text-ghost-dim">created</span>
							{:else if activity.type === 'issue_updated'}
								<span class="text-ghost-dim">{formatFieldChange(activity.field || '', activity.oldValue, activity.newValue)}</span>
							{:else if activity.type === 'comment_added'}
								<span class="text-ghost-dim">commented on</span>
							{/if}
						</div>
						
						<button 
							class="text-sm text-cyber hover:underline truncate block text-left mt-0.5"
							onclick={() => goto(`/projects/${activity.projectId}/issues/${activity.issueId}`)}
						>
							#{activity.issueId} {activity.issueTitle}
						</button>

						{#if activity.type === 'comment_added' && activity.content}
							<p class="text-2xs text-ghost-dim mt-1 line-clamp-2 italic">
								"{activity.content}"
							</p>
						{/if}

						<div class="flex items-center gap-2 mt-1 text-2xs text-ghost-dim">
							<span class="text-ghost">{activity.projectName}</span>
							<span>•</span>
							<RelativeTime timestamp={activity.timestamp} />
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

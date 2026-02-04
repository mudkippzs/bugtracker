<script lang="ts">
	import { onMount } from 'svelte';
	import { Bug, FolderOpen, CheckCircle, AlertCircle, Activity, Clock, ChevronRight, Zap, TrendingUp } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import type { Issue } from '$lib/db/schema';
	import { projects, fetchProjects, realtimeEvents } from '$lib/stores/issues';

	interface Analytics {
		totalProjects: number;
		totalIssues: number;
		openIssues: number;
		closedIssues: number;
		issuesByType: Record<string, number>;
		issuesByPriority: Record<string, number>;
		issuesByStatus: Record<string, number>;
		recentActivity: Array<Issue & { type: string }>;
	}

	let analytics = $state<Analytics | null>(null);
	let loading = $state(true);

	onMount(async () => {
		const [analyticsRes] = await Promise.all([
			fetch('/api/analytics'),
			fetchProjects()
		]);

		if (analyticsRes.ok) analytics = await analyticsRes.json();
		loading = false;
	});

	// Subscribe to realtime events to refresh analytics when issues change
	$effect(() => {
		const events = $realtimeEvents;
		if (events.length > 0) {
			// Refresh analytics when there are new events
			const lastEvent = events[0];
			if (lastEvent.type.startsWith('issue_')) {
				refreshAnalytics();
			}
		}
	});

	async function refreshAnalytics() {
		const res = await fetch('/api/analytics');
		if (res.ok) analytics = await res.json();
	}

	const priorityLabels: Record<string, string> = {
		critical: 'CRIT',
		high: 'HIGH',
		medium: 'MED',
		low: 'LOW'
	};

	const typeLabels: Record<string, string> = {
		bug: 'BUG',
		feature: 'FEAT',
		refactor: 'REF',
		cleanup: 'CLN',
		task: 'TSK',
		epic: 'EPC'
	};

	const statusLabels: Record<string, string> = {
		backlog: 'BKLG',
		todo: 'TODO',
		in_progress: 'PROG',
		review: 'REV',
		done: 'DONE',
		closed: 'CLSD'
	};

	function formatTimeAgo(dateStr: string) {
		const date = new Date(dateStr);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const mins = Math.floor(diff / 60000);
		const hrs = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (mins < 1) return 'now';
		if (mins < 60) return `${mins}m`;
		if (hrs < 24) return `${hrs}h`;
		return `${days}d`;
	}
</script>

<svelte:head>
	<title>Dashboard // BugTracker</title>
</svelte:head>

<div class="p-6 h-full">
	<!-- Header -->
	<div class="mb-6">
		<div class="flex items-center gap-2 text-ghost-dim text-xs mb-1">
			<span>SYS://</span>
			<span class="text-cyber">DASHBOARD</span>
		</div>
		<h1 class="text-xl text-ghost-bright font-display tracking-wide">SYSTEM OVERVIEW</h1>
	</div>

	{#if loading}
		<div class="flex items-center gap-2 text-ghost-dim text-base py-12">
			<span class="animate-pulse">▋</span>
			<span>Loading data...</span>
		</div>
	{:else}
		<!-- Stats Grid -->
		<div class="grid grid-cols-5 gap-4 mb-6">
			<div class="card">
				<div class="text-xs text-ghost-dim uppercase tracking-wider mb-2">Projects</div>
				<div class="text-2xl font-display text-cyber">{analytics?.totalProjects ?? 0}</div>
			</div>
			<div class="card">
				<div class="text-xs text-ghost-dim uppercase tracking-wider mb-2">Total Issues</div>
				<div class="text-2xl font-display text-ghost-bright">{analytics?.totalIssues ?? 0}</div>
			</div>
			<div class="card">
				<div class="text-xs text-ghost-dim uppercase tracking-wider mb-2">Open</div>
				<div class="text-2xl font-display text-ember">{analytics?.openIssues ?? 0}</div>
			</div>
			<div class="card">
				<div class="text-xs text-ghost-dim uppercase tracking-wider mb-2">Closed</div>
				<div class="text-2xl font-display text-matrix">{analytics?.closedIssues ?? 0}</div>
			</div>
			<div class="card">
				<div class="text-xs text-ghost-dim uppercase tracking-wider mb-2">Resolution</div>
				<div class="text-2xl font-display text-cyber">
					{analytics?.totalIssues ? Math.round((analytics.closedIssues / analytics.totalIssues) * 100) : 0}%
				</div>
			</div>
		</div>

		<!-- Main Grid -->
		<div class="grid grid-cols-12 gap-4">
			<!-- Projects Panel -->
			<div class="col-span-5 card">
				<div class="panel-header">
					<FolderOpen size={14} />
					<span>PROJECTS</span>
					<a href="/projects" class="ml-auto text-cyber hover:text-cyber text-xs">VIEW ALL →</a>
				</div>
				
				{#if $projects.length === 0}
					<div class="text-center py-8 text-ghost-dim">
						<p class="mb-3">No projects initialized</p>
						<a href="/projects" class="btn btn-primary inline-flex">+ NEW PROJECT</a>
					</div>
				{:else}
					<div class="space-y-1">
						{#each $projects.slice(0, 8) as project}
							<button 
								class="w-full p-2.5 flex items-center gap-3 text-left hover:bg-void-50 transition-colors border border-transparent hover:border-void-50 group"
								onclick={() => goto(`/projects/${project.id}`)}
							>
								<div 
									class="w-1 h-8 flex-shrink-0"
									style="background-color: {project.color}"
								></div>
								<div class="flex-1 min-w-0">
									<div class="text-sm text-ghost-bright truncate">{project.name}</div>
									<div class="text-xs text-ghost-dim font-mono truncate">{project.path}</div>
								</div>
								<div class="text-sm text-ghost-dim tabular-nums">
									{project.issueCount ?? 0}
								</div>
								<ChevronRight size={14} class="text-ghost-dim opacity-0 group-hover:opacity-100" />
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Activity Panel -->
			<div class="col-span-4 card">
				<div class="panel-header">
					<Activity size={14} />
					<span>RECENT ACTIVITY</span>
				</div>
				
				{#if analytics?.recentActivity && analytics.recentActivity.length > 0}
					<div class="space-y-1">
						{#each analytics.recentActivity.slice(0, 10) as issue}
							<button 
								class="w-full text-left p-2 hover:bg-void-50 transition-colors border border-transparent hover:border-void-50"
								onclick={() => goto(`/projects/${issue.projectId}/issues/${issue.id}`)}
							>
								<div class="flex items-center gap-2">
									<span class="badge badge-priority-{issue.priority}">
										{priorityLabels[issue.priority]}
									</span>
									<span class="text-sm text-ghost truncate flex-1">{issue.title}</span>
									<span class="text-xs text-ghost-dim tabular-nums">{formatTimeAgo(issue.createdAt)}</span>
								</div>
							</button>
						{/each}
					</div>
				{:else}
					<p class="text-ghost-dim text-sm py-8 text-center">No recent activity</p>
				{/if}
			</div>

			<!-- Status Breakdown -->
			<div class="col-span-3 card">
				<div class="panel-header">
					<TrendingUp size={14} />
					<span>BY STATUS</span>
				</div>
				
				{#if analytics?.issuesByStatus}
					<div class="space-y-2">
						{#each ['backlog', 'todo', 'in_progress', 'review', 'done', 'closed'] as status}
							{@const count = analytics.issuesByStatus[status] || 0}
							{@const total = analytics.totalIssues || 1}
							{@const pct = Math.round((count / total) * 100)}
							<div class="flex items-center gap-3">
								<span class="text-xs text-ghost-dim w-12">{statusLabels[status]}</span>
								<div class="flex-1 h-2 bg-void-200">
									<div 
										class="h-full transition-all duration-500 bg-status-{status}"
										style="width: {pct}%"
									></div>
								</div>
								<span class="text-xs text-ghost tabular-nums w-8 text-right">{count}</span>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-ghost-dim text-sm py-8 text-center">No data</p>
				{/if}
			</div>
		</div>

		<!-- Priority Distribution -->
		{#if analytics?.issuesByPriority && Object.keys(analytics.issuesByPriority).length > 0}
			<div class="card mt-4">
				<div class="panel-header">
					<Zap size={14} />
					<span>PRIORITY DISTRIBUTION</span>
				</div>
				<div class="grid grid-cols-4 gap-6">
					{#each ['critical', 'high', 'medium', 'low'] as priority}
						{@const count = analytics.issuesByPriority[priority] || 0}
						{@const total = analytics.totalIssues || 1}
						{@const pct = Math.round((count / total) * 100)}
						<div>
							<div class="flex items-center justify-between text-xs mb-2">
								<span class="text-ghost-dim uppercase">{priority}</span>
								<span class="text-ghost tabular-nums">{count}</span>
							</div>
							<div class="h-2 bg-void-200">
								<div 
									class="h-full transition-all duration-500 bg-priority-{priority}"
									style="width: {pct}%"
								></div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Type Distribution -->
		{#if analytics?.issuesByType && Object.keys(analytics.issuesByType).length > 0}
			<div class="card mt-4">
				<div class="panel-header">
					<Bug size={14} />
					<span>BY TYPE</span>
				</div>
				<div class="flex gap-6">
					{#each Object.entries(analytics.issuesByType) as [type, count]}
						<div class="flex items-center gap-2">
							<span class="text-xs text-ghost-dim uppercase">{typeLabels[type] || type}</span>
							<span class="text-sm text-ghost-bright tabular-nums">{count}</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>

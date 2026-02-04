<script lang="ts">
	import { onMount } from 'svelte';
	import { Bug, FolderOpen, CheckCircle, AlertCircle, Activity, Clock, ChevronRight, Zap } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import type { Project, Issue } from '$lib/db/schema';

	interface Analytics {
		totalProjects: number;
		totalIssues: number;
		openIssues: number;
		closedIssues: number;
		issuesByType: Record<string, number>;
		issuesByPriority: Record<string, number>;
		recentActivity: Array<Issue & { type: string }>;
	}

	let analytics = $state<Analytics | null>(null);
	let projects = $state<(Project & { issueCount?: number })[]>([]);
	let loading = $state(true);

	onMount(async () => {
		const [analyticsRes, projectsRes] = await Promise.all([
			fetch('/api/analytics'),
			fetch('/api/projects')
		]);

		if (analyticsRes.ok) analytics = await analyticsRes.json();
		if (projectsRes.ok) projects = await projectsRes.json();
		loading = false;
	});

	const priorityLabels: Record<string, string> = {
		critical: 'CRIT',
		high: 'HIGH',
		medium: 'MED',
		low: 'LOW'
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

<div class="p-4 max-w-6xl">
	<!-- Header -->
	<div class="mb-4">
		<div class="flex items-center gap-2 text-ghost-dim text-2xs mb-1">
			<span>SYS://</span>
			<span class="text-cyber">DASHBOARD</span>
		</div>
		<h1 class="text-lg text-ghost-bright font-display tracking-wide">SYSTEM OVERVIEW</h1>
	</div>

	{#if loading}
		<div class="flex items-center gap-2 text-ghost-dim text-sm py-8">
			<span class="animate-pulse">▋</span>
			<span>Loading data...</span>
		</div>
	{:else}
		<!-- Stats Grid - Compact -->
		<div class="grid grid-cols-4 gap-2 mb-4">
			<div class="card">
				<div class="text-2xs text-ghost-dim uppercase tracking-wider mb-1">Projects</div>
				<div class="text-xl font-display text-cyber">{analytics?.totalProjects ?? 0}</div>
			</div>
			<div class="card">
				<div class="text-2xs text-ghost-dim uppercase tracking-wider mb-1">Issues</div>
				<div class="text-xl font-display text-ghost-bright">{analytics?.totalIssues ?? 0}</div>
			</div>
			<div class="card">
				<div class="text-2xs text-ghost-dim uppercase tracking-wider mb-1">Open</div>
				<div class="text-xl font-display text-ember">{analytics?.openIssues ?? 0}</div>
			</div>
			<div class="card">
				<div class="text-2xs text-ghost-dim uppercase tracking-wider mb-1">Closed</div>
				<div class="text-xl font-display text-matrix">{analytics?.closedIssues ?? 0}</div>
			</div>
		</div>

		<div class="grid grid-cols-3 gap-3">
			<!-- Projects Panel -->
			<div class="col-span-2 card">
				<div class="panel-header">
					<FolderOpen size={12} />
					<span>PROJECTS</span>
					<a href="/projects" class="ml-auto text-cyber hover:text-cyber text-2xs">VIEW ALL →</a>
				</div>
				
				{#if projects.length === 0}
					<div class="text-center py-6 text-ghost-dim text-sm">
						<p>No projects initialized</p>
						<a href="/projects" class="btn btn-primary mt-2 inline-flex">+ NEW PROJECT</a>
					</div>
				{:else}
					<div class="space-y-1">
						{#each projects.slice(0, 6) as project}
							<button 
								class="w-full p-2 flex items-center gap-2 text-left hover:bg-void-50 transition-colors border border-transparent hover:border-void-50 group"
								onclick={() => goto(`/projects/${project.id}`)}
							>
								<div 
									class="w-1 h-6 flex-shrink-0"
									style="background-color: {project.color}"
								></div>
								<div class="flex-1 min-w-0">
									<div class="text-sm text-ghost-bright truncate">{project.name}</div>
									<div class="text-2xs text-ghost-dim font-mono truncate">{project.path}</div>
								</div>
								<div class="text-xs text-ghost-dim">
									{project.issueCount ?? 0}
								</div>
								<ChevronRight size={12} class="text-ghost-dim opacity-0 group-hover:opacity-100" />
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Activity Panel -->
			<div class="card">
				<div class="panel-header">
					<Activity size={12} />
					<span>RECENT</span>
				</div>
				
				{#if analytics?.recentActivity && analytics.recentActivity.length > 0}
					<div class="space-y-1">
						{#each analytics.recentActivity.slice(0, 8) as issue}
							<button 
								class="w-full text-left p-1.5 hover:bg-void-50 transition-colors border border-transparent hover:border-void-50"
								onclick={() => goto(`/projects/${issue.projectId}/issues/${issue.id}`)}
							>
								<div class="flex items-center gap-2">
									<span class="badge badge-priority-{issue.priority} text-2xs">
										{priorityLabels[issue.priority]}
									</span>
									<span class="text-xs text-ghost truncate flex-1">{issue.title}</span>
									<span class="text-2xs text-ghost-dim">{formatTimeAgo(issue.createdAt)}</span>
								</div>
							</button>
						{/each}
					</div>
				{:else}
					<p class="text-ghost-dim text-xs py-4 text-center">No activity</p>
				{/if}
			</div>
		</div>

		<!-- Priority Distribution -->
		{#if analytics?.issuesByPriority && Object.keys(analytics.issuesByPriority).length > 0}
			<div class="card mt-3">
				<div class="panel-header">
					<Zap size={12} />
					<span>PRIORITY DISTRIBUTION</span>
				</div>
				<div class="flex gap-4">
					{#each ['critical', 'high', 'medium', 'low'] as priority}
						{@const count = analytics.issuesByPriority[priority] || 0}
						{@const total = analytics.totalIssues || 1}
						{@const pct = Math.round((count / total) * 100)}
						<div class="flex-1">
							<div class="flex items-center justify-between text-2xs mb-1">
								<span class="text-ghost-dim uppercase">{priority}</span>
								<span class="text-ghost">{count}</span>
							</div>
							<div class="h-1 bg-void-200">
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
	{/if}
</div>

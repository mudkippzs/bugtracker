<script lang="ts">
	import { onMount } from 'svelte';
	import { Bug, FolderOpen, CheckCircle, AlertCircle, TrendingUp, Clock, ArrowRight } from 'lucide-svelte';
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

		if (analyticsRes.ok) {
			analytics = await analyticsRes.json();
		}
		if (projectsRes.ok) {
			projects = await projectsRes.json();
		}
		loading = false;
	});

	const statCards = $derived([
		{ label: 'Total Projects', value: analytics?.totalProjects ?? 0, icon: FolderOpen, color: 'text-accent' },
		{ label: 'Total Issues', value: analytics?.totalIssues ?? 0, icon: Bug, color: 'text-status-todo' },
		{ label: 'Open Issues', value: analytics?.openIssues ?? 0, icon: AlertCircle, color: 'text-priority-high' },
		{ label: 'Closed', value: analytics?.closedIssues ?? 0, icon: CheckCircle, color: 'text-status-done' }
	]);

	const priorityLabels: Record<string, string> = {
		critical: 'Critical',
		high: 'High',
		medium: 'Medium',
		low: 'Low'
	};

	function formatTimeAgo(dateStr: string) {
		const date = new Date(dateStr);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (minutes < 1) return 'Just now';
		if (minutes < 60) return `${minutes}m ago`;
		if (hours < 24) return `${hours}h ago`;
		return `${days}d ago`;
	}
</script>

<svelte:head>
	<title>Dashboard | BugTracker</title>
</svelte:head>

<div class="p-8 max-w-7xl mx-auto">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="text-3xl font-display font-bold text-surface-100">Dashboard</h1>
		<p class="text-surface-400 mt-1">Overview of your bug tracking activity</p>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-20">
			<div class="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full"></div>
		</div>
	{:else}
		<!-- Stats Grid -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
			{#each statCards as stat, i}
				<div class="card animate-slide-up" style="animation-delay: {i * 50}ms">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm text-surface-400">{stat.label}</p>
							<p class="text-3xl font-bold text-surface-100 mt-1">{stat.value}</p>
						</div>
						<div class="w-12 h-12 rounded-xl bg-surface-800 flex items-center justify-center {stat.color}">
							<svelte:component this={stat.icon} size={24} />
						</div>
					</div>
				</div>
			{/each}
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Recent Projects -->
			<div class="lg:col-span-2">
				<div class="card">
					<div class="flex items-center justify-between mb-4">
						<h2 class="font-semibold text-surface-100 flex items-center gap-2">
							<FolderOpen size={18} />
							Projects
						</h2>
						<a href="/projects" class="text-sm text-accent hover:text-accent-light flex items-center gap-1">
							View all <ArrowRight size={14} />
						</a>
					</div>
					
					{#if projects.length === 0}
						<div class="text-center py-12">
							<FolderOpen size={48} class="mx-auto text-surface-600 mb-3" />
							<p class="text-surface-400">No projects yet</p>
							<a href="/projects" class="btn btn-primary mt-4 inline-flex">
								Add Project
							</a>
						</div>
					{:else}
						<div class="space-y-2">
							{#each projects.slice(0, 5) as project}
								<button 
									class="w-full p-3 rounded-lg bg-surface-800/50 hover:bg-surface-800 transition-colors flex items-center gap-3 text-left"
									onclick={() => goto(`/projects/${project.id}`)}
								>
									<div 
										class="w-10 h-10 rounded-lg flex items-center justify-center"
										style="background-color: {project.color}20; color: {project.color}"
									>
										<FolderOpen size={20} />
									</div>
									<div class="flex-1 min-w-0">
										<p class="font-medium text-surface-100 truncate">{project.name}</p>
										<p class="text-xs text-surface-500 font-mono truncate">{project.path}</p>
									</div>
									<div class="text-sm text-surface-400">
										{project.issueCount ?? 0} issues
									</div>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<!-- Recent Activity -->
			<div>
				<div class="card">
					<h2 class="font-semibold text-surface-100 flex items-center gap-2 mb-4">
						<Clock size={18} />
						Recent Activity
					</h2>
					
					{#if analytics?.recentActivity && analytics.recentActivity.length > 0}
						<div class="space-y-3">
							{#each analytics.recentActivity.slice(0, 8) as issue}
								<button 
									class="w-full text-left group"
									onclick={() => goto(`/projects/${issue.projectId}/issues/${issue.id}`)}
								>
									<div class="flex items-start gap-3">
										<span class="badge badge-priority-{issue.priority} mt-0.5">
											{priorityLabels[issue.priority]?.charAt(0)}
										</span>
										<div class="flex-1 min-w-0">
											<p class="text-sm text-surface-200 group-hover:text-surface-100 truncate">
												{issue.title}
											</p>
											<p class="text-xs text-surface-500">
												{formatTimeAgo(issue.createdAt)}
											</p>
										</div>
									</div>
								</button>
							{/each}
						</div>
					{:else}
						<p class="text-surface-500 text-sm text-center py-8">No recent activity</p>
					{/if}
				</div>

				<!-- Priority Breakdown -->
				{#if analytics?.issuesByPriority && Object.keys(analytics.issuesByPriority).length > 0}
					<div class="card mt-4">
						<h2 class="font-semibold text-surface-100 flex items-center gap-2 mb-4">
							<TrendingUp size={18} />
							By Priority
						</h2>
						<div class="space-y-3">
							{#each Object.entries(analytics.issuesByPriority) as [priority, count]}
								{@const total = analytics.totalIssues || 1}
								{@const pct = Math.round((count / total) * 100)}
								<div>
									<div class="flex items-center justify-between text-sm mb-1">
										<span class="text-surface-300 capitalize">{priority}</span>
										<span class="text-surface-500">{count}</span>
									</div>
									<div class="h-2 bg-surface-800 rounded-full overflow-hidden">
										<div 
											class="h-full rounded-full bg-priority-{priority} transition-all duration-500"
											style="width: {pct}%"
										></div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

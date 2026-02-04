<script lang="ts">
	import { onMount } from 'svelte';
	import { 
		BarChart3, TrendingUp, Bug, CheckCircle, AlertCircle, 
		Calendar, PieChart, Activity 
	} from 'lucide-svelte';

	interface Analytics {
		totalProjects: number;
		totalIssues: number;
		openIssues: number;
		closedIssues: number;
		issuesByType: Record<string, number>;
		issuesByPriority: Record<string, number>;
		issuesByStatus: Record<string, number>;
		issuesOverTime: Array<{ date: string; count: number }>;
	}

	let analytics = $state<Analytics | null>(null);
	let loading = $state(true);

	onMount(async () => {
		const res = await fetch('/api/analytics');
		if (res.ok) {
			analytics = await res.json();
		}
		loading = false;
	});

	const typeLabels: Record<string, string> = {
		bug: 'Bugs',
		feature: 'Features',
		refactor: 'Refactors',
		cleanup: 'Cleanups',
		task: 'Tasks',
		epic: 'Epics'
	};

	const typeColors: Record<string, string> = {
		bug: '#ef4444',
		feature: '#22c55e',
		refactor: '#3b82f6',
		cleanup: '#f97316',
		task: '#a855f7',
		epic: '#6366f1'
	};

	const priorityColors: Record<string, string> = {
		critical: '#ef4444',
		high: '#f97316',
		medium: '#eab308',
		low: '#22c55e'
	};

	const statusColors: Record<string, string> = {
		backlog: '#64748b',
		todo: '#3b82f6',
		in_progress: '#a855f7',
		review: '#f59e0b',
		done: '#22c55e',
		closed: '#6b7280'
	};

	const statusLabels: Record<string, string> = {
		backlog: 'Backlog',
		todo: 'To Do',
		in_progress: 'In Progress',
		review: 'Review',
		done: 'Done',
		closed: 'Closed'
	};

	function getMaxValue(data: Record<string, number>): number {
		return Math.max(...Object.values(data), 1);
	}
</script>

<svelte:head>
	<title>Analytics | BugTracker</title>
</svelte:head>

<div class="p-8 max-w-7xl mx-auto">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="text-3xl font-display font-bold text-surface-100 flex items-center gap-3">
			<BarChart3 size={32} />
			Analytics
		</h1>
		<p class="text-surface-400 mt-1">Insights into your bug tracking activity</p>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-20">
			<div class="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full"></div>
		</div>
	{:else if analytics}
		<!-- Summary Stats -->
		<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
			<div class="card animate-slide-up">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm text-surface-400">Total Issues</p>
						<p class="text-3xl font-bold text-surface-100">{analytics.totalIssues}</p>
					</div>
					<div class="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
						<Bug size={24} />
					</div>
				</div>
			</div>

			<div class="card animate-slide-up" style="animation-delay: 50ms">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm text-surface-400">Open</p>
						<p class="text-3xl font-bold text-surface-100">{analytics.openIssues}</p>
					</div>
					<div class="w-12 h-12 rounded-xl bg-priority-high/20 flex items-center justify-center text-priority-high">
						<AlertCircle size={24} />
					</div>
				</div>
			</div>

			<div class="card animate-slide-up" style="animation-delay: 100ms">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm text-surface-400">Closed</p>
						<p class="text-3xl font-bold text-surface-100">{analytics.closedIssues}</p>
					</div>
					<div class="w-12 h-12 rounded-xl bg-status-done/20 flex items-center justify-center text-status-done">
						<CheckCircle size={24} />
					</div>
				</div>
			</div>

			<div class="card animate-slide-up" style="animation-delay: 150ms">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm text-surface-400">Resolution Rate</p>
						<p class="text-3xl font-bold text-surface-100">
							{analytics.totalIssues > 0 
								? Math.round((analytics.closedIssues / analytics.totalIssues) * 100) 
								: 0}%
						</p>
					</div>
					<div class="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
						<TrendingUp size={24} />
					</div>
				</div>
			</div>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
			<!-- Issues by Type -->
			<div class="card">
				<h2 class="font-semibold text-surface-100 flex items-center gap-2 mb-6">
					<PieChart size={18} />
					Issues by Type
				</h2>
				
				{#if Object.keys(analytics.issuesByType).length > 0}
					{@const maxType = getMaxValue(analytics.issuesByType)}
					<div class="space-y-4">
						{#each Object.entries(analytics.issuesByType) as [type, count]}
							{@const pct = Math.round((count / maxType) * 100)}
							<div>
								<div class="flex items-center justify-between text-sm mb-2">
									<span class="text-surface-300 flex items-center gap-2">
										<span 
											class="w-3 h-3 rounded-full"
											style="background-color: {typeColors[type] || '#6366f1'}"
										></span>
										{typeLabels[type] || type}
									</span>
									<span class="text-surface-100 font-medium">{count}</span>
								</div>
								<div class="h-3 bg-surface-800 rounded-full overflow-hidden">
									<div 
										class="h-full rounded-full transition-all duration-700"
										style="width: {pct}%; background-color: {typeColors[type] || '#6366f1'}"
									></div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-surface-500 text-center py-8">No data available</p>
				{/if}
			</div>

			<!-- Issues by Priority -->
			<div class="card">
				<h2 class="font-semibold text-surface-100 flex items-center gap-2 mb-6">
					<AlertCircle size={18} />
					Issues by Priority
				</h2>
				
				{#if Object.keys(analytics.issuesByPriority).length > 0}
					{@const maxPriority = getMaxValue(analytics.issuesByPriority)}
					<div class="space-y-4">
						{#each ['critical', 'high', 'medium', 'low'] as priority}
							{@const count = analytics.issuesByPriority[priority] || 0}
							{@const pct = Math.round((count / maxPriority) * 100)}
							<div>
								<div class="flex items-center justify-between text-sm mb-2">
									<span class="text-surface-300 flex items-center gap-2">
										<span 
											class="w-3 h-3 rounded-full"
											style="background-color: {priorityColors[priority]}"
										></span>
										<span class="capitalize">{priority}</span>
									</span>
									<span class="text-surface-100 font-medium">{count}</span>
								</div>
								<div class="h-3 bg-surface-800 rounded-full overflow-hidden">
									<div 
										class="h-full rounded-full transition-all duration-700"
										style="width: {pct}%; background-color: {priorityColors[priority]}"
									></div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-surface-500 text-center py-8">No data available</p>
				{/if}
			</div>
		</div>

		<!-- Issues by Status -->
		<div class="card mb-6">
			<h2 class="font-semibold text-surface-100 flex items-center gap-2 mb-6">
				<Activity size={18} />
				Issues by Status
			</h2>
			
			{#if Object.keys(analytics.issuesByStatus).length > 0}
				<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
					{#each ['backlog', 'todo', 'in_progress', 'review', 'done', 'closed'] as status}
						{@const count = analytics.issuesByStatus[status] || 0}
						<div class="text-center p-4 bg-surface-800/50 rounded-xl">
							<div 
								class="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
								style="background-color: {statusColors[status]}20; color: {statusColors[status]}"
							>
								<span class="text-lg font-bold">{count}</span>
							</div>
							<p class="text-sm text-surface-400">{statusLabels[status]}</p>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-surface-500 text-center py-8">No data available</p>
			{/if}
		</div>

		<!-- Issues Over Time -->
		{#if analytics.issuesOverTime && analytics.issuesOverTime.length > 0}
			{@const maxCount = Math.max(...analytics.issuesOverTime.map(d => d.count), 1)}
			<div class="card">
				<h2 class="font-semibold text-surface-100 flex items-center gap-2 mb-6">
					<Calendar size={18} />
					Issues Created (Last 30 Days)
				</h2>
				
				<div class="flex items-end gap-1 h-40">
					{#each analytics.issuesOverTime as day}
						{@const height = (day.count / maxCount) * 100}
						<div 
							class="flex-1 bg-accent/80 rounded-t hover:bg-accent transition-colors cursor-pointer group relative"
							style="height: {Math.max(height, 4)}%"
							title="{day.date}: {day.count} issues"
						>
							<div class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-surface-800 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
								{day.date}: {day.count}
							</div>
						</div>
					{/each}
				</div>
				<div class="flex justify-between mt-2 text-xs text-surface-500">
					<span>{analytics.issuesOverTime[0]?.date}</span>
					<span>{analytics.issuesOverTime[analytics.issuesOverTime.length - 1]?.date}</span>
				</div>
			</div>
		{/if}
	{:else}
		<div class="card text-center py-16">
			<BarChart3 size={64} class="mx-auto text-surface-600 mb-4" />
			<h2 class="text-xl font-semibold text-surface-200 mb-2">No data yet</h2>
			<p class="text-surface-400">Start tracking issues to see analytics here</p>
		</div>
	{/if}
</div>

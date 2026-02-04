<script lang="ts">
	import { onMount } from 'svelte';
	import { 
		BarChart3, TrendingUp, Bug, CheckCircle, AlertCircle, 
		Calendar, Activity, Clock, MessageSquare, Zap, Timer
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
		// New metrics
		avgTTRHours: number;
		avgCommentsPerIssue: number;
		timeInState: Record<string, number>;
		resolvedThisWeek: number;
		totalComments: number;
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
		bug: 'BUG',
		feature: 'FEAT',
		refactor: 'REF',
		cleanup: 'CLN',
		task: 'TSK',
		epic: 'EPC'
	};

	const typeColors: Record<string, string> = {
		bug: '#ff2a6d',
		feature: '#00ff9f',
		refactor: '#00a0ff',
		cleanup: '#ff6b35',
		task: '#a855f7',
		epic: '#00f0ff'
	};

	const priorityColors: Record<string, string> = {
		critical: '#ff2a6d',
		high: '#ff6b35',
		medium: '#f0c020',
		low: '#00ff9f'
	};

	const statusColors: Record<string, string> = {
		backlog: '#4a5260',
		todo: '#00a0ff',
		in_progress: '#a855f7',
		review: '#f0c020',
		done: '#00ff9f',
		closed: '#4a5260'
	};

	const statusLabels: Record<string, string> = {
		backlog: 'BACKLOG',
		todo: 'TODO',
		in_progress: 'IN PROG',
		review: 'REVIEW',
		done: 'DONE',
		closed: 'CLOSED'
	};

	function getMaxValue(data: Record<string, number>): number {
		return Math.max(...Object.values(data), 1);
	}

	function formatHours(hours: number): string {
		if (hours < 1) return `${Math.round(hours * 60)}m`;
		if (hours < 24) return `${Math.round(hours)}h`;
		const days = hours / 24;
		if (days < 7) return `${Math.round(days * 10) / 10}d`;
		return `${Math.round(days / 7 * 10) / 10}w`;
	}
</script>

<svelte:head>
	<title>Analytics // BugTracker</title>
</svelte:head>

<div class="p-6">
	<!-- Header -->
	<div class="mb-6">
		<div class="flex items-center gap-2 text-ghost-dim text-xs mb-1">
			<span>SYS://</span>
			<span class="text-cyber">ANALYTICS</span>
		</div>
		<h1 class="text-xl text-ghost-bright font-display tracking-wide">SYSTEM METRICS</h1>
	</div>

	{#if loading}
		<div class="flex items-center gap-2 text-ghost-dim text-base py-12">
			<span class="animate-pulse">▋</span>
			<span>Loading...</span>
		</div>
	{:else if analytics}
		<!-- Summary Stats - Row 1 -->
		<div class="grid grid-cols-5 gap-3 mb-3">
			<div class="card">
				<div class="text-xs text-ghost-dim uppercase tracking-wider mb-2 flex items-center gap-2">
					<Bug size={14} /> TOTAL
				</div>
				<div class="text-2xl font-display text-ghost-bright">{analytics.totalIssues}</div>
			</div>

			<div class="card">
				<div class="text-xs text-ghost-dim uppercase tracking-wider mb-2 flex items-center gap-2">
					<AlertCircle size={14} /> OPEN
				</div>
				<div class="text-2xl font-display text-ember">{analytics.openIssues}</div>
			</div>

			<div class="card">
				<div class="text-xs text-ghost-dim uppercase tracking-wider mb-2 flex items-center gap-2">
					<CheckCircle size={14} /> CLOSED
				</div>
				<div class="text-2xl font-display text-matrix">{analytics.closedIssues}</div>
			</div>

			<div class="card">
				<div class="text-xs text-ghost-dim uppercase tracking-wider mb-2 flex items-center gap-2">
					<TrendingUp size={14} /> RESOLUTION
				</div>
				<div class="text-2xl font-display text-cyber">
					{analytics.totalIssues > 0 
						? Math.round((analytics.closedIssues / analytics.totalIssues) * 100) 
						: 0}%
				</div>
			</div>

			<div class="card">
				<div class="text-xs text-ghost-dim uppercase tracking-wider mb-2 flex items-center gap-2">
					<Activity size={14} /> PROJECTS
				</div>
				<div class="text-2xl font-display text-ghost-bright">{analytics.totalProjects}</div>
			</div>
		</div>

		<!-- Summary Stats - Row 2 (New Metrics) -->
		<div class="grid grid-cols-5 gap-3 mb-6">
			<div class="card">
				<div class="text-xs text-ghost-dim uppercase tracking-wider mb-2 flex items-center gap-2">
					<Clock size={14} /> AVG TTR
				</div>
				<div class="text-2xl font-display text-cyber">
					{analytics.avgTTRHours > 0 ? formatHours(analytics.avgTTRHours) : '—'}
				</div>
				<div class="text-2xs text-ghost-dim mt-1">time to resolution</div>
			</div>

			<div class="card">
				<div class="text-xs text-ghost-dim uppercase tracking-wider mb-2 flex items-center gap-2">
					<MessageSquare size={14} /> COMMENTS
				</div>
				<div class="text-2xl font-display text-ghost-bright">{analytics.totalComments}</div>
				<div class="text-2xs text-ghost-dim mt-1">{analytics.avgCommentsPerIssue}/issue avg</div>
			</div>

			<div class="card">
				<div class="text-xs text-ghost-dim uppercase tracking-wider mb-2 flex items-center gap-2">
					<Zap size={14} /> THIS WEEK
				</div>
				<div class="text-2xl font-display text-matrix">{analytics.resolvedThisWeek}</div>
				<div class="text-2xs text-ghost-dim mt-1">issues resolved</div>
			</div>

			<div class="card">
				<div class="text-xs text-ghost-dim uppercase tracking-wider mb-2 flex items-center gap-2">
					<Timer size={14} /> IN PROGRESS
				</div>
				<div class="text-2xl font-display text-status-in_progress">
					{analytics.timeInState.in_progress > 0 ? formatHours(analytics.timeInState.in_progress) : '—'}
				</div>
				<div class="text-2xs text-ghost-dim mt-1">avg time in state</div>
			</div>

			<div class="card">
				<div class="text-xs text-ghost-dim uppercase tracking-wider mb-2 flex items-center gap-2">
					<Timer size={14} /> IN REVIEW
				</div>
				<div class="text-2xl font-display text-status-review">
					{analytics.timeInState.review > 0 ? formatHours(analytics.timeInState.review) : '—'}
				</div>
				<div class="text-2xs text-ghost-dim mt-1">avg time in state</div>
			</div>
		</div>

		<!-- Main Grid -->
		<div class="grid grid-cols-12 gap-4 mb-4">
			<!-- Issues by Type -->
			<div class="col-span-4 card">
				<div class="panel-header">
					<Bug size={14} />
					<span>BY TYPE</span>
				</div>
				
				{#if Object.keys(analytics.issuesByType).length > 0}
					{@const maxType = getMaxValue(analytics.issuesByType)}
					<div class="space-y-3">
						{#each Object.entries(analytics.issuesByType) as [type, count]}
							{@const pct = Math.round((count / maxType) * 100)}
							<div>
								<div class="flex items-center justify-between text-xs mb-1">
									<span class="text-ghost flex items-center gap-2">
										<span 
											class="w-3 h-3"
											style="background-color: {typeColors[type] || '#00f0ff'}"
										></span>
										{typeLabels[type] || type}
									</span>
									<span class="text-ghost-bright tabular-nums">{count}</span>
								</div>
								<div class="h-2 bg-void-200">
									<div 
										class="h-full transition-all duration-500"
										style="width: {pct}%; background-color: {typeColors[type] || '#00f0ff'}"
									></div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-ghost-dim text-sm text-center py-8">No data</p>
				{/if}
			</div>

			<!-- Issues by Priority -->
			<div class="col-span-4 card">
				<div class="panel-header">
					<AlertCircle size={14} />
					<span>BY PRIORITY</span>
				</div>
				
				{#if Object.keys(analytics.issuesByPriority).length > 0}
					{@const maxPriority = getMaxValue(analytics.issuesByPriority)}
					<div class="space-y-3">
						{#each ['critical', 'high', 'medium', 'low'] as priority}
							{@const count = analytics.issuesByPriority[priority] || 0}
							{@const pct = Math.round((count / maxPriority) * 100)}
							<div>
								<div class="flex items-center justify-between text-xs mb-1">
									<span class="text-ghost flex items-center gap-2">
										<span 
											class="w-3 h-3"
											style="background-color: {priorityColors[priority]}"
										></span>
										<span class="uppercase">{priority}</span>
									</span>
									<span class="text-ghost-bright tabular-nums">{count}</span>
								</div>
								<div class="h-2 bg-void-200">
									<div 
										class="h-full transition-all duration-500"
										style="width: {pct}%; background-color: {priorityColors[priority]}"
									></div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-ghost-dim text-sm text-center py-8">No data</p>
				{/if}
			</div>

			<!-- Issues by Status -->
			<div class="col-span-4 card">
				<div class="panel-header">
					<Activity size={14} />
					<span>BY STATUS</span>
				</div>
				
				{#if Object.keys(analytics.issuesByStatus).length > 0}
					<div class="space-y-2">
						{#each ['backlog', 'todo', 'in_progress', 'review', 'done', 'closed'] as status}
							{@const count = analytics.issuesByStatus[status] || 0}
							{@const total = analytics.totalIssues || 1}
							{@const pct = Math.round((count / total) * 100)}
							<div class="flex items-center gap-3">
								<span 
									class="text-xs w-16"
									style="color: {statusColors[status]}"
								>{statusLabels[status]}</span>
								<div class="flex-1 h-2 bg-void-200">
									<div 
										class="h-full transition-all duration-500"
										style="width: {pct}%; background-color: {statusColors[status]}"
									></div>
								</div>
								<span class="text-xs text-ghost tabular-nums w-8 text-right">{count}</span>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-ghost-dim text-sm text-center py-8">No data</p>
				{/if}
			</div>
		</div>

		<!-- Issues Over Time -->
		{#if analytics.issuesOverTime && analytics.issuesOverTime.length > 0}
			{@const maxCount = Math.max(...analytics.issuesOverTime.map(d => d.count), 1)}
			<div class="card">
				<div class="panel-header">
					<Calendar size={14} />
					<span>30 DAY TREND</span>
				</div>
				
				<div class="flex items-end gap-1 h-32">
					{#each analytics.issuesOverTime as day}
						{@const height = (day.count / maxCount) * 100}
						<div 
							class="flex-1 bg-cyber/50 hover:bg-cyber transition-colors cursor-pointer group relative"
							style="height: {Math.max(height, 4)}%"
							title="{day.date}: {day.count}"
						>
							<div class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-void-100 border border-void-50 px-2 py-1 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
								<span class="text-ghost-dim">{day.date}:</span>
								<span class="text-cyber">{day.count}</span>
							</div>
						</div>
					{/each}
				</div>
				<div class="flex justify-between mt-2 text-xs text-ghost-dim">
					<span>{analytics.issuesOverTime[0]?.date}</span>
					<span>{analytics.issuesOverTime[analytics.issuesOverTime.length - 1]?.date}</span>
				</div>
			</div>
		{/if}
	{:else}
		<div class="card text-center py-12">
			<BarChart3 size={48} class="mx-auto text-ghost-dim mb-4" />
			<h2 class="text-base text-ghost mb-2">NO DATA</h2>
			<p class="text-sm text-ghost-dim">Start tracking issues to see metrics</p>
		</div>
	{/if}
</div>

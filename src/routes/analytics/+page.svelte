<script lang="ts">
	import { onMount } from 'svelte';
	import { 
		BarChart3, TrendingUp, Bug, CheckCircle, AlertCircle, 
		Calendar, Activity 
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
		backlog: 'BKLG',
		todo: 'TODO',
		in_progress: 'PROG',
		review: 'REV',
		done: 'DONE',
		closed: 'CLSD'
	};

	function getMaxValue(data: Record<string, number>): number {
		return Math.max(...Object.values(data), 1);
	}
</script>

<svelte:head>
	<title>Analytics // BugTracker</title>
</svelte:head>

<div class="p-4 max-w-5xl">
	<!-- Header -->
	<div class="mb-4">
		<div class="flex items-center gap-2 text-ghost-dim text-2xs mb-1">
			<span>SYS://</span>
			<span class="text-cyber">ANALYTICS</span>
		</div>
		<h1 class="text-lg text-ghost-bright font-display tracking-wide">SYSTEM METRICS</h1>
	</div>

	{#if loading}
		<div class="flex items-center gap-2 text-ghost-dim text-sm py-8">
			<span class="animate-pulse">▋</span>
			<span>Loading...</span>
		</div>
	{:else if analytics}
		<!-- Summary Stats -->
		<div class="grid grid-cols-4 gap-2 mb-4">
			<div class="card">
				<div class="text-2xs text-ghost-dim uppercase tracking-wider mb-1 flex items-center gap-1">
					<Bug size={10} /> TOTAL
				</div>
				<div class="text-xl font-display text-ghost-bright">{analytics.totalIssues}</div>
			</div>

			<div class="card">
				<div class="text-2xs text-ghost-dim uppercase tracking-wider mb-1 flex items-center gap-1">
					<AlertCircle size={10} /> OPEN
				</div>
				<div class="text-xl font-display text-ember">{analytics.openIssues}</div>
			</div>

			<div class="card">
				<div class="text-2xs text-ghost-dim uppercase tracking-wider mb-1 flex items-center gap-1">
					<CheckCircle size={10} /> CLOSED
				</div>
				<div class="text-xl font-display text-matrix">{analytics.closedIssues}</div>
			</div>

			<div class="card">
				<div class="text-2xs text-ghost-dim uppercase tracking-wider mb-1 flex items-center gap-1">
					<TrendingUp size={10} /> RATE
				</div>
				<div class="text-xl font-display text-cyber">
					{analytics.totalIssues > 0 
						? Math.round((analytics.closedIssues / analytics.totalIssues) * 100) 
						: 0}%
				</div>
			</div>
		</div>

		<div class="grid grid-cols-2 gap-3 mb-3">
			<!-- Issues by Type -->
			<div class="card">
				<div class="panel-header">
					<span>BY TYPE</span>
				</div>
				
				{#if Object.keys(analytics.issuesByType).length > 0}
					{@const maxType = getMaxValue(analytics.issuesByType)}
					<div class="space-y-2">
						{#each Object.entries(analytics.issuesByType) as [type, count]}
							{@const pct = Math.round((count / maxType) * 100)}
							<div>
								<div class="flex items-center justify-between text-2xs mb-0.5">
									<span class="text-ghost flex items-center gap-1.5">
										<span 
											class="w-2 h-2"
											style="background-color: {typeColors[type] || '#00f0ff'}"
										></span>
										{typeLabels[type] || type}
									</span>
									<span class="text-ghost-bright">{count}</span>
								</div>
								<div class="h-1 bg-void-200">
									<div 
										class="h-full transition-all duration-500"
										style="width: {pct}%; background-color: {typeColors[type] || '#00f0ff'}"
									></div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-ghost-dim text-2xs text-center py-4">No data</p>
				{/if}
			</div>

			<!-- Issues by Priority -->
			<div class="card">
				<div class="panel-header">
					<span>BY PRIORITY</span>
				</div>
				
				{#if Object.keys(analytics.issuesByPriority).length > 0}
					{@const maxPriority = getMaxValue(analytics.issuesByPriority)}
					<div class="space-y-2">
						{#each ['critical', 'high', 'medium', 'low'] as priority}
							{@const count = analytics.issuesByPriority[priority] || 0}
							{@const pct = Math.round((count / maxPriority) * 100)}
							<div>
								<div class="flex items-center justify-between text-2xs mb-0.5">
									<span class="text-ghost flex items-center gap-1.5">
										<span 
											class="w-2 h-2"
											style="background-color: {priorityColors[priority]}"
										></span>
										<span class="uppercase">{priority}</span>
									</span>
									<span class="text-ghost-bright">{count}</span>
								</div>
								<div class="h-1 bg-void-200">
									<div 
										class="h-full transition-all duration-500"
										style="width: {pct}%; background-color: {priorityColors[priority]}"
									></div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-ghost-dim text-2xs text-center py-4">No data</p>
				{/if}
			</div>
		</div>

		<!-- Issues by Status -->
		<div class="card mb-3">
			<div class="panel-header">
				<Activity size={10} />
				<span>BY STATUS</span>
			</div>
			
			{#if Object.keys(analytics.issuesByStatus).length > 0}
				<div class="grid grid-cols-6 gap-2">
					{#each ['backlog', 'todo', 'in_progress', 'review', 'done', 'closed'] as status}
						{@const count = analytics.issuesByStatus[status] || 0}
						<div class="text-center p-2 bg-void-200 border border-void-50">
							<div 
								class="text-lg font-display mb-0.5"
								style="color: {statusColors[status]}"
							>
								{count}
							</div>
							<p class="text-2xs text-ghost-dim">{statusLabels[status]}</p>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-ghost-dim text-2xs text-center py-4">No data</p>
			{/if}
		</div>

		<!-- Issues Over Time -->
		{#if analytics.issuesOverTime && analytics.issuesOverTime.length > 0}
			{@const maxCount = Math.max(...analytics.issuesOverTime.map(d => d.count), 1)}
			<div class="card">
				<div class="panel-header">
					<Calendar size={10} />
					<span>30 DAY TREND</span>
				</div>
				
				<div class="flex items-end gap-px h-24">
					{#each analytics.issuesOverTime as day}
						{@const height = (day.count / maxCount) * 100}
						<div 
							class="flex-1 bg-cyber/60 hover:bg-cyber transition-colors cursor-pointer group relative"
							style="height: {Math.max(height, 2)}%"
							title="{day.date}: {day.count}"
						>
							<div class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-void-100 border border-void-50 px-1.5 py-0.5 text-2xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
								<span class="text-ghost-dim">{day.date}:</span>
								<span class="text-cyber">{day.count}</span>
							</div>
						</div>
					{/each}
				</div>
				<div class="flex justify-between mt-1 text-2xs text-ghost-dim">
					<span>{analytics.issuesOverTime[0]?.date}</span>
					<span>{analytics.issuesOverTime[analytics.issuesOverTime.length - 1]?.date}</span>
				</div>
			</div>
		{/if}
	{:else}
		<div class="card text-center py-8">
			<BarChart3 size={32} class="mx-auto text-ghost-dim mb-2" />
			<h2 class="text-sm text-ghost mb-1">NO DATA</h2>
			<p class="text-2xs text-ghost-dim">Start tracking issues to see metrics</p>
		</div>
	{/if}
</div>

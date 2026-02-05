<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { ArrowLeft, Edit2, Trash2, GitCommit, History, Link, ChevronRight, FolderKanban, Copy, Calendar, AlertTriangle, Clock, Play, Square, Link2, X, Eye, EyeOff } from 'lucide-svelte';
	import { Bug, Lightbulb, Wrench, Trash2 as CleanupIcon, ClipboardList, Layers } from 'lucide-svelte';
	import MarkdownContent from '$lib/components/MarkdownContent.svelte';
	import CommentThread from '$lib/components/CommentThread.svelte';
	import IssueForm from '$lib/components/IssueForm.svelte';
	import ProjectPicker from '$lib/components/ProjectPicker.svelte';
	import InlineDropdown from '$lib/components/InlineDropdown.svelte';
	import LabelBadge from '$lib/components/LabelBadge.svelte';
	import LabelPicker from '$lib/components/LabelPicker.svelte';
	import type { Issue } from '$lib/db/schema';
	import { priorities, statuses } from '$lib/db/schema';
	import { currentIssue, fetchIssueDetail } from '$lib/stores/issues';
	import { settings } from '$lib/stores/settings';
	import { watchlist } from '$lib/stores/watchlist';
	import { users, userMap, getUserName } from '$lib/stores/users';
	import RelativeTime from '$lib/components/RelativeTime.svelte';
	import Tooltip from '$lib/components/Tooltip.svelte';
	import UserPicker from '$lib/components/UserPicker.svelte';
	import FileUpload from '$lib/components/FileUpload.svelte';
	import type { Attachment } from '$lib/db/schema';

	let loading = $state(true);
	let showEditForm = $state(false);
	let showDeleteConfirm = $state(false);
	let showLinkCommit = $state(false);
	let showProjectPicker = $state(false);
	let showDuplicateModal = $state(false);
	let showLabelsEditor = $state(false);
	let showTimeLog = $state(false);
	let timeToLog = $state('');
	let showAddDependency = $state(false);
	let dependencyIssueId = $state('');
	let dependencies = $state<{ blockers: any[]; blocking: any[] }>({ blockers: [], blocking: [] });
	let issueAttachments = $state<Attachment[]>([]);
	let isMoving = $state(false);
	let isDuplicating = $state(false);
	let commitHash = $state('');
	let commitBranch = $state('');
	let commitTitle = $state('');

	const projectId = $derived(parseInt($page.params.id));
	const issueId = $derived(parseInt($page.params.issueId));

	// Use the reactive store for issue data
	const issue = $derived($currentIssue);

	const typeIcons: Record<string, typeof Bug> = {
		bug: Bug,
		feature: Lightbulb,
		refactor: Wrench,
		cleanup: CleanupIcon,
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

	// Due date utilities
	function isOverdue(dueDate: string | null | undefined, status: string): boolean {
		if (!dueDate) return false;
		if (status === 'done' || status === 'closed') return false;
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return new Date(dueDate) < today;
	}

	function isDueSoon(dueDate: string | null | undefined, status: string): boolean {
		if (!dueDate) return false;
		if (status === 'done' || status === 'closed') return false;
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const due = new Date(dueDate);
		const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
		return diffDays >= 0 && diffDays <= 3;
	}

	function formatDueDate(dateStr: string): string {
		const due = new Date(dateStr);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
		
		if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
		if (diffDays === 0) return 'Due today';
		if (diffDays === 1) return 'Due tomorrow';
		if (diffDays <= 7) return `Due in ${diffDays} days`;
		return `Due ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
	}

	// Parse labels from JSON string
	function parseLabels(labelsJson: string | null | undefined): string[] {
		if (!labelsJson) return [];
		try {
			return JSON.parse(labelsJson);
		} catch {
			return [];
		}
	}

	// Handle labels update
	async function handleLabelsChange(newLabels: string[]) {
		const res = await fetch(`/api/issues/${issueId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				labels: newLabels,
				author: settings.getCurrentUser()
			})
		});
		if (res.ok) {
			await fetchIssueDetail(issueId);
		}
	}

	// Format minutes to human readable string
	function formatTime(minutes: number | null | undefined): string {
		if (!minutes) return '0m';
		if (minutes < 60) return `${minutes}m`;
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
	}

	// Log time to issue
	async function handleLogTime() {
		const minutes = parseInt(timeToLog);
		if (isNaN(minutes) || minutes <= 0) return;

		const currentSpent = issue?.timeSpent || 0;
		const res = await fetch(`/api/issues/${issueId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				timeSpent: currentSpent + minutes,
				author: settings.getCurrentUser()
			})
		});
		if (res.ok) {
			await fetchIssueDetail(issueId);
			timeToLog = '';
			showTimeLog = false;
		}
	}

	// Fetch dependencies
	async function fetchDependencies() {
		const res = await fetch(`/api/issues/${issueId}/dependencies`);
		if (res.ok) {
			dependencies = await res.json();
		}
	}

	// Add dependency
	async function handleAddDependency() {
		const depId = parseInt(dependencyIssueId);
		if (isNaN(depId)) return;

		await fetch(`/api/issues/${issueId}/dependencies`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				dependsOnId: depId,
				author: settings.getCurrentUser()
			})
		});
		dependencyIssueId = '';
		showAddDependency = false;
		await fetchDependencies();
	}

	// Remove dependency
	async function handleRemoveDependency(dependsOnId: number) {
		await fetch(`/api/issues/${issueId}/dependencies`, {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ dependsOnId })
		});
		await fetchDependencies();
	}

	const statusLabels: Record<string, string> = {
		backlog: 'BACKLOG',
		todo: 'TODO',
		in_progress: 'IN_PROG',
		review: 'REVIEW',
		done: 'DONE',
		closed: 'CLOSED'
	};

	async function fetchAttachments() {
		const res = await fetch(`/api/attachments?issueId=${issueId}`);
		if (res.ok) {
			issueAttachments = await res.json();
		}
	}

	onMount(async () => {
		await fetchIssueDetail(issueId);
		await fetchDependencies();
		await fetchAttachments();
		// Mark issue as read when visiting
		settings.markAsRead(issueId);
		loading = false;
	});

	onDestroy(() => {
		// Clear current issue when leaving the page
		currentIssue.set(null);
	});

	async function handleUpdate(data: Partial<Issue>) {
		const res = await fetch(`/api/issues/${issueId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});

		if (res.ok) {
			// SSE will update the store
			showEditForm = false;
		}
	}

	async function handleStatusChange(e: Event) {
		const select = e.target as HTMLSelectElement;
		await handleUpdate({ status: select.value as Issue['status'] });
	}

	async function handlePriorityChange(e: Event) {
		const select = e.target as HTMLSelectElement;
		await handleUpdate({ priority: select.value as Issue['priority'] });
	}

	async function handleAddComment(content: string) {
		// SSE will update the store when comment is added
		await fetch(`/api/issues/${issueId}/comments`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ content, author: settings.getCurrentUser() })
		});
	}

	async function handleEditComment(commentId: number, content: string) {
		// SSE will update the store
		await fetch(`/api/comments/${commentId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ content })
		});
	}

	async function handleDeleteComment(commentId: number, hard: boolean) {
		const url = hard ? `/api/comments/${commentId}?hard=true` : `/api/comments/${commentId}`;
		// SSE will update the store
		await fetch(url, { method: 'DELETE' });
	}

	async function handleLinkCommit() {
		if (!commitHash) return;

		const res = await fetch(`/api/issues/${issueId}/commits`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				hash: commitHash,
				branch: commitBranch,
				title: commitTitle
			})
		});

		if (res.ok) {
			// SSE will update the store
			showLinkCommit = false;
			commitHash = '';
			commitBranch = '';
			commitTitle = '';
		}
	}

	async function deleteIssue() {
		const res = await fetch(`/api/issues/${issueId}`, { method: 'DELETE' });
		if (res.ok) {
			goto(`/projects/${projectId}`);
		}
	}

	async function handleMoveToProject(newProjectId: number) {
		if (newProjectId === projectId) {
			showProjectPicker = false;
			return;
		}

		isMoving = true;
		const res = await fetch(`/api/issues/${issueId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ projectId: newProjectId })
		});

		if (res.ok) {
			// Navigate to the new location
			goto(`/projects/${newProjectId}/issues/${issueId}`);
		}
		isMoving = false;
		showProjectPicker = false;
	}

	async function handleDuplicate(targetProjectId?: number) {
		if (!issue) return;

		isDuplicating = true;
		const res = await fetch('/api/issues', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				projectId: targetProjectId || projectId,
				title: `${issue.title} (copy)`,
				description: issue.description,
				type: issue.type,
				priority: issue.priority,
				status: 'backlog', // Reset status for the copy
				assignee: issue.assignee,
				author: settings.getCurrentUser()
			})
		});

		if (res.ok) {
			const newIssue = await res.json();
			showDuplicateModal = false;
			// Navigate to the new issue
			goto(`/projects/${targetProjectId || projectId}/issues/${newIssue.id}`);
		}
		isDuplicating = false;
	}

</script>

<svelte:head>
	<title>#{issue?.id ?? ''} {issue?.title ?? 'Issue'} // BugTracker</title>
</svelte:head>

<div class="p-6">
	{#if loading}
		<div class="flex items-center gap-2 text-ghost-dim text-sm py-8">
			<span class="animate-pulse">▋</span>
			<span>Loading...</span>
		</div>
	{:else if issue}
		<!-- Breadcrumb Navigation -->
		<nav class="flex items-center gap-1 text-xs text-ghost-dim mb-3">
			<a href="/projects" class="hover:text-cyber transition-colors">Projects</a>
			<ChevronRight size={12} />
			<Tooltip text="Click to move issue to another project">
				<button 
					class="flex items-center gap-1.5 hover:text-cyber transition-colors group"
					onclick={() => showProjectPicker = true}
					disabled={isMoving}
				>
					{#if issue.project}
						<span 
							class="w-2 h-2"
							style="background-color: {issue.project.color}"
						></span>
						<span class="group-hover:underline">{issue.project.name}</span>
					{:else}
						<FolderKanban size={12} />
						<span class="group-hover:underline">Project</span>
					{/if}
				</button>
			</Tooltip>
			<ChevronRight size={12} />
			<span class="text-ghost">#{issue.id}</span>
		</nav>

		<!-- Header -->
		<div class="flex items-start gap-3 mb-4">
			<a href="/projects/{projectId}" class="btn btn-ghost p-1">
				<ArrowLeft size={14} />
			</a>
			
			<div class="flex-1 min-w-0">
				<div class="flex items-center gap-1.5 text-2xs mb-1 flex-wrap">
					<span class="text-ghost-dim">#{issue.id}</span>
					<span class="badge badge-type flex items-center gap-1">
						<svelte:component this={typeIcons[issue.type] || Bug} size={10} />
						{typeLabels[issue.type]}
					</span>
					
					<!-- Inline editable priority -->
					<InlineDropdown
						options={priorities.map(p => ({ value: p, label: priorityLabels[p] }))}
						value={issue.priority}
						onSelect={(v) => handleUpdate({ priority: v as typeof issue.priority })}
					>
						{#snippet children()}
							<span class="badge badge-priority-{issue.priority} cursor-pointer hover:ring-1 hover:ring-cyber-dim">
								{priorityLabels[issue.priority]}
							</span>
						{/snippet}
					</InlineDropdown>
					
					<!-- Inline editable status -->
					<InlineDropdown
						options={statuses.map(s => ({ value: s, label: statusLabels[s] }))}
						value={issue.status}
						onSelect={(v) => handleUpdate({ status: v as typeof issue.status })}
					>
						{#snippet children()}
							<span class="badge badge-status-{issue.status} cursor-pointer hover:ring-1 hover:ring-cyber-dim">
								{statusLabels[issue.status]}
							</span>
						{/snippet}
					</InlineDropdown>
				</div>
				<h1 class="text-xl text-ghost-bright font-display tracking-wide">{issue.title}</h1>
				<p class="text-xs text-ghost-dim mt-1 flex items-center flex-wrap gap-x-1">
					<RelativeTime timestamp={issue.createdAt} />
					{#if issue.assignee}
						<span>•</span>
						<Tooltip text="Assignee: {getUserName(issue.assignee, $userMap)}">
							<button class="text-ghost hover:text-cyber transition-colors" onclick={() => {}}>
								@{getUserName(issue.assignee, $userMap)}
							</button>
						</Tooltip>
					{/if}
					{#if issue.dueDate}
						<span>•</span>
						<span 
							class="inline-flex items-center gap-1 px-1.5 py-0.5 border
								{isOverdue(issue.dueDate, issue.status) 
									? 'text-blood bg-blood/10 border-blood/30' 
									: isDueSoon(issue.dueDate, issue.status) 
										? 'text-warn bg-warn/10 border-warn/30' 
										: 'text-ghost border-void-50'}"
						>
							{#if isOverdue(issue.dueDate, issue.status)}
								<AlertTriangle size={10} />
							{:else}
								<Calendar size={10} />
							{/if}
							{formatDueDate(issue.dueDate)}
						</span>
					{/if}
				</p>
			</div>

			<div class="flex items-center gap-1">
				<button class="btn btn-secondary" onclick={() => showEditForm = true}>
					<Edit2 size={10} /> EDIT
				</button>
				<Tooltip text="Duplicate issue">
					<button 
						class="btn btn-ghost text-ghost-dim hover:text-cyber" 
						onclick={() => showDuplicateModal = true}
						disabled={isDuplicating}
					>
						<Copy size={12} />
					</button>
				</Tooltip>
				<Tooltip text={$watchlist.has(issueId) ? 'Unwatch issue' : 'Watch issue'}>
					<button 
						class="btn btn-ghost {$watchlist.has(issueId) ? 'text-cyber' : 'text-ghost-dim hover:text-cyber'}" 
						onclick={() => watchlist.toggle(issueId)}
					>
						{#if $watchlist.has(issueId)}
							<Eye size={12} />
						{:else}
							<EyeOff size={12} />
						{/if}
					</button>
				</Tooltip>
				<button class="btn btn-ghost text-ghost-dim hover:text-priority-critical" onclick={() => showDeleteConfirm = true}>
					<Trash2 size={12} />
				</button>
			</div>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
			<!-- Main Content -->
			<div class="lg:col-span-2 space-y-3">
				<!-- Description -->
				<div class="card">
					<div class="panel-header">
						<span>DESCRIPTION</span>
					</div>
					{#if issue.description}
						<MarkdownContent content={issue.description} />
					{:else}
						<p class="text-ghost-dim text-xs italic">No description</p>
					{/if}
				</div>

				<!-- Comments -->
				<div class="card">
					<CommentThread 
						comments={issue.comments} 
						onAddComment={handleAddComment}
						onEditComment={handleEditComment}
						onDeleteComment={handleDeleteComment}
						onRefresh={() => fetchIssueDetail(issueId)}
					/>
				</div>
			</div>

			<!-- Sidebar -->
			<div class="space-y-2">
				<!-- Quick Actions -->
				<div class="card space-y-2">
					<div>
						<label class="label">Status</label>
						<select class="input-sm" value={issue.status} onchange={handleStatusChange}>
							{#each statuses as s}
								<option value={s}>{statusLabels[s]}</option>
							{/each}
						</select>
					</div>

					<div>
						<label class="label">Priority</label>
						<select class="input-sm" value={issue.priority} onchange={handlePriorityChange}>
							{#each priorities as p}
								<option value={p}>{priorityLabels[p]}</option>
							{/each}
						</select>
					</div>

					<div>
						<label class="label">Assignee</label>
						<UserPicker 
							value={issue.assignee}
							onchange={(val) => handleUpdate({ assignee: val })}
							placeholder="Unassigned"
							class="[&_select]:input-sm [&_select]:pr-2"
						/>
					</div>
				</div>

				<!-- Time Tracking -->
				<div class="card">
					<div class="panel-header">
						<Clock size={10} />
						<span>TIME TRACKING</span>
					</div>
					
					<div class="space-y-2">
						{#if issue.estimate}
							<div class="flex items-center justify-between text-xs">
								<span class="text-ghost-dim">Estimate</span>
								<span class="text-ghost">{formatTime(issue.estimate)}</span>
							</div>
						{/if}
						
						<div class="flex items-center justify-between text-xs">
							<span class="text-ghost-dim">Logged</span>
							<span class="text-ghost">{formatTime(issue.timeSpent)}</span>
						</div>

						{#if issue.estimate}
							{@const remaining = (issue.estimate || 0) - (issue.timeSpent || 0)}
							<div class="flex items-center justify-between text-xs">
								<span class="text-ghost-dim">Remaining</span>
								<span class={remaining < 0 ? 'text-blood' : 'text-matrix'}>
									{remaining < 0 ? '+' : ''}{formatTime(Math.abs(remaining))}
								</span>
							</div>
							
							<!-- Progress bar -->
							{@const progress = Math.min(100, ((issue.timeSpent || 0) / issue.estimate) * 100)}
							<div class="h-1 bg-void-200 w-full">
								<div 
									class="h-full transition-all {progress > 100 ? 'bg-blood' : 'bg-cyber'}"
									style="width: {progress}%"
								></div>
							</div>
						{/if}

						{#if showTimeLog}
							<div class="flex gap-1 mt-2">
								<input 
									type="number" 
									class="input-sm flex-1" 
									placeholder="Minutes"
									bind:value={timeToLog}
									onkeydown={(e) => e.key === 'Enter' && handleLogTime()}
								/>
								<button 
									class="btn btn-primary text-2xs"
									onclick={handleLogTime}
								>
									LOG
								</button>
							</div>
						{:else}
							<button 
								class="btn btn-ghost text-2xs w-full mt-2"
								onclick={() => showTimeLog = true}
							>
								<Play size={10} /> LOG TIME
							</button>
						{/if}
					</div>
				</div>

				<!-- Labels -->
				<div class="card">
					<div class="panel-header">
						<span>LABELS</span>
						<button 
							class="ml-auto text-cyber hover:text-cyber text-2xs"
							onclick={() => showLabelsEditor = !showLabelsEditor}
						>
							{showLabelsEditor ? 'DONE' : '+ EDIT'}
						</button>
					</div>
					
					{#if showLabelsEditor}
						<LabelPicker 
							labels={parseLabels(issue.labels)} 
							onchange={handleLabelsChange} 
						/>
					{:else if parseLabels(issue.labels).length > 0}
						<div class="flex flex-wrap gap-1">
							{#each parseLabels(issue.labels) as label}
								<LabelBadge {label} />
							{/each}
						</div>
					{:else}
						<p class="text-ghost-dim text-2xs">No labels</p>
					{/if}
				</div>

				<!-- Attachments -->
				<div class="card">
					<div class="panel-header">
						<span>ATTACHMENTS</span>
						{#if issueAttachments.length > 0}
							<span class="ml-1 text-2xs text-ghost-dim">({issueAttachments.length})</span>
						{/if}
					</div>
					<FileUpload 
						{issueId}
						attachments={issueAttachments}
						onUpload={(attachment) => issueAttachments = [...issueAttachments, attachment]}
						onDelete={(id) => issueAttachments = issueAttachments.filter(a => a.id !== id)}
						uploadedBy={settings.getCurrentUser()}
					/>
				</div>

				<!-- Dependencies -->
				<div class="card">
					<div class="panel-header">
						<Link2 size={10} />
						<span>DEPENDENCIES</span>
						<button 
							class="ml-auto text-cyber hover:text-cyber text-2xs"
							onclick={() => showAddDependency = !showAddDependency}
						>
							+ ADD
						</button>
					</div>

					{#if showAddDependency}
						<div class="mb-2 flex gap-1">
							<input 
								type="number" 
								class="input-sm flex-1" 
								placeholder="Issue ID..."
								bind:value={dependencyIssueId}
								onkeydown={(e) => e.key === 'Enter' && handleAddDependency()}
							/>
							<button 
								class="btn btn-primary text-2xs"
								onclick={handleAddDependency}
							>
								ADD
							</button>
						</div>
					{/if}

					{#if dependencies.blockers.length > 0}
						<div class="mb-2">
							<span class="text-2xs text-blood uppercase">Blocked by</span>
							<div class="space-y-1 mt-1">
								{#each dependencies.blockers as blocker}
									<div class="flex items-center justify-between text-xs p-1 bg-void-200 border border-void-50 group">
										<a 
											href="/projects/{projectId}/issues/{blocker.dependsOnId}"
											class="text-ghost hover:text-cyber truncate flex-1"
										>
											#{blocker.dependsOnId} {blocker.issueTitle}
										</a>
										<span class="badge badge-status-{blocker.issueStatus} text-2xs mx-1">
											{blocker.issueStatus}
										</span>
										<button 
											class="text-ghost-dim hover:text-blood opacity-0 group-hover:opacity-100"
											onclick={() => handleRemoveDependency(blocker.dependsOnId)}
										>
											<X size={10} />
										</button>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					{#if dependencies.blocking.length > 0}
						<div>
							<span class="text-2xs text-warn uppercase">Blocking</span>
							<div class="space-y-1 mt-1">
								{#each dependencies.blocking as blocked}
									<a 
										href="/projects/{projectId}/issues/{blocked.issueId}"
										class="flex items-center text-xs p-1 bg-void-200 border border-void-50 text-ghost hover:text-cyber"
									>
										#{blocked.issueId} {blocked.issueTitle}
									</a>
								{/each}
							</div>
						</div>
					{/if}

					{#if dependencies.blockers.length === 0 && dependencies.blocking.length === 0 && !showAddDependency}
						<p class="text-ghost-dim text-2xs">No dependencies</p>
					{/if}
				</div>

				<!-- Linked Commits -->
				<div class="card">
					<div class="panel-header">
						<GitCommit size={10} />
						<span>COMMITS</span>
						<button class="ml-auto text-cyber hover:text-cyber text-2xs" onclick={() => showLinkCommit = true}>
							+ LINK
						</button>
					</div>
					
					{#if issue.commits.length > 0}
						<div class="space-y-1">
							{#each issue.commits as commit}
								<div class="text-xs p-1.5 bg-void-200 border border-void-50">
									<code class="text-cyber">{commit.hash.substring(0, 7)}</code>
									{#if commit.branch}
										<span class="text-ghost-dim ml-1">{commit.branch}</span>
									{/if}
									{#if commit.title}
										<p class="text-ghost-dim mt-0.5 truncate">{commit.title}</p>
									{/if}
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-ghost-dim text-2xs">No commits linked</p>
					{/if}
				</div>

				<!-- History -->
				<div class="card">
					<div class="panel-header">
						<History size={10} />
						<span>HISTORY</span>
					</div>
					
					{#if issue.history.length > 0}
						<div class="space-y-1 max-h-40 overflow-y-auto">
							{#each issue.history as entry}
								<div class="text-2xs border-l border-void-50 pl-2 py-0.5">
									<p class="text-ghost">
										{#if entry.field === 'created'}
											created
										{:else if entry.field === 'commit'}
											{entry.newValue}
										{:else}
											<span class="text-ghost-dim">{entry.field}:</span>
											{#if entry.oldValue}
												<span class="text-ghost-dim">{entry.oldValue}</span> →
											{/if}
											<span class="text-cyber">{entry.newValue}</span>
										{/if}
									</p>
								<p class="text-ghost-dim">
									{entry.changedBy} • <RelativeTime timestamp={entry.changedAt} />
								</p>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-ghost-dim text-2xs">No history</p>
					{/if}
				</div>

				<!-- Child Issues (for epics) -->
				{#if issue.type === 'epic' && issue.children.length > 0}
					<div class="card">
						<div class="panel-header">
							<Layers size={10} />
							<span>CHILDREN</span>
						</div>
						<div class="space-y-1">
							{#each issue.children as child}
								<a 
									href="/projects/{projectId}/issues/{child.id}"
									class="block p-1.5 bg-void-200 hover:bg-void-50 border border-void-50 hover:border-cyber-dim transition-colors"
								>
									<span class="text-ghost-dim text-2xs">#{child.id}</span>
									<p class="text-xs text-ghost truncate">{child.title}</p>
								</a>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<!-- Edit Issue Modal -->
{#if showEditForm && issue}
	<IssueForm 
		issue={issue}
		projectId={projectId} 
		onsubmit={(data) => handleUpdate(data)} 
		oncancel={() => showEditForm = false} 
	/>
{/if}

<!-- Link Commit Modal -->
{#if showLinkCommit}
	<div class="fixed inset-0 bg-void/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={() => showLinkCommit = false}>
		<div 
			class="bg-void-100 border border-void-50 w-full max-w-sm animate-slide-up"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
		>
			<div class="p-3 border-b border-void-50">
				<h2 class="text-sm text-ghost-bright font-display tracking-wide">LINK COMMIT</h2>
			</div>
			<form onsubmit={(e) => { e.preventDefault(); handleLinkCommit(); }} class="p-3 space-y-2">
				<div>
					<label for="hash" class="label">Hash</label>
					<input id="hash" type="text" class="input font-mono text-xs" placeholder="abc1234..." bind:value={commitHash} required />
				</div>
				<div>
					<label for="branch" class="label">Branch</label>
					<input id="branch" type="text" class="input text-xs" placeholder="main" bind:value={commitBranch} />
				</div>
				<div>
					<label for="title" class="label">Message</label>
					<input id="title" type="text" class="input text-xs" placeholder="Fix the thing" bind:value={commitTitle} />
				</div>
				<div class="flex justify-end gap-2 pt-2">
					<button type="button" class="btn btn-secondary" onclick={() => showLinkCommit = false}>CANCEL</button>
					<button type="submit" class="btn btn-primary">LINK</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Delete Confirmation -->
{#if showDeleteConfirm}
	<div class="fixed inset-0 bg-void/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={() => showDeleteConfirm = false}>
		<div 
			class="bg-void-100 border border-priority-critical/30 w-full max-w-sm p-4 animate-slide-up"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
		>
			<h2 class="text-sm text-priority-critical font-display mb-2">DELETE ISSUE?</h2>
			<p class="text-xs text-ghost-dim mb-4">
				This will permanently delete #{issue?.id} and all comments. Cannot undo.
			</p>
			<div class="flex justify-end gap-2">
				<button class="btn btn-secondary" onclick={() => showDeleteConfirm = false}>CANCEL</button>
				<button class="btn btn-danger" onclick={deleteIssue}>DELETE</button>
			</div>
		</div>
	</div>
{/if}

<!-- Project Picker for Moving Issue -->
{#if showProjectPicker && issue?.project}
	<ProjectPicker
		currentProjectId={projectId}
		currentProjectName={issue.project.name}
		onSelect={handleMoveToProject}
		oncancel={() => showProjectPicker = false}
	/>
{/if}

<!-- Duplicate Issue Modal -->
{#if showDuplicateModal && issue}
	<div class="fixed inset-0 bg-void/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={() => showDuplicateModal = false}>
		<div 
			class="bg-void-100 border border-void-50 w-full max-w-sm p-4 animate-slide-up"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
		>
			<div class="flex items-center gap-2 mb-3">
				<Copy size={14} class="text-cyber" />
				<h2 class="text-sm text-ghost-bright font-display">DUPLICATE ISSUE</h2>
			</div>
			<p class="text-xs text-ghost-dim mb-4">
				Create a copy of <span class="text-ghost">#{issue.id} {issue.title}</span>
			</p>
			<div class="space-y-2">
				<button 
					class="btn btn-primary w-full justify-center"
					onclick={() => handleDuplicate()}
					disabled={isDuplicating}
				>
					{isDuplicating ? 'DUPLICATING...' : 'DUPLICATE IN SAME PROJECT'}
				</button>
				<button 
					class="btn btn-secondary w-full justify-center"
					onclick={() => {
						showDuplicateModal = false;
						showProjectPicker = true;
					}}
					disabled={isDuplicating}
				>
					DUPLICATE TO OTHER PROJECT...
				</button>
			</div>
			<div class="flex justify-end mt-4">
				<button class="btn btn-ghost" onclick={() => showDuplicateModal = false}>CANCEL</button>
			</div>
		</div>
	</div>
{/if}

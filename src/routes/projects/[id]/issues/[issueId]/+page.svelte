<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { ArrowLeft, Edit2, Trash2, GitCommit, History, ExternalLink } from 'lucide-svelte';
	import { Bug, Lightbulb, Wrench, Trash2 as CleanupIcon, ClipboardList, Layers } from 'lucide-svelte';
	import MarkdownContent from '$lib/components/MarkdownContent.svelte';
	import CommentThread from '$lib/components/CommentThread.svelte';
	import IssueForm from '$lib/components/IssueForm.svelte';
	import type { Issue, Project, Comment, Commit } from '$lib/db/schema';
	import { issueTypes, priorities, statuses } from '$lib/db/schema';

	interface IssueDetail extends Issue {
		project: Project;
		comments: Comment[];
		commits: Commit[];
		history: Array<{
			id: number;
			field: string;
			oldValue: string | null;
			newValue: string | null;
			changedBy: string;
			changedAt: string;
		}>;
		children: Issue[];
	}

	let issue = $state<IssueDetail | null>(null);
	let loading = $state(true);
	let showEditForm = $state(false);
	let showDeleteConfirm = $state(false);
	let showLinkCommit = $state(false);
	let commitHash = $state('');
	let commitBranch = $state('');
	let commitTitle = $state('');

	const projectId = $derived(parseInt($page.params.id));
	const issueId = $derived(parseInt($page.params.issueId));

	const typeIcons: Record<string, typeof Bug> = {
		bug: Bug,
		feature: Lightbulb,
		refactor: Wrench,
		cleanup: CleanupIcon,
		task: ClipboardList,
		epic: Layers
	};

	const typeLabels: Record<string, string> = {
		bug: 'Bug',
		feature: 'Feature Request',
		refactor: 'Refactor',
		cleanup: 'Cleanup',
		task: 'Task',
		epic: 'Epic'
	};

	const priorityLabels: Record<string, string> = {
		critical: 'Critical',
		high: 'High',
		medium: 'Medium',
		low: 'Low'
	};

	const statusLabels: Record<string, string> = {
		backlog: 'Backlog',
		todo: 'To Do',
		in_progress: 'In Progress',
		review: 'Review',
		done: 'Done',
		closed: 'Closed'
	};

	onMount(async () => {
		await loadIssue();
		loading = false;
	});

	async function loadIssue() {
		const res = await fetch(`/api/issues/${issueId}`);
		if (res.ok) {
			issue = await res.json();
		} else {
			goto(`/projects/${projectId}`);
		}
	}

	async function handleUpdate(data: Partial<Issue>) {
		const res = await fetch(`/api/issues/${issueId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});

		if (res.ok) {
			await loadIssue();
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
		const res = await fetch(`/api/issues/${issueId}/comments`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ content, author: 'You' })
		});

		if (res.ok) {
			await loadIssue();
		}
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
			await loadIssue();
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

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>{issue?.title ?? 'Issue'} | BugTracker</title>
</svelte:head>

<div class="p-8 max-w-6xl mx-auto">
	{#if loading}
		<div class="flex items-center justify-center py-20">
			<div class="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full"></div>
		</div>
	{:else if issue}
		<!-- Header -->
		<div class="flex items-start gap-4 mb-6">
			<a href="/projects/{projectId}" class="btn btn-ghost p-2 mt-1">
				<ArrowLeft size={20} />
			</a>
			
			<div class="flex-1">
				<div class="flex items-center gap-3 mb-2">
					<span class="text-surface-500">#{issue.id}</span>
					<span class="badge badge-type flex items-center gap-1">
						<svelte:component this={typeIcons[issue.type] || Bug} size={12} />
						{typeLabels[issue.type]}
					</span>
					<span class="badge badge-priority-{issue.priority}">{priorityLabels[issue.priority]}</span>
					<span class="badge badge-status-{issue.status}">{statusLabels[issue.status]}</span>
				</div>
				<h1 class="text-2xl font-display font-bold text-surface-100">{issue.title}</h1>
				<p class="text-sm text-surface-500 mt-1">
					Created {formatDate(issue.createdAt)}
					{#if issue.assignee}
						<span class="mx-2">•</span>
						Assigned to <span class="text-surface-300">{issue.assignee}</span>
					{/if}
				</p>
			</div>

			<div class="flex items-center gap-2">
				<button class="btn btn-secondary" onclick={() => showEditForm = true}>
					<Edit2 size={16} />
					Edit
				</button>
				<button class="btn btn-ghost text-surface-400 hover:text-red-400" onclick={() => showDeleteConfirm = true}>
					<Trash2 size={16} />
				</button>
			</div>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Main Content -->
			<div class="lg:col-span-2 space-y-6">
				<!-- Description -->
				<div class="card">
					<h2 class="font-semibold text-surface-200 mb-4">Description</h2>
					{#if issue.description}
						<MarkdownContent content={issue.description} />
					{:else}
						<p class="text-surface-500 italic">No description provided</p>
					{/if}
				</div>

				<!-- Comments -->
				<div class="card">
					<CommentThread comments={issue.comments} onAddComment={handleAddComment} />
				</div>
			</div>

			<!-- Sidebar -->
			<div class="space-y-4">
				<!-- Quick Actions -->
				<div class="card space-y-4">
					<h3 class="font-medium text-surface-200">Status</h3>
					<select class="input" value={issue.status} onchange={handleStatusChange}>
						{#each statuses as s}
							<option value={s}>{statusLabels[s]}</option>
						{/each}
					</select>

					<h3 class="font-medium text-surface-200">Priority</h3>
					<select class="input" value={issue.priority} onchange={handlePriorityChange}>
						{#each priorities as p}
							<option value={p}>{priorityLabels[p]}</option>
						{/each}
					</select>
				</div>

				<!-- Linked Commits -->
				<div class="card">
					<div class="flex items-center justify-between mb-3">
						<h3 class="font-medium text-surface-200 flex items-center gap-2">
							<GitCommit size={16} />
							Commits
						</h3>
						<button class="btn btn-ghost text-sm p-1" onclick={() => showLinkCommit = true}>
							Link
						</button>
					</div>
					
					{#if issue.commits.length > 0}
						<div class="space-y-2">
							{#each issue.commits as commit}
								<div class="text-sm p-2 bg-surface-800 rounded-lg">
									<code class="text-accent">{commit.hash.substring(0, 7)}</code>
									{#if commit.branch}
										<span class="text-surface-500 ml-2">{commit.branch}</span>
									{/if}
									{#if commit.title}
										<p class="text-surface-400 mt-1 truncate">{commit.title}</p>
									{/if}
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-surface-500 text-sm">No commits linked</p>
					{/if}
				</div>

				<!-- History -->
				<div class="card">
					<h3 class="font-medium text-surface-200 flex items-center gap-2 mb-3">
						<History size={16} />
						History
					</h3>
					
					{#if issue.history.length > 0}
						<div class="space-y-2 max-h-64 overflow-y-auto">
							{#each issue.history as entry}
								<div class="text-sm border-l-2 border-surface-700 pl-3 py-1">
									<p class="text-surface-300">
										{#if entry.field === 'created'}
											Issue created
										{:else if entry.field === 'commit'}
											{entry.newValue}
										{:else}
											<span class="capitalize">{entry.field}</span> changed
											{#if entry.oldValue}
												from <span class="text-surface-400">{entry.oldValue}</span>
											{/if}
											to <span class="text-accent">{entry.newValue}</span>
										{/if}
									</p>
									<p class="text-xs text-surface-500 mt-0.5">
										{entry.changedBy} • {formatDate(entry.changedAt)}
									</p>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-surface-500 text-sm">No history yet</p>
					{/if}
				</div>

				<!-- Child Issues (for epics) -->
				{#if issue.type === 'epic' && issue.children.length > 0}
					<div class="card">
						<h3 class="font-medium text-surface-200 flex items-center gap-2 mb-3">
							<Layers size={16} />
							Child Issues
						</h3>
						<div class="space-y-2">
							{#each issue.children as child}
								<a 
									href="/projects/{projectId}/issues/{child.id}"
									class="block p-2 bg-surface-800 rounded-lg hover:bg-surface-700 transition-colors"
								>
									<span class="text-surface-500 text-xs">#{child.id}</span>
									<p class="text-sm text-surface-200 truncate">{child.title}</p>
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
	<div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={() => showLinkCommit = false}>
		<div 
			class="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md p-6 animate-slide-up"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
		>
			<h2 class="text-xl font-semibold text-surface-100 mb-4">Link Commit</h2>
			<form onsubmit={(e) => { e.preventDefault(); handleLinkCommit(); }} class="space-y-4">
				<div>
					<label for="hash" class="label">Commit Hash</label>
					<input id="hash" type="text" class="input font-mono" placeholder="abc1234..." bind:value={commitHash} required />
				</div>
				<div>
					<label for="branch" class="label">Branch (optional)</label>
					<input id="branch" type="text" class="input" placeholder="main" bind:value={commitBranch} />
				</div>
				<div>
					<label for="title" class="label">Commit Message (optional)</label>
					<input id="title" type="text" class="input" placeholder="Fix the thing" bind:value={commitTitle} />
				</div>
				<div class="flex justify-end gap-3 pt-2">
					<button type="button" class="btn btn-secondary" onclick={() => showLinkCommit = false}>
						Cancel
					</button>
					<button type="submit" class="btn btn-primary">
						Link Commit
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Delete Confirmation -->
{#if showDeleteConfirm}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={() => showDeleteConfirm = false}>
		<div 
			class="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md p-6 animate-slide-up"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
		>
			<h2 class="text-xl font-semibold text-surface-100 mb-2">Delete Issue?</h2>
			<p class="text-surface-400 mb-6">
				This will permanently delete this issue and all its comments. This action cannot be undone.
			</p>
			<div class="flex justify-end gap-3">
				<button class="btn btn-secondary" onclick={() => showDeleteConfirm = false}>
					Cancel
				</button>
				<button class="btn bg-red-600 hover:bg-red-500 text-white" onclick={deleteIssue}>
					Delete Issue
				</button>
			</div>
		</div>
	</div>
{/if}

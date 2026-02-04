<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Plus, ArrowLeft, Trash2, FolderOpen } from 'lucide-svelte';
	import { issues, currentProject, viewMode, filters } from '$lib/stores/issues';
	import KanbanBoard from '$lib/components/KanbanBoard.svelte';
	import ListView from '$lib/components/ListView.svelte';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import IssueForm from '$lib/components/IssueForm.svelte';
	import type { Project, Issue, NewIssue } from '$lib/db/schema';

	let project = $state<(Project & { issueCount?: number }) | null>(null);
	let loading = $state(true);
	let showNewIssue = $state(false);
	let showDeleteConfirm = $state(false);

	const projectId = $derived(parseInt($page.params.id));

	onMount(async () => {
		await loadProject();
		await loadIssues();
		loading = false;
	});

	async function loadProject() {
		const res = await fetch(`/api/projects/${projectId}`);
		if (res.ok) {
			project = await res.json();
			currentProject.set(project);
		} else {
			goto('/projects');
		}
	}

	async function loadIssues() {
		const res = await fetch(`/api/issues?projectId=${projectId}`);
		if (res.ok) {
			const data = await res.json();
			issues.set(data);
		}
	}

	async function handleCreateIssue(data: NewIssue) {
		const res = await fetch('/api/issues', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});

		if (res.ok) {
			const newIssue = await res.json();
			issues.update(list => [newIssue, ...list]);
			showNewIssue = false;
		}
	}

	async function handleUpdateStatus(issueId: number, newStatus: string) {
		const res = await fetch(`/api/issues/${issueId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ status: newStatus })
		});

		if (res.ok) {
			const updated = await res.json();
			issues.update(list => list.map(issue => issue.id === issueId ? updated : issue));
		}
	}

	async function deleteProject() {
		const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
		if (res.ok) goto('/projects');
	}

	$effect(() => {
		return () => {
			filters.set({ type: null, priority: null, status: null, search: '' });
		};
	});
</script>

<svelte:head>
	<title>{project?.name ?? 'Project'} // BugTracker</title>
</svelte:head>

<div class="p-6">
	{#if loading}
		<div class="flex items-center gap-2 text-ghost-dim text-sm py-8">
			<span class="animate-pulse">▋</span>
			<span>Loading...</span>
		</div>
	{:else if project}
		<!-- Header -->
		<div class="flex items-start justify-between mb-3">
			<div class="flex items-center gap-3">
				<a href="/projects" class="btn btn-ghost p-1">
					<ArrowLeft size={14} />
				</a>
				<div class="w-1 h-8" style="background-color: {project.color}"></div>
				<div>
					<div class="flex items-center gap-2 text-ghost-dim text-xs mb-1">
						<span>PROJ://</span>
						<span class="text-cyber">{project.name.toUpperCase()}</span>
					</div>
					<div class="text-xs text-ghost-dim font-mono">{project.path}</div>
				</div>
			</div>
			
			<div class="flex items-center gap-1">
				<button class="btn btn-primary" onclick={() => showNewIssue = true}>
					<Plus size={12} />
					NEW
				</button>
				<button 
					class="btn btn-ghost text-ghost-dim hover:text-priority-critical" 
					onclick={() => showDeleteConfirm = true}
					title="Delete project"
				>
					<Trash2 size={12} />
				</button>
			</div>
		</div>

		<!-- Filter Bar -->
		<div class="mb-3">
			<FilterBar />
		</div>

		<!-- View -->
		{#if $viewMode === 'kanban'}
			<KanbanBoard {projectId} onUpdateStatus={handleUpdateStatus} />
		{:else}
			<ListView {projectId} />
		{/if}
	{/if}
</div>

<!-- New Issue Modal -->
{#if showNewIssue && project}
	<IssueForm 
		projectId={project.id} 
		onsubmit={handleCreateIssue} 
		oncancel={() => showNewIssue = false} 
	/>
{/if}

<!-- Delete Confirmation -->
{#if showDeleteConfirm}
	<div class="fixed inset-0 bg-void/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={() => showDeleteConfirm = false}>
		<div 
			class="bg-void-100 border border-priority-critical/30 w-full max-w-sm p-4 animate-slide-up"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
		>
			<h2 class="text-sm text-priority-critical font-display mb-2">DELETE PROJECT?</h2>
			<p class="text-xs text-ghost-dim mb-4">
				This will permanently delete "{project?.name}" and all associated issues.
			</p>
			<div class="flex justify-end gap-2">
				<button class="btn btn-secondary" onclick={() => showDeleteConfirm = false}>CANCEL</button>
				<button class="btn btn-danger" onclick={deleteProject}>DELETE</button>
			</div>
		</div>
	</div>
{/if}

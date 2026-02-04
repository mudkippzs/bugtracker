<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Plus, Settings, ArrowLeft, Trash2 } from 'lucide-svelte';
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
		if (res.ok) {
			goto('/projects');
		}
	}

	// Reset filters when leaving
	$effect(() => {
		return () => {
			filters.set({ type: null, priority: null, status: null, search: '' });
		};
	});
</script>

<svelte:head>
	<title>{project?.name ?? 'Project'} | BugTracker</title>
</svelte:head>

<div class="p-8 max-w-full mx-auto">
	{#if loading}
		<div class="flex items-center justify-center py-20">
			<div class="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full"></div>
		</div>
	{:else if project}
		<!-- Header -->
		<div class="flex items-start justify-between mb-6">
			<div class="flex items-center gap-4">
				<a href="/projects" class="btn btn-ghost p-2">
					<ArrowLeft size={20} />
				</a>
				<div 
					class="w-12 h-12 rounded-xl flex items-center justify-center"
					style="background-color: {project.color}20; color: {project.color}"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
					</svg>
				</div>
				<div>
					<h1 class="text-2xl font-display font-bold text-surface-100">{project.name}</h1>
					<p class="text-sm text-surface-500 font-mono">{project.path}</p>
				</div>
			</div>
			
			<div class="flex items-center gap-2">
				<button class="btn btn-primary" onclick={() => showNewIssue = true}>
					<Plus size={18} />
					New Issue
				</button>
				<button 
					class="btn btn-ghost text-surface-400 hover:text-red-400" 
					onclick={() => showDeleteConfirm = true}
					title="Delete project"
				>
					<Trash2 size={18} />
				</button>
			</div>
		</div>

		<!-- Filter Bar -->
		<div class="mb-6">
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
	<div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={() => showDeleteConfirm = false}>
		<div 
			class="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md p-6 animate-slide-up"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
		>
			<h2 class="text-xl font-semibold text-surface-100 mb-2">Delete Project?</h2>
			<p class="text-surface-400 mb-6">
				This will permanently delete "{project?.name}" and all its issues. This action cannot be undone.
			</p>
			<div class="flex justify-end gap-3">
				<button class="btn btn-secondary" onclick={() => showDeleteConfirm = false}>
					Cancel
				</button>
				<button class="btn bg-red-600 hover:bg-red-500 text-white" onclick={deleteProject}>
					Delete Project
				</button>
			</div>
		</div>
	</div>
{/if}

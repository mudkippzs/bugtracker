<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Plus, ArrowLeft, Trash2, FolderOpen, Download, Upload } from 'lucide-svelte';
	import { issues, currentProject, viewMode, filters, getIssues, clearFilters } from '$lib/stores/issues';
	import { selectedIssues, hasIssueSelection } from '$lib/stores/selection';
	import KanbanBoard from '$lib/components/KanbanBoard.svelte';
	import ListView from '$lib/components/ListView.svelte';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import IssueForm from '$lib/components/IssueForm.svelte';
	import SelectionToolbar from '$lib/components/SelectionToolbar.svelte';
	import type { Project, NewIssue } from '$lib/db/schema';

	let project = $state<(Project & { issueCount?: number }) | null>(null);
	let loading = $state(true);
	let showNewIssue = $state(false);
	let showDeleteConfirm = $state(false);
	let showImport = $state(false);
	let importFile = $state<File | null>(null);
	let importing = $state(false);
	let importResult = $state<{ imported: number; errors: string[] } | null>(null);

	const projectId = $derived(parseInt($page.params.id));

	onMount(async () => {
		await loadProject();
		await getIssues(projectId);
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

	async function handleCreateIssue(data: NewIssue) {
		const res = await fetch('/api/issues', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});

		if (res.ok) {
			showNewIssue = false;
		}
	}

	async function handleUpdateStatus(issueId: number, newStatus: string) {
		await fetch(`/api/issues/${issueId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ status: newStatus })
		});
	}

	async function handleBulkStatusChange(issueIds: number[], status: string) {
		for (const id of issueIds) {
			await fetch(`/api/issues/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status })
			});
		}
		selectedIssues.clear();
	}

	async function handleBulkDelete(issueIds: number[]) {
		for (const id of issueIds) {
			await fetch(`/api/issues/${id}`, { method: 'DELETE' });
		}
		selectedIssues.clear();
	}

	async function handleBulkMove(targetProjectId: number) {
		const issueIds = Array.from($selectedIssues);
		for (const id of issueIds) {
			await fetch(`/api/issues/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ projectId: targetProjectId })
			});
		}
		selectedIssues.clear();
		// Refresh issues for current project
		await getIssues(projectId);
	}

	function handleExport() {
		window.location.href = `/api/issues/export?projectId=${projectId}&includeComments=true`;
	}

	async function handleImport() {
		if (!importFile) return;
		
		importing = true;
		importResult = null;

		try {
			const text = await importFile.text();
			const data = JSON.parse(text);
			
			const res = await fetch('/api/issues/import', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					projectId,
					issues: data.issues || data
				})
			});

			if (res.ok) {
				const result = await res.json();
				importResult = result;
				await getIssues(projectId);
			}
		} catch (error) {
			importResult = { imported: 0, errors: ['Invalid JSON file'] };
		}

		importing = false;
	}

	async function deleteProject() {
		const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
		if (res.ok) goto('/projects');
	}

	$effect(() => {
		return () => {
			clearFilters();
			selectedIssues.clear();
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
				<button class="btn btn-secondary" onclick={handleExport} title="Export issues">
					<Download size={12} />
				</button>
				<button class="btn btn-secondary" onclick={() => showImport = true} title="Import issues">
					<Upload size={12} />
				</button>
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

		<!-- Selection Toolbar -->
		<SelectionToolbar 
			onBulkStatusChange={(status) => handleBulkStatusChange(Array.from($selectedIssues), status)}
			onBulkDelete={() => handleBulkDelete(Array.from($selectedIssues))}
			onBulkMove={handleBulkMove}
		/>

		<!-- Filter Bar -->
		<div class="mb-3">
			<FilterBar />
		</div>

		<!-- Hint for multi-select -->
		{#if !$hasIssueSelection}
			<div class="text-2xs text-ghost-dim mb-2">
				Shift+click to multi-select • Right-click for menu • Ctrl+click to toggle
			</div>
		{/if}

		<!-- View -->
		{#if $viewMode === 'kanban'}
			<KanbanBoard 
				{projectId} 
				onUpdateStatus={handleUpdateStatus}
				onBulkStatusChange={handleBulkStatusChange}
				onBulkDelete={handleBulkDelete}
			/>
		{:else}
			<ListView 
				{projectId}
				onBulkStatusChange={handleBulkStatusChange}
				onBulkDelete={handleBulkDelete}
			/>
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

<!-- Import Modal -->
{#if showImport}
	<div class="fixed inset-0 bg-void/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={() => { showImport = false; importResult = null; importFile = null; }}>
		<div 
			class="bg-void-100 border border-void-50 w-full max-w-md p-4 animate-slide-up"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
		>
			<h2 class="text-sm text-cyber font-display mb-3">IMPORT ISSUES</h2>
			
			{#if importResult}
				<div class="mb-4">
					<div class="text-xs text-ghost mb-2">
						<span class="text-emerald">✓</span> Imported {importResult.imported} issue{importResult.imported !== 1 ? 's' : ''}
					</div>
					{#if importResult.errors && importResult.errors.length > 0}
						<div class="text-xs text-priority-critical">
							{#each importResult.errors as error}
								<p>• {error}</p>
							{/each}
						</div>
					{/if}
				</div>
				<div class="flex justify-end">
					<button class="btn btn-primary" onclick={() => { showImport = false; importResult = null; importFile = null; }}>DONE</button>
				</div>
			{:else}
				<p class="text-xs text-ghost-dim mb-3">
					Upload a JSON file exported from BugTracker to import issues into this project.
				</p>
				
				<div class="mb-4">
					<label class="block text-2xs text-ghost-dim mb-1">SELECT FILE</label>
					<input 
						type="file" 
						accept=".json"
						class="w-full text-xs text-ghost bg-void border border-void-50 p-2 file:mr-3 file:py-1 file:px-2 file:border-0 file:text-xs file:bg-cyber/20 file:text-cyber"
						onchange={(e) => importFile = e.currentTarget.files?.[0] || null}
					/>
				</div>
				
				<div class="flex justify-end gap-2">
					<button class="btn btn-secondary" onclick={() => { showImport = false; importFile = null; }}>CANCEL</button>
					<button 
						class="btn btn-primary" 
						onclick={handleImport}
						disabled={!importFile || importing}
					>
						{importing ? 'IMPORTING...' : 'IMPORT'}
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

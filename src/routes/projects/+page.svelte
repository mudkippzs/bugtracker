<script lang="ts">
	import { onMount } from 'svelte';
	import { Plus, FolderOpen, Search, Folder, Check, ChevronRight, X, Trash2, Archive, Tag } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { projects, fetchProjects } from '$lib/stores/issues';
	import type { Project } from '$lib/db/schema';

	const PROJECT_ROOT = '/home/dev/Code/';

	interface DiscoveredProject {
		name: string;
		path: string;
		isTracked: boolean;
	}

	let discoveredProjects = $state<DiscoveredProject[]>([]);
	let loading = $state(true);
	let showAddModal = $state(false);
	let searchQuery = $state('');

	let newProjectName = $state('');
	let newProjectPath = $state('');
	let newProjectDescription = $state('');
	let newProjectColor = $state('#00f0ff');

	// Multi-select state
	let selectedIds = $state<Set<number>>(new Set());
	let lastSelectedId = $state<number | null>(null);
	let contextMenu = $state<{ x: number; y: number; projectId: number } | null>(null);

	// Computed
	const hasSelection = $derived(selectedIds.size > 0);
	const selectedCount = $derived(selectedIds.size);

	// Helper to strip the PROJECT_ROOT prefix from a path
	function toRelativePath(fullPath: string): string {
		if (fullPath.startsWith(PROJECT_ROOT)) {
			return fullPath.slice(PROJECT_ROOT.length);
		}
		return fullPath;
	}

	onMount(async () => {
		await Promise.all([fetchProjects(), discoverProjects()]);
		loading = false;
	});

	async function discoverProjects() {
		const res = await fetch('/api/discover');
		if (res.ok) {
			const data = await res.json();
			discoveredProjects = data.projects;
		}
	}

	async function addProject() {
		if (!newProjectName || !newProjectPath) return;

		const res = await fetch('/api/projects', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: newProjectName,
				path: newProjectPath,
				description: newProjectDescription,
				color: newProjectColor
			})
		});

		if (res.ok) {
			await discoverProjects();
			showAddModal = false;
			resetForm();
		}
	}

	async function quickAddProject(proj: DiscoveredProject) {
		const res = await fetch('/api/projects', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: proj.name,
				path: proj.path,
				color: getRandomColor()
			})
		});

		if (res.ok) {
			await discoverProjects();
		}
	}

	async function untrackProject(projectId: number, e?: Event) {
		e?.stopPropagation();
		const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
		if (res.ok) {
			selectedIds.delete(projectId);
			selectedIds = new Set(selectedIds);
			await discoverProjects();
		}
	}

	async function untrackSelected() {
		const ids = Array.from(selectedIds);
		for (const id of ids) {
			await fetch(`/api/projects/${id}`, { method: 'DELETE' });
		}
		selectedIds = new Set();
		await discoverProjects();
	}

	function resetForm() {
		newProjectName = '';
		newProjectPath = '';
		newProjectDescription = '';
		newProjectColor = '#00f0ff';
	}

	function selectDiscoveredProject(proj: DiscoveredProject) {
		newProjectName = proj.name;
		newProjectPath = toRelativePath(proj.path);
	}

	function getRandomColor() {
		const colors = ['#00f0ff', '#00ff9f', '#ff6b35', '#a855f7', '#f0c020', '#ff2a6d'];
		return colors[Math.floor(Math.random() * colors.length)];
	}

	// Multi-select handlers
	function handleProjectClick(e: MouseEvent, project: Project & { issueCount?: number }) {
		if (e.shiftKey && lastSelectedId !== null) {
			// Shift+click: select range
			const projectList = filteredProjects;
			const lastIndex = projectList.findIndex(p => p.id === lastSelectedId);
			const currentIndex = projectList.findIndex(p => p.id === project.id);
			
			if (lastIndex !== -1 && currentIndex !== -1) {
				const start = Math.min(lastIndex, currentIndex);
				const end = Math.max(lastIndex, currentIndex);
				
				for (let i = start; i <= end; i++) {
					selectedIds.add(projectList[i].id);
				}
				selectedIds = new Set(selectedIds);
			}
		} else if (e.ctrlKey || e.metaKey) {
			// Ctrl/Cmd+click: toggle single selection
			if (selectedIds.has(project.id)) {
				selectedIds.delete(project.id);
			} else {
				selectedIds.add(project.id);
			}
			selectedIds = new Set(selectedIds);
			lastSelectedId = project.id;
		} else {
			// Regular click: navigate (but only if no selection)
			if (selectedIds.size === 0) {
				goto(`/projects/${project.id}`);
			} else {
				// If there's a selection, toggle this item
				if (selectedIds.has(project.id)) {
					selectedIds.delete(project.id);
				} else {
					selectedIds.add(project.id);
				}
				selectedIds = new Set(selectedIds);
				lastSelectedId = project.id;
			}
		}
	}

	function handleContextMenu(e: MouseEvent, project: Project & { issueCount?: number }) {
		e.preventDefault();
		contextMenu = { x: e.clientX, y: e.clientY, projectId: project.id };
		
		// Add to selection if not already selected
		if (!selectedIds.has(project.id)) {
			selectedIds.add(project.id);
			selectedIds = new Set(selectedIds);
		}
	}

	function closeContextMenu() {
		contextMenu = null;
	}

	function clearSelection() {
		selectedIds = new Set();
		lastSelectedId = null;
	}

	function selectAll() {
		for (const p of filteredProjects) {
			selectedIds.add(p.id);
		}
		selectedIds = new Set(selectedIds);
	}

	// Keyboard handlers
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			clearSelection();
			closeContextMenu();
		}
		if (e.key === 'a' && (e.ctrlKey || e.metaKey) && filteredProjects.length > 0) {
			e.preventDefault();
			selectAll();
		}
		if (e.key === 'Delete' && hasSelection) {
			untrackSelected();
		}
	}

	let filteredProjects = $derived(
		$projects.filter(p => 
			p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			p.path.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	let untrackedProjects = $derived(
		discoveredProjects.filter(p => !p.isTracked)
	);
</script>

<svelte:head>
	<title>Projects // BugTracker</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} onclick={closeContextMenu} />

<div class="p-6">
	<!-- Header -->
	<div class="flex items-center justify-between mb-4">
		<div>
			<div class="flex items-center gap-2 text-ghost-dim text-xs mb-1">
				<span>SYS://</span>
				<span class="text-cyber">PROJECTS</span>
			</div>
			<h1 class="text-xl text-ghost-bright font-display tracking-wide">PROJECT INDEX</h1>
		</div>
		<button class="btn btn-primary" onclick={() => showAddModal = true}>
			<Plus size={12} />
			NEW
		</button>
	</div>

	{#if loading}
		<div class="flex items-center gap-2 text-ghost-dim text-sm py-8">
			<span class="animate-pulse">▋</span>
			<span>Loading...</span>
		</div>
	{:else}
		<!-- Selection Toolbar -->
		{#if hasSelection}
			<div class="mb-3 p-2 bg-cyber-muted border border-cyber-dim flex items-center gap-3 animate-slide-up">
				<span class="text-xs text-cyber font-medium">{selectedCount} selected</span>
				<div class="flex-1"></div>
				<button 
					class="btn btn-ghost text-xs text-ghost-dim hover:text-priority-critical"
					onclick={untrackSelected}
				>
					<Trash2 size={12} />
					UNTRACK
				</button>
				<button 
					class="btn btn-ghost text-xs"
					onclick={clearSelection}
				>
					<X size={12} />
					CLEAR
				</button>
			</div>
		{/if}

		<!-- Search -->
		{#if $projects.length > 0}
			<div class="mb-3 flex items-center gap-2">
				<div class="relative flex-1 max-w-xs">
					<Search size={12} class="absolute left-2 top-1/2 -translate-y-1/2 text-ghost-dim" />
					<input type="text" class="input-sm pl-7 w-full" placeholder="Filter projects..." bind:value={searchQuery} />
				</div>
				<span class="text-2xs text-ghost-dim">
					Shift+click to multi-select • Right-click for menu
				</span>
			</div>
		{/if}

		<!-- Projects List -->
		{#if filteredProjects.length > 0}
			<div class="card mb-4">
				<div class="panel-header">
					<FolderOpen size={12} />
					<span>TRACKED ({filteredProjects.length})</span>
				</div>
				<div class="space-y-0.5">
					{#each filteredProjects as project}
						{@const isSelected = selectedIds.has(project.id)}
						<div 
							class="w-full p-2 flex items-center gap-2 text-left transition-colors border group cursor-pointer select-none
								{isSelected ? 'bg-cyber-muted border-cyber-dim' : 'hover:bg-void-50 border-transparent hover:border-void-50'}"
							onclick={(e) => handleProjectClick(e, project)}
							oncontextmenu={(e) => handleContextMenu(e, project)}
							role="button"
							tabindex="0"
						>
							<!-- Selection checkbox -->
							<div 
								class="w-4 h-4 border flex items-center justify-center transition-colors flex-shrink-0
									{isSelected ? 'bg-cyber border-cyber' : 'border-ghost-dim/30 group-hover:border-ghost-dim'}"
							>
								{#if isSelected}
									<Check size={10} class="text-void" />
								{/if}
							</div>
							
							<div class="w-1 h-8 flex-shrink-0" style="background-color: {project.color}"></div>
							<div class="flex-1 min-w-0">
								<div class="text-sm text-ghost-bright">{project.name}</div>
								<div class="text-2xs text-ghost-dim font-mono truncate">{project.path}</div>
							</div>
							<div class="text-xs text-ghost-dim">{project.issueCount ?? 0}</div>
							
							<!-- Quick untrack button -->
							<button 
								class="p-1 text-ghost-dim hover:text-priority-critical opacity-0 group-hover:opacity-100 transition-all"
								onclick={(e) => untrackProject(project.id, e)}
								title="Untrack project"
							>
								<X size={14} />
							</button>
							
							<ChevronRight size={12} class="text-ghost-dim opacity-0 group-hover:opacity-100 flex-shrink-0" />
						</div>
					{/each}
				</div>
			</div>
		{:else if $projects.length === 0}
			<div class="card text-center py-8 mb-4">
				<FolderOpen size={32} class="mx-auto text-ghost-dim mb-2" />
				<p class="text-ghost-dim text-sm mb-3">No projects tracked</p>
				<button class="btn btn-primary" onclick={() => showAddModal = true}>
					<Plus size={12} /> INIT PROJECT
				</button>
			</div>
		{/if}

		<!-- Discovered Projects -->
		{#if untrackedProjects.length > 0}
			<div class="card">
				<div class="panel-header">
					<Folder size={12} />
					<span>DISCOVERED ({untrackedProjects.length})</span>
				</div>
				<div class="grid grid-cols-4 gap-1">
					{#each untrackedProjects.slice(0, 80) as proj}
						<button
							class="p-1.5 text-left text-xs text-ghost-dim hover:text-ghost hover:bg-void-50 border border-transparent hover:border-void-50 truncate transition-colors flex items-center gap-1.5"
							onclick={() => quickAddProject(proj)}
							title={proj.path}
						>
							<Plus size={10} class="flex-shrink-0 text-cyber opacity-50" />
							<span class="truncate">{proj.name}</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>

<!-- Context Menu -->
{#if contextMenu}
	<div 
		class="fixed bg-void-100 border border-void-50 shadow-lg z-50 min-w-[160px] animate-fade-in"
		style="left: {contextMenu.x}px; top: {contextMenu.y}px;"
		onclick={(e) => e.stopPropagation()}
	>
		<button 
			class="w-full px-3 py-2 text-left text-xs text-ghost hover:bg-void-50 flex items-center gap-2"
			onclick={() => { goto(`/projects/${contextMenu?.projectId}`); closeContextMenu(); }}
		>
			<FolderOpen size={12} />
			Open Project
		</button>
		<div class="border-t border-void-50"></div>
		<button 
			class="w-full px-3 py-2 text-left text-xs text-ghost hover:bg-void-50 flex items-center gap-2"
			onclick={() => { selectAll(); closeContextMenu(); }}
		>
			<Check size={12} />
			Select All
		</button>
		<button 
			class="w-full px-3 py-2 text-left text-xs text-ghost hover:bg-void-50 flex items-center gap-2"
			onclick={() => { clearSelection(); closeContextMenu(); }}
		>
			<X size={12} />
			Clear Selection
		</button>
		<div class="border-t border-void-50"></div>
		<button 
			class="w-full px-3 py-2 text-left text-xs text-priority-critical hover:bg-priority-critical/10 flex items-center gap-2"
			onclick={() => { untrackSelected(); closeContextMenu(); }}
		>
			<Trash2 size={12} />
			Untrack Selected ({selectedCount})
		</button>
	</div>
{/if}

<!-- Add Project Modal -->
{#if showAddModal}
	<div class="fixed inset-0 bg-void/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={() => showAddModal = false}>
		<div 
			class="bg-void-100 border border-void-50 w-full max-w-md animate-slide-up"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
		>
			<div class="p-3 border-b border-void-50">
				<h2 class="text-sm text-ghost-bright font-display tracking-wide">NEW PROJECT</h2>
			</div>

			<form onsubmit={(e) => { e.preventDefault(); addProject(); }} class="p-3 space-y-3">
				{#if untrackedProjects.length > 0}
					<div>
						<label class="label">Quick Select</label>
						<div class="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
							{#each untrackedProjects.slice(0, 20) as proj}
								{@const isSelected = newProjectPath === toRelativePath(proj.path)}
								<button
									type="button"
									class="px-2 py-0.5 text-2xs border transition-colors {isSelected ? 'bg-cyber-muted border-cyber-dim text-cyber' : 'bg-void-200 border-void-50 text-ghost-dim'}"
									onclick={() => selectDiscoveredProject(proj)}
								>
									{proj.name}
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<div>
					<label for="name" class="label">Name</label>
					<input id="name" type="text" class="input" placeholder="project-name" bind:value={newProjectName} required />
				</div>

				<div>
					<label for="path" class="label">Path <span class="text-ghost-dim font-normal">(relative to /home/dev/Code/)</span></label>
					<div class="flex items-center gap-0">
						<span class="bg-void-200 border border-void-50 border-r-0 px-2 py-2 text-xs text-ghost-dim">/home/dev/Code/</span>
						<input 
							id="path" 
							type="text" 
							class="input font-mono text-sm flex-1" 
							style="border-left: none;"
							placeholder="my-project" 
							bind:value={newProjectPath} 
							required 
						/>
					</div>
					<p class="text-2xs text-ghost-dim mt-1">Directory will be created if it doesn't exist</p>
				</div>

				<div>
					<label class="label">Color</label>
					<div class="flex gap-1">
						{#each ['#00f0ff', '#00ff9f', '#ff6b35', '#a855f7', '#f0c020', '#ff2a6d', '#00a0ff', '#ffffff'] as color}
							<button
								type="button"
								class="w-6 h-6 border transition-all"
								class:border-ghost-bright={newProjectColor === color}
								class:border-void-50={newProjectColor !== color}
								class:scale-110={newProjectColor === color}
								style="background-color: {color}"
								onclick={() => newProjectColor = color}
							>
								{#if newProjectColor === color}
									<Check size={12} class="mx-auto text-void" />
								{/if}
							</button>
						{/each}
					</div>
				</div>

				<div class="flex justify-end gap-2 pt-2">
					<button type="button" class="btn btn-secondary" onclick={() => showAddModal = false}>CANCEL</button>
					<button type="submit" class="btn btn-primary">CREATE</button>
				</div>
			</form>
		</div>
	</div>
{/if}

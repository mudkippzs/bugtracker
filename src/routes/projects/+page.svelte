<script lang="ts">
	import { onMount } from 'svelte';
	import { Plus, FolderOpen, Search, Folder, Check, ChevronRight } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { projects, fetchProjects } from '$lib/stores/issues';

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

		// Path will be resolved relative to PROJECT_ROOT on the backend
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
			// SSE will update the store, but also refresh discovered
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
				path: proj.path, // Full path for discovered projects
				color: getRandomColor()
			})
		});

		if (res.ok) {
			// SSE will update the store, but also refresh discovered
			await discoverProjects();
		}
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
		<!-- Search -->
		{#if $projects.length > 0}
			<div class="mb-3 relative max-w-xs">
				<Search size={12} class="absolute left-2 top-1/2 -translate-y-1/2 text-ghost-dim" />
				<input type="text" class="input-sm pl-7" placeholder="Filter projects..." bind:value={searchQuery} />
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
						<button 
							class="w-full p-2 flex items-center gap-2 text-left hover:bg-void-50 transition-colors border border-transparent hover:border-void-50 group"
							onclick={() => goto(`/projects/${project.id}`)}
						>
							<div class="w-1 h-8" style="background-color: {project.color}"></div>
							<div class="flex-1 min-w-0">
								<div class="text-sm text-ghost-bright">{project.name}</div>
								<div class="text-2xs text-ghost-dim font-mono truncate">{project.path}</div>
							</div>
							<div class="text-xs text-ghost-dim">{project.issueCount ?? 0}</div>
							<ChevronRight size={12} class="text-ghost-dim opacity-0 group-hover:opacity-100" />
						</button>
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

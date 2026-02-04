<script lang="ts">
	import { onMount } from 'svelte';
	import { Plus, FolderOpen, Search, Folder, Check } from 'lucide-svelte';
	import ProjectCard from '$lib/components/ProjectCard.svelte';
	import type { Project } from '$lib/db/schema';

	interface DiscoveredProject {
		name: string;
		path: string;
		isTracked: boolean;
	}

	let projects = $state<(Project & { issueCount?: number })[]>([]);
	let discoveredProjects = $state<DiscoveredProject[]>([]);
	let loading = $state(true);
	let showAddModal = $state(false);
	let searchQuery = $state('');

	// New project form
	let newProjectName = $state('');
	let newProjectPath = $state('');
	let newProjectDescription = $state('');
	let newProjectColor = $state('#6366f1');

	onMount(async () => {
		await Promise.all([loadProjects(), discoverProjects()]);
		loading = false;
	});

	async function loadProjects() {
		const res = await fetch('/api/projects');
		if (res.ok) {
			projects = await res.json();
		}
	}

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
			await loadProjects();
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
			await loadProjects();
			await discoverProjects();
		}
	}

	function resetForm() {
		newProjectName = '';
		newProjectPath = '';
		newProjectDescription = '';
		newProjectColor = '#6366f1';
	}

	function selectDiscoveredProject(proj: DiscoveredProject) {
		newProjectName = proj.name;
		newProjectPath = proj.path;
	}

	function getRandomColor() {
		const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6'];
		return colors[Math.floor(Math.random() * colors.length)];
	}

	let filteredProjects = $derived(
		projects.filter(p => 
			p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			p.path.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	let untrackedProjects = $derived(
		discoveredProjects.filter(p => !p.isTracked)
	);
</script>

<svelte:head>
	<title>Projects | BugTracker</title>
</svelte:head>

<div class="p-8 max-w-7xl mx-auto">
	<!-- Header -->
	<div class="flex items-center justify-between mb-8">
		<div>
			<h1 class="text-3xl font-display font-bold text-surface-100">Projects</h1>
			<p class="text-surface-400 mt-1">Manage your tracked projects</p>
		</div>
		<button class="btn btn-primary" onclick={() => showAddModal = true}>
			<Plus size={18} />
			Add Project
		</button>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-20">
			<div class="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full"></div>
		</div>
	{:else}
		<!-- Search -->
		{#if projects.length > 0}
			<div class="mb-6 relative max-w-md">
				<Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
				<input
					type="text"
					class="input pl-10"
					placeholder="Search projects..."
					bind:value={searchQuery}
				/>
			</div>
		{/if}

		<!-- Projects Grid -->
		{#if filteredProjects.length > 0}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
				{#each filteredProjects as project, i}
					<div class="animate-slide-up" style="animation-delay: {i * 50}ms">
						<ProjectCard {project} />
					</div>
				{/each}
			</div>
		{:else if projects.length === 0}
			<div class="card text-center py-16">
				<FolderOpen size={64} class="mx-auto text-surface-600 mb-4" />
				<h2 class="text-xl font-semibold text-surface-200 mb-2">No projects yet</h2>
				<p class="text-surface-400 mb-6">Add your first project to start tracking bugs</p>
				<button class="btn btn-primary inline-flex" onclick={() => showAddModal = true}>
					<Plus size={18} />
					Add Project
				</button>
			</div>
		{:else}
			<div class="text-center py-12 text-surface-500">
				No projects match your search
			</div>
		{/if}

		<!-- Untracked Projects Discovery -->
		{#if untrackedProjects.length > 0}
			<div class="mt-8">
				<h2 class="text-lg font-semibold text-surface-200 mb-4 flex items-center gap-2">
					<Folder size={20} />
					Discovered in /home/dev/Code
				</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
					{#each untrackedProjects.slice(0, 80) as proj}
						<button
							class="card-hover text-left flex items-center gap-3"
							onclick={() => quickAddProject(proj)}
						>
							<Folder size={20} class="text-surface-500" />
							<span class="flex-1 truncate text-surface-300">{proj.name}</span>
							<Plus size={16} class="text-accent opacity-0 group-hover:opacity-100" />
						</button>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>

<!-- Add Project Modal -->
{#if showAddModal}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={() => showAddModal = false}>
		<div 
			class="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-lg animate-slide-up"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
		>
			<div class="p-6 border-b border-surface-700">
				<h2 class="text-xl font-semibold text-surface-100">Add Project</h2>
			</div>

			<form onsubmit={(e) => { e.preventDefault(); addProject(); }} class="p-6 space-y-4">
				<!-- Quick select from discovered -->
				{#if untrackedProjects.length > 0}
					<div>
						<label class="label">Quick Select</label>
						<div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
							{#each untrackedProjects.slice(0, 60) as proj}
								<button
									type="button"
									class="px-3 py-1.5 rounded-lg text-sm transition-colors"
									class:bg-accent={newProjectPath === proj.path}
									class:text-white={newProjectPath === proj.path}
									class:bg-surface-800={newProjectPath !== proj.path}
									class:text-surface-300={newProjectPath !== proj.path}
									onclick={() => selectDiscoveredProject(proj)}
								>
									{proj.name}
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<div>
					<label for="name" class="label">Project Name</label>
					<input id="name" type="text" class="input" placeholder="My Project" bind:value={newProjectName} required />
				</div>

				<div>
					<label for="path" class="label">Path</label>
					<input id="path" type="text" class="input font-mono text-sm" placeholder="/home/dev/Code/myproject" bind:value={newProjectPath} required />
				</div>

				<div>
					<label for="desc" class="label">Description (optional)</label>
					<textarea id="desc" class="input" placeholder="What is this project about?" bind:value={newProjectDescription}></textarea>
				</div>

				<div>
					<label class="label">Color</label>
					<div class="flex gap-2">
						{#each ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#3b82f6'] as color}
							<button
								type="button"
								class="w-8 h-8 rounded-lg transition-transform hover:scale-110"
								class:ring-2={newProjectColor === color}
								class:ring-white={newProjectColor === color}
								style="background-color: {color}"
								onclick={() => newProjectColor = color}
							>
								{#if newProjectColor === color}
									<Check size={16} class="mx-auto text-white" />
								{/if}
							</button>
						{/each}
					</div>
				</div>

				<div class="flex justify-end gap-3 pt-4">
					<button type="button" class="btn btn-secondary" onclick={() => showAddModal = false}>
						Cancel
					</button>
					<button type="submit" class="btn btn-primary">
						Add Project
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

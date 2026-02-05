<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { Search, FileText, FolderKanban, Settings, Plus, BarChart3, Home, ArrowRight } from 'lucide-svelte';
	import { projects, issues, type IssueWithMeta } from '$lib/stores/issues';
	import type { Project } from '$lib/db/schema';

	interface Props {
		isOpen: boolean;
		onclose: () => void;
	}

	let { isOpen, onclose }: Props = $props();

	let query = $state('');
	let selectedIndex = $state(0);
	let inputRef = $state<HTMLInputElement | null>(null);

	// Command types
	interface Command {
		id: string;
		type: 'navigation' | 'action' | 'issue' | 'project';
		title: string;
		subtitle?: string;
		icon: typeof Search;
		action: () => void;
		keywords?: string[];
	}

	// Static navigation commands
	const navigationCommands: Command[] = [
		{
			id: 'nav-home',
			type: 'navigation',
			title: 'Go to Dashboard',
			subtitle: 'View all projects',
			icon: Home,
			action: () => { goto('/'); onclose(); },
			keywords: ['home', 'dashboard', 'main']
		},
		{
			id: 'nav-analytics',
			type: 'navigation',
			title: 'Go to Analytics',
			subtitle: 'View statistics and reports',
			icon: BarChart3,
			action: () => { goto('/analytics'); onclose(); },
			keywords: ['analytics', 'stats', 'reports', 'metrics']
		},
		{
			id: 'nav-projects',
			type: 'navigation',
			title: 'View Projects',
			subtitle: 'Browse all projects',
			icon: FolderKanban,
			action: () => { goto('/'); onclose(); },
			keywords: ['projects', 'list', 'all']
		}
	];

	const actionCommands: Command[] = [
		{
			id: 'action-new-issue',
			type: 'action',
			title: 'Create New Issue',
			subtitle: 'Add a new issue to current project',
			icon: Plus,
			action: () => { onclose(); /* Will trigger via event */ },
			keywords: ['new', 'create', 'add', 'issue', 'bug', 'feature']
		}
	];

	// Build project commands
	function getProjectCommands(): Command[] {
		return ($projects || []).map((project: Project & { issueCount?: number }) => ({
			id: `project-${project.id}`,
			type: 'project' as const,
			title: project.name,
			subtitle: `${project.issueCount || 0} issues`,
			icon: FolderKanban,
			action: () => { goto(`/projects/${project.id}`); onclose(); },
			keywords: [project.name.toLowerCase(), project.path]
		}));
	}

	// Build issue commands
	function getIssueCommands(): Command[] {
		return ($issues || []).slice(0, 20).map((issue: IssueWithMeta) => ({
			id: `issue-${issue.id}`,
			type: 'issue' as const,
			title: `#${issue.id} ${issue.title}`,
			subtitle: `${issue.type} • ${issue.status}`,
			icon: FileText,
			action: () => { goto(`/projects/${issue.projectId}/issues/${issue.id}`); onclose(); },
			keywords: [issue.title.toLowerCase(), String(issue.id), issue.type, issue.status]
		}));
	}

	// Filter commands based on query
	const filteredCommands = $derived(() => {
		const allCommands = [
			...navigationCommands,
			...actionCommands,
			...getProjectCommands(),
			...getIssueCommands()
		];

		if (!query.trim()) {
			return allCommands.slice(0, 10);
		}

		const lowerQuery = query.toLowerCase();
		return allCommands.filter(cmd => {
			const titleMatch = cmd.title.toLowerCase().includes(lowerQuery);
			const subtitleMatch = cmd.subtitle?.toLowerCase().includes(lowerQuery);
			const keywordMatch = cmd.keywords?.some(k => k.includes(lowerQuery));
			return titleMatch || subtitleMatch || keywordMatch;
		}).slice(0, 15);
	});

	// Reset selection when query changes
	$effect(() => {
		query; // Track query changes
		selectedIndex = 0;
	});

	// Focus input when palette opens
	$effect(() => {
		if (isOpen && inputRef) {
			setTimeout(() => inputRef?.focus(), 50);
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		const commands = filteredCommands();
		
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, commands.length - 1);
				break;
			case 'ArrowUp':
				e.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, 0);
				break;
			case 'Enter':
				e.preventDefault();
				if (commands[selectedIndex]) {
					commands[selectedIndex].action();
				}
				break;
			case 'Escape':
				e.preventDefault();
				onclose();
				break;
		}
	}

	function getTypeIcon(type: string) {
		switch (type) {
			case 'navigation': return '→';
			case 'action': return '⚡';
			case 'issue': return '#';
			case 'project': return '📁';
			default: return '•';
		}
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 bg-void/90 backdrop-blur-sm z-[60] flex items-start justify-center pt-[15vh] px-4"
		onclick={onclose}
		role="dialog"
		aria-modal="true"
		aria-labelledby="command-palette-title"
	>
		<div
			class="bg-void-100 border border-void-50 w-full max-w-xl shadow-glow-cyan animate-slide-up"
			onclick={(e) => e.stopPropagation()}
			onkeydown={handleKeydown}
		>
			<!-- Search input -->
			<div class="flex items-center gap-2 p-3 border-b border-void-50">
				<Search size={16} class="text-ghost-dim" />
				<input
					bind:this={inputRef}
					type="text"
					bind:value={query}
					placeholder="Search issues, projects, or commands..."
					class="flex-1 bg-transparent border-none outline-none text-ghost-bright text-sm placeholder:text-ghost-dim"
					id="command-palette-title"
				/>
				<kbd class="text-2xs text-ghost-dim bg-void-50 px-1.5 py-0.5 border border-void-50">ESC</kbd>
			</div>

			<!-- Results -->
			<div class="max-h-[50vh] overflow-y-auto">
				{#if filteredCommands().length === 0}
					<div class="p-4 text-center text-ghost-dim text-sm">
						No results found for "{query}"
					</div>
				{:else}
					<div class="py-1">
						{#each filteredCommands() as command, i}
							<button
								class="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors
									{i === selectedIndex ? 'bg-cyber-muted text-ghost-bright' : 'text-ghost hover:bg-void-50'}"
								onclick={command.action}
								onmouseenter={() => selectedIndex = i}
							>
								<span class="w-6 h-6 flex items-center justify-center text-ghost-dim">
									<svelte:component this={command.icon} size={14} />
								</span>
								<div class="flex-1 min-w-0">
									<div class="text-sm truncate">{command.title}</div>
									{#if command.subtitle}
										<div class="text-2xs text-ghost-dim truncate">{command.subtitle}</div>
									{/if}
								</div>
								<span class="text-2xs text-ghost-dim uppercase px-1.5 py-0.5 bg-void-50 border border-void-50">
									{command.type}
								</span>
								{#if i === selectedIndex}
									<ArrowRight size={12} class="text-cyber" />
								{/if}
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="flex items-center justify-between px-3 py-2 border-t border-void-50 text-2xs text-ghost-dim">
				<div class="flex items-center gap-3">
					<span><kbd class="bg-void-50 px-1 py-0.5 border border-void-50">↑↓</kbd> navigate</span>
					<span><kbd class="bg-void-50 px-1 py-0.5 border border-void-50">↵</kbd> select</span>
				</div>
				<span class="text-cyber">⌘K to toggle</span>
			</div>
		</div>
	</div>
{/if}

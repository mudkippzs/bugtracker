<script lang="ts">
	import { Tag, Plus, X } from 'lucide-svelte';
	import LabelBadge from './LabelBadge.svelte';

	interface Props {
		labels: string[];
		onchange: (labels: string[]) => void;
		suggestions?: string[];
	}

	let { labels, onchange, suggestions = [] }: Props = $props();

	let isOpen = $state(false);
	let inputValue = $state('');
	let containerRef = $state<HTMLDivElement | null>(null);

	// Common label suggestions
	const defaultSuggestions = [
		'bug', 'enhancement', 'documentation', 'good-first-issue',
		'help-wanted', 'wontfix', 'duplicate', 'needs-review',
		'blocked', 'breaking-change', 'performance', 'security',
		'ui', 'backend', 'frontend', 'database', 'api', 'testing'
	];

	const allSuggestions = $derived([...new Set([...suggestions, ...defaultSuggestions])]);
	
	const filteredSuggestions = $derived(
		allSuggestions.filter(s => 
			!labels.includes(s) && 
			s.toLowerCase().includes(inputValue.toLowerCase())
		).slice(0, 8)
	);

	function addLabel(label: string) {
		const trimmed = label.trim().toLowerCase().replace(/\s+/g, '-');
		if (trimmed && !labels.includes(trimmed)) {
			onchange([...labels, trimmed]);
		}
		inputValue = '';
	}

	function removeLabel(label: string) {
		onchange(labels.filter(l => l !== label));
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && inputValue.trim()) {
			e.preventDefault();
			addLabel(inputValue);
		} else if (e.key === 'Escape') {
			isOpen = false;
			inputValue = '';
		} else if (e.key === 'Backspace' && !inputValue && labels.length > 0) {
			removeLabel(labels[labels.length - 1]);
		}
	}

	function handleClickOutside(event: MouseEvent) {
		if (containerRef && !containerRef.contains(event.target as Node)) {
			isOpen = false;
		}
	}

	$effect(() => {
		if (isOpen) {
			window.addEventListener('click', handleClickOutside);
		} else {
			window.removeEventListener('click', handleClickOutside);
		}
		return () => window.removeEventListener('click', handleClickOutside);
	});
</script>

<div bind:this={containerRef} class="relative">
	<div 
		class="input min-h-[32px] flex flex-wrap items-center gap-1 cursor-text"
		onclick={() => isOpen = true}
		role="button"
		tabindex="0"
		onkeydown={(e) => e.key === 'Enter' && (isOpen = true)}
	>
		{#each labels as label}
			<LabelBadge {label} removable onremove={() => removeLabel(label)} />
		{/each}
		
		<input
			type="text"
			class="flex-1 min-w-[80px] bg-transparent border-none outline-none text-xs text-ghost p-0"
			placeholder={labels.length === 0 ? 'Add labels...' : ''}
			bind:value={inputValue}
			onfocus={() => isOpen = true}
			onkeydown={handleKeydown}
		/>
	</div>

	{#if isOpen && (filteredSuggestions.length > 0 || inputValue.trim())}
		<div class="absolute z-20 mt-1 w-full bg-void-100 border border-void-50 shadow-lg max-h-48 overflow-y-auto">
			{#if inputValue.trim() && !labels.includes(inputValue.trim().toLowerCase().replace(/\s+/g, '-'))}
				<button
					type="button"
					class="w-full flex items-center gap-2 px-3 py-2 text-xs text-ghost hover:bg-void-50 text-left"
					onclick={() => addLabel(inputValue)}
				>
					<Plus size={12} class="text-cyber" />
					Create "{inputValue.trim().toLowerCase().replace(/\s+/g, '-')}"
				</button>
			{/if}
			
			{#each filteredSuggestions as suggestion}
				<button
					type="button"
					class="w-full flex items-center gap-2 px-3 py-2 text-xs text-ghost hover:bg-void-50 text-left"
					onclick={() => addLabel(suggestion)}
				>
					<Tag size={12} class="text-ghost-dim" />
					{suggestion}
				</button>
			{/each}
		</div>
	{/if}
</div>

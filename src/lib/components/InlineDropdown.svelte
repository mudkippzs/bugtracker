<script lang="ts">
	import { onMount } from 'svelte';

	interface Option {
		value: string;
		label: string;
	}

	interface Props {
		options: Option[];
		value: string;
		onSelect: (value: string) => void;
		children: import('svelte').Snippet;
	}

	let { options, value, onSelect, children }: Props = $props();

	let isOpen = $state(false);
	let dropdownRef = $state<HTMLDivElement | null>(null);

	function handleToggle(e: MouseEvent) {
		e.stopPropagation();
		isOpen = !isOpen;
	}

	function handleSelect(option: Option) {
		if (option.value !== value) {
			onSelect(option.value);
		}
		isOpen = false;
	}

	function handleClickOutside(e: MouseEvent) {
		if (dropdownRef && !dropdownRef.contains(e.target as Node)) {
			isOpen = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			isOpen = false;
		}
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="relative inline-block" bind:this={dropdownRef}>
	<button 
		class="cursor-pointer hover:opacity-80 transition-opacity"
		onclick={handleToggle}
		title="Click to change"
	>
		{@render children()}
	</button>

	{#if isOpen}
		<div class="absolute top-full left-0 mt-1 bg-void-100 border border-void-50 z-30 min-w-[100px] animate-fade-in shadow-lg">
			{#each options as option}
				<button
					class="w-full px-2 py-1 text-left text-2xs hover:bg-void-50 transition-colors flex items-center gap-2
						{option.value === value ? 'text-cyber bg-cyber-muted' : 'text-ghost'}"
					onclick={() => handleSelect(option)}
				>
					{#if option.value === value}
						<span class="text-cyber">✓</span>
					{:else}
						<span class="w-3"></span>
					{/if}
					{option.label}
				</button>
			{/each}
		</div>
	{/if}
</div>

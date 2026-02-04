<script lang="ts">
	import { onMount } from 'svelte';

	interface MenuItem {
		label: string;
		icon?: any;
		action: () => void;
		danger?: boolean;
		divider?: boolean;
	}

	interface Props {
		x: number;
		y: number;
		items: MenuItem[];
		onClose: () => void;
	}

	let { x, y, items, onClose }: Props = $props();
	let menuEl: HTMLDivElement;

	// Adjust position if menu would go off-screen
	let adjustedX = $state(x);
	let adjustedY = $state(y);

	onMount(() => {
		if (menuEl) {
			const rect = menuEl.getBoundingClientRect();
			const viewportWidth = window.innerWidth;
			const viewportHeight = window.innerHeight;

			if (x + rect.width > viewportWidth) {
				adjustedX = viewportWidth - rect.width - 8;
			}
			if (y + rect.height > viewportHeight) {
				adjustedY = viewportHeight - rect.height - 8;
			}
		}
	});
</script>

<svelte:window onclick={onClose} onkeydown={(e) => e.key === 'Escape' && onClose()} />

<div 
	bind:this={menuEl}
	class="fixed bg-void-100 border border-void-50 shadow-lg z-50 min-w-[180px] animate-fade-in py-1"
	style="left: {adjustedX}px; top: {adjustedY}px;"
	onclick={(e) => e.stopPropagation()}
	role="menu"
>
	{#each items as item}
		{#if item.divider}
			<div class="border-t border-void-50 my-1"></div>
		{:else}
			<button 
				class="w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 transition-colors
					{item.danger ? 'text-priority-critical hover:bg-priority-critical/10' : 'text-ghost hover:bg-void-50'}"
				onclick={() => { item.action(); onClose(); }}
				role="menuitem"
			>
				{#if item.icon}
					<svelte:component this={item.icon} size={12} />
				{/if}
				{item.label}
			</button>
		{/if}
	{/each}
</div>

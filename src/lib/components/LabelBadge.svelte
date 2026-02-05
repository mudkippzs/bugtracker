<script lang="ts">
	import { X } from 'lucide-svelte';

	interface Props {
		label: string;
		color?: string;
		removable?: boolean;
		onremove?: () => void;
		onclick?: () => void;
	}

	let { label, color, removable = false, onremove, onclick }: Props = $props();

	// Generate a consistent color from the label text if no color provided
	function hashStringToColor(str: string): string {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = str.charCodeAt(i) + ((hash << 5) - hash);
		}
		const hue = hash % 360;
		return `hsl(${hue}, 60%, 45%)`;
	}

	const labelColor = $derived(color || hashStringToColor(label));
</script>

{#if onclick}
	<button
		type="button"
		class="inline-flex items-center gap-1 px-1.5 py-0.5 text-2xs border transition-colors hover:brightness-110"
		style="background-color: {labelColor}20; border-color: {labelColor}50; color: {labelColor};"
		{onclick}
	>
		<span class="w-1.5 h-1.5 rounded-full" style="background-color: {labelColor};"></span>
		{label}
		{#if removable && onremove}
			<button 
				type="button"
				class="p-0.5 hover:bg-void-50 rounded-sm -mr-0.5"
				onclick={(e) => { e.stopPropagation(); onremove?.(); }}
			>
				<X size={8} />
			</button>
		{/if}
	</button>
{:else}
	<span
		class="inline-flex items-center gap-1 px-1.5 py-0.5 text-2xs border"
		style="background-color: {labelColor}20; border-color: {labelColor}50; color: {labelColor};"
	>
		<span class="w-1.5 h-1.5 rounded-full" style="background-color: {labelColor};"></span>
		{label}
		{#if removable && onremove}
			<button 
				type="button"
				class="p-0.5 hover:bg-void-50 rounded-sm -mr-0.5"
				onclick={(e) => { e.stopPropagation(); onremove?.(); }}
			>
				<X size={8} />
			</button>
		{/if}
	</span>
{/if}

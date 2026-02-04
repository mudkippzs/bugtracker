<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Tooltip from './Tooltip.svelte';

	interface Props {
		timestamp: string;
		live?: boolean;
		showTooltip?: boolean;
	}

	let { timestamp, live = true, showTooltip = true }: Props = $props();

	let relativeTime = $state('');
	let interval: ReturnType<typeof setInterval> | null = null;

	function formatRelative(dateStr: string): string {
		const date = new Date(dateStr);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		
		const seconds = Math.floor(diff / 1000);
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);
		const weeks = Math.floor(days / 7);
		const months = Math.floor(days / 30);

		if (seconds < 10) return 'now';
		if (seconds < 60) return `${seconds}s`;
		if (minutes < 60) return `${minutes}m`;
		if (hours < 24) return `${hours}h`;
		if (days < 7) return `${days}d`;
		if (weeks < 4) return `${weeks}w`;
		if (months < 12) return `${months}mo`;
		return date.toLocaleDateString('en', { month: 'short', day: 'numeric', year: '2-digit' });
	}

	function formatFull(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleString('en-US', {
			weekday: 'short',
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false
		});
	}

	function update() {
		relativeTime = formatRelative(timestamp);
	}

	onMount(() => {
		update();
		if (live) {
			// Update every 30 seconds for live timestamps
			interval = setInterval(update, 30000);
		}
	});

	onDestroy(() => {
		if (interval) {
			clearInterval(interval);
		}
	});

	// React to timestamp changes
	$effect(() => {
		if (timestamp) {
			update();
		}
	});

	const fullTimestamp = $derived(formatFull(timestamp));
</script>

{#if showTooltip}
	<Tooltip text={fullTimestamp}>
		<time datetime={timestamp} class="relative-time">
			{relativeTime}
		</time>
	</Tooltip>
{:else}
	<time datetime={timestamp} class="relative-time">
		{relativeTime}
	</time>
{/if}

<style>
	.relative-time {
		cursor: default;
		font-variant-numeric: tabular-nums;
	}
</style>

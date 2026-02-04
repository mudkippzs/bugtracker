<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		text: string;
		position?: 'top' | 'bottom' | 'left' | 'right';
		children: Snippet;
	}

	let { text, position = 'top', children }: Props = $props();
	
	let visible = $state(false);
</script>

<span
	class="tooltip-wrapper"
	onmouseenter={() => visible = true}
	onmouseleave={() => visible = false}
	onfocus={() => visible = true}
	onblur={() => visible = false}
	role="tooltip"
>
	{@render children()}
	
	{#if visible && text}
		<span class="tooltip tooltip-{position}">
			{text}
		</span>
	{/if}
</span>

<style>
	.tooltip-wrapper {
		position: relative;
		display: inline-flex;
	}

	.tooltip {
		position: absolute;
		z-index: 100;
		padding: 4px 8px;
		font-size: 11px;
		font-family: monospace;
		white-space: nowrap;
		background-color: var(--tooltip-bg, #1a1e2e);
		color: var(--tooltip-color, #e0e6f0);
		border: 1px solid var(--tooltip-border, rgba(0, 240, 255, 0.3));
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
		pointer-events: none;
		animation: tooltipFadeIn 0.15s ease-out;
	}

	.tooltip-top {
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%);
		margin-bottom: 6px;
	}

	.tooltip-bottom {
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		margin-top: 6px;
	}

	.tooltip-left {
		right: 100%;
		top: 50%;
		transform: translateY(-50%);
		margin-right: 6px;
	}

	.tooltip-right {
		left: 100%;
		top: 50%;
		transform: translateY(-50%);
		margin-left: 6px;
	}

	@keyframes tooltipFadeIn {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
	}

	/* Light mode */
	:global(html.light) .tooltip {
		--tooltip-bg: #ffffff;
		--tooltip-color: #1e293b;
		--tooltip-border: rgba(8, 145, 178, 0.3);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}
</style>

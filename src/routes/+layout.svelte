<script lang="ts">
	import '../app.css';
	import { Bug, LayoutDashboard, FolderKanban, BarChart3, ChevronLeft, ChevronRight, Sun, Moon } from 'lucide-svelte';
	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	import { connectWebSocket, disconnectWebSocket, wsConnected } from '$lib/stores/websocket';
	import { theme } from '$lib/stores/theme';
	import { browser } from '$app/environment';

	let { children } = $props();
	let collapsed = $state(false);
	let currentTime = $state('');

	onMount(() => {
		if (browser) {
			connectWebSocket();
			theme.init(); // Initialize theme on mount
			// Update time every second
			const updateTime = () => {
				const now = new Date();
				currentTime = now.toLocaleTimeString('en-US', { hour12: false });
			};
			updateTime();
			const interval = setInterval(updateTime, 1000);
			return () => clearInterval(interval);
		}
	});

	onDestroy(() => {
		if (browser) {
			disconnectWebSocket();
		}
	});

	const navItems = [
		{ href: '/', icon: LayoutDashboard, label: 'DASH', full: 'Dashboard' },
		{ href: '/projects', icon: FolderKanban, label: 'PROJ', full: 'Projects' },
		{ href: '/analytics', icon: BarChart3, label: 'STAT', full: 'Analytics' }
	];

	function isActive(href: string) {
		if (href === '/') return $page.url.pathname === '/';
		return $page.url.pathname.startsWith(href);
	}
</script>

<div class="min-h-screen flex">
	<!-- Sidebar - Compact Terminal Style -->
	<aside 
		class="bg-void-100 border-r border-void-50 flex flex-col fixed h-full transition-all duration-200 z-40"
		class:w-48={!collapsed}
		class:w-12={collapsed}
	>
		<!-- Logo -->
		<div class="p-2 border-b border-void-50">
			<a href="/" class="flex items-center gap-2">
				<div class="w-8 h-8 border border-cyber/50 flex items-center justify-center bg-cyber/5">
					<Bug size={16} class="text-cyber" />
				</div>
				{#if !collapsed}
					<div class="overflow-hidden">
						<h1 class="font-display text-sm text-cyber tracking-wider">BUGTRACK</h1>
						<p class="text-2xs text-ghost-dim">v1.0.0</p>
					</div>
				{/if}
			</a>
		</div>

		<!-- Navigation -->
		<nav class="flex-1 p-1.5 space-y-0.5">
			{#each navItems as item}
				{@const active = isActive(item.href)}
				<a
					href={item.href}
					class="flex items-center gap-2 px-2 py-1.5 transition-all duration-150 group border {active ? 'bg-cyber-muted border-cyber-dim text-cyber' : 'border-transparent text-ghost-dim hover:text-ghost hover:bg-void-50 hover:border-void-50'}"
					title={item.full}
				>
					<svelte:component this={item.icon} size={14} />
					{#if !collapsed}
						<span class="text-xs tracking-wider">{item.label}</span>
						{#if active}
							<span class="ml-auto text-2xs opacity-50">◄</span>
						{/if}
					{/if}
				</a>
			{/each}
		</nav>

		<!-- Theme Toggle -->
		<div class="p-2 border-t border-void-50">
			<button
				class="flex items-center gap-2 w-full px-2 py-1.5 text-ghost-dim hover:text-ghost hover:bg-void-50 transition-colors border border-transparent hover:border-void-50"
				onclick={() => theme.toggle()}
				title={$theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
			>
				{#if $theme === 'dark'}
					<Sun size={14} />
					{#if !collapsed}
						<span class="text-xs tracking-wider">LIGHT</span>
					{/if}
				{:else}
					<Moon size={14} />
					{#if !collapsed}
						<span class="text-xs tracking-wider">DARK</span>
					{/if}
				{/if}
			</button>
		</div>

		<!-- Status Footer -->
		<div class="p-2 border-t border-void-50 text-2xs">
			{#if !collapsed}
				<div class="flex items-center justify-between text-ghost-dim mb-1">
					<span>SYS</span>
					<span class="font-display">{currentTime}</span>
				</div>
			{/if}
			<div class="flex items-center gap-1.5">
				<span 
					class="status-dot"
					class:status-dot-online={$wsConnected}
					class:status-dot-offline={!$wsConnected}
				></span>
				{#if !collapsed}
					<span class="text-ghost-dim">{$wsConnected ? 'CONNECTED' : 'OFFLINE'}</span>
				{/if}
			</div>
		</div>

		<!-- Collapse Toggle -->
		<button 
			class="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-void-100 border border-void-50 
				   flex items-center justify-center text-ghost-dim hover:text-cyber hover:border-cyber/30 
				   transition-colors"
			onclick={() => collapsed = !collapsed}
		>
			{#if collapsed}
				<ChevronRight size={12} />
			{:else}
				<ChevronLeft size={12} />
			{/if}
		</button>
	</aside>

	<!-- Main Content -->
	<main 
		class="flex-1 transition-all duration-200"
		class:ml-48={!collapsed}
		class:ml-12={collapsed}
	>
		{@render children()}
	</main>
</div>

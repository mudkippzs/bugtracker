<script lang="ts">
	import '../app.css';
	import { Bug, LayoutDashboard, FolderKanban, BarChart3, Settings, Zap, Circle } from 'lucide-svelte';
	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	import { connectWebSocket, disconnectWebSocket, wsConnected } from '$lib/stores/websocket';
	import { browser } from '$app/environment';

	let { children } = $props();

	onMount(() => {
		if (browser) {
			connectWebSocket();
		}
	});

	onDestroy(() => {
		if (browser) {
			disconnectWebSocket();
		}
	});

	const navItems = [
		{ href: '/', icon: LayoutDashboard, label: 'Dashboard' },
		{ href: '/projects', icon: FolderKanban, label: 'Projects' },
		{ href: '/analytics', icon: BarChart3, label: 'Analytics' }
	];

	function isActive(href: string) {
		if (href === '/') return $page.url.pathname === '/';
		return $page.url.pathname.startsWith(href);
	}
</script>

<div class="min-h-screen flex">
	<!-- Sidebar -->
	<aside class="w-64 bg-surface-900 border-r border-surface-700 flex flex-col fixed h-full">
		<!-- Logo -->
		<div class="p-6 border-b border-surface-700">
			<a href="/" class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
					<Bug size={22} class="text-white" />
				</div>
				<div>
					<h1 class="font-display font-bold text-lg text-surface-100">BugTracker</h1>
					<p class="text-xs text-surface-500">Local Dev Tools</p>
				</div>
			</a>
		</div>

		<!-- Navigation -->
		<nav class="flex-1 p-4 space-y-1">
			{#each navItems as item}
				<a
					href={item.href}
					class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group"
					class:bg-accent={isActive(item.href)}
					class:text-white={isActive(item.href)}
					class:text-surface-400={!isActive(item.href)}
					class:hover:bg-surface-800={!isActive(item.href)}
					class:hover:text-surface-100={!isActive(item.href)}
				>
					<svelte:component this={item.icon} size={20} />
					<span class="font-medium">{item.label}</span>
				</a>
			{/each}
		</nav>

		<!-- Footer -->
		<div class="p-4 border-t border-surface-700">
			<div class="flex items-center gap-2 text-sm text-surface-500 px-4 py-2">
				<span class={$wsConnected ? 'text-status-done' : 'text-status-backlog'}>
					<Circle size={8} class="fill-current" />
				</span>
				<span>{$wsConnected ? 'Connected' : 'Offline'}</span>
			</div>
		</div>
	</aside>

	<!-- Main Content -->
	<main class="flex-1 ml-64">
		{@render children()}
	</main>
</div>

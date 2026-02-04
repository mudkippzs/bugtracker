<script lang="ts">
	import { X, User, RotateCcw, Settings } from 'lucide-svelte';
	import { settings } from '$lib/stores/settings';

	interface Props {
		onclose: () => void;
	}

	let { onclose }: Props = $props();

	let username = $state($settings.currentUser);
	let saved = $state(false);

	function handleSave() {
		settings.setUser(username.trim() || 'dev');
		saved = true;
		setTimeout(() => {
			saved = false;
		}, 1500);
	}

	function handleReset() {
		if (confirm('Reset all settings including read history?')) {
			settings.reset();
			username = 'dev';
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onclose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div 
	class="fixed inset-0 bg-void/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
	onclick={onclose}
	role="dialog"
	aria-modal="true"
	aria-labelledby="settings-title"
>
	<div 
		class="bg-void-100 border border-void-50 w-full max-w-md animate-slide-up"
		onclick={(e) => e.stopPropagation()}
	>
		<!-- Header -->
		<div class="flex items-center justify-between p-3 border-b border-void-50">
			<div class="flex items-center gap-2">
				<Settings size={14} class="text-cyber" />
				<h2 id="settings-title" class="text-sm text-ghost-bright font-display tracking-wide">SETTINGS</h2>
			</div>
			<button 
				class="p-1 text-ghost-dim hover:text-ghost transition-colors"
				onclick={onclose}
				aria-label="Close settings"
			>
				<X size={16} />
			</button>
		</div>

		<!-- Content -->
		<div class="p-4 space-y-4">
			<!-- User Identity -->
			<div>
				<div class="panel-header">
					<User size={12} />
					<span>IDENTITY</span>
				</div>
				<p class="text-xs text-ghost-dim mb-3">
					Set your display name for comments and activity tracking.
				</p>
				
				<div class="flex gap-2">
					<input
						type="text"
						class="input flex-1"
						placeholder="Enter username..."
						bind:value={username}
						maxlength={32}
					/>
					<button 
						class="btn btn-primary"
						onclick={handleSave}
						disabled={!username.trim()}
					>
						{saved ? '✓ SAVED' : 'SAVE'}
					</button>
				</div>
				
				<p class="text-2xs text-ghost-dim mt-2">
					Currently posting as: <span class="text-cyber">@{$settings.currentUser}</span>
				</p>
			</div>

			<!-- Read History Info -->
			<div>
				<div class="panel-header">
					<span>READ HISTORY</span>
				</div>
				<p class="text-xs text-ghost-dim mb-2">
					BugTracker tracks which issues you've read to show NEW indicators on unread comments.
				</p>
				<p class="text-2xs text-ghost-dim">
					Issues tracked: <span class="text-ghost">{Object.keys($settings.readState).length}</span>
				</p>
			</div>

			<!-- Danger Zone -->
			<div class="pt-2 border-t border-void-50">
				<button 
					class="btn btn-ghost text-ghost-dim hover:text-priority-critical text-xs"
					onclick={handleReset}
				>
					<RotateCcw size={12} />
					Reset All Settings
				</button>
			</div>
		</div>
	</div>
</div>

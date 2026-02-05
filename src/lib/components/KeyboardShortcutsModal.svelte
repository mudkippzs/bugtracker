<script lang="ts">
	import { X, Keyboard } from 'lucide-svelte';
	import { showShortcutsModal, getShortcutsBySection } from '$lib/stores/keyboard';

	const sections = getShortcutsBySection();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			showShortcutsModal.set(false);
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div 
	class="fixed inset-0 bg-void/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
	onclick={() => showShortcutsModal.set(false)}
	role="dialog"
	aria-modal="true"
	aria-labelledby="shortcuts-title"
>
	<div 
		class="bg-void-100 border border-void-50 w-full max-w-lg animate-slide-up max-h-[80vh] overflow-hidden flex flex-col"
		onclick={(e) => e.stopPropagation()}
	>
		<!-- Header -->
		<div class="flex items-center justify-between p-3 border-b border-void-50 flex-shrink-0">
			<div class="flex items-center gap-2">
				<Keyboard size={14} class="text-cyber" />
				<h2 id="shortcuts-title" class="text-sm text-ghost-bright font-display tracking-wide">KEYBOARD SHORTCUTS</h2>
			</div>
			<button 
				class="p-1 text-ghost-dim hover:text-ghost transition-colors"
				onclick={() => showShortcutsModal.set(false)}
				aria-label="Close"
			>
				<X size={16} />
			</button>
		</div>

		<!-- Content -->
		<div class="p-4 overflow-y-auto flex-1">
			<div class="space-y-4">
				{#each Object.entries(sections) as [sectionName, sectionShortcuts]}
					<div>
						<div class="panel-header text-2xs mb-2">
							<span>{sectionName.toUpperCase()}</span>
						</div>
						<div class="space-y-1">
							{#each sectionShortcuts as shortcut}
								<div class="flex items-center justify-between py-1">
									<span class="text-xs text-ghost">{shortcut.description}</span>
									<kbd class="px-2 py-0.5 bg-void-200 border border-void-50 text-cyber text-xs font-mono">
										{shortcut.key}
									</kbd>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>

			<div class="mt-4 pt-3 border-t border-void-50">
				<p class="text-2xs text-ghost-dim">
					Shortcuts are disabled when typing in inputs or when modals are open.
				</p>
			</div>
		</div>
	</div>
</div>

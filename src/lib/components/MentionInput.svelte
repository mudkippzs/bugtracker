<script lang="ts">
	import { users, type User } from '$lib/stores/users';
	import { onMount } from 'svelte';

	interface Props {
		value: string;
		onchange: (value: string) => void;
		placeholder?: string;
		class?: string;
		rows?: number;
	}

	let { value = '', onchange, placeholder = '', class: className = '', rows = 4 }: Props = $props();

	let textarea: HTMLTextAreaElement;
	let showSuggestions = $state(false);
	let suggestions = $state<User[]>([]);
	let selectedIndex = $state(0);
	let mentionStart = $state(-1);
	let mentionQuery = $state('');
	let dropdownPosition = $state({ top: 0, left: 0 });

	function updateSuggestions() {
		if (mentionQuery) {
			const query = mentionQuery.toLowerCase();
			suggestions = $users.filter(u => 
				u.id.toLowerCase().includes(query) || 
				u.name.toLowerCase().includes(query)
			).slice(0, 5);
			showSuggestions = suggestions.length > 0;
		} else {
			suggestions = $users.slice(0, 5);
			showSuggestions = true;
		}
		selectedIndex = 0;
	}

	function getCaretCoordinates() {
		if (!textarea) return { top: 0, left: 0 };
		
		// Create a mirror div for measuring
		const mirror = document.createElement('div');
		const style = getComputedStyle(textarea);
		
		mirror.style.cssText = `
			position: absolute;
			visibility: hidden;
			white-space: pre-wrap;
			word-wrap: break-word;
			overflow-wrap: break-word;
			width: ${textarea.offsetWidth}px;
			font: ${style.font};
			padding: ${style.padding};
			border: ${style.border};
			line-height: ${style.lineHeight};
		`;
		
		const textBeforeCaret = value.substring(0, textarea.selectionStart);
		mirror.textContent = textBeforeCaret;
		
		const span = document.createElement('span');
		span.textContent = '|';
		mirror.appendChild(span);
		document.body.appendChild(mirror);
		
		const rect = textarea.getBoundingClientRect();
		const spanRect = span.getBoundingClientRect();
		
		document.body.removeChild(mirror);
		
		return {
			top: rect.top + (span.offsetTop || 20) + 20,
			left: rect.left + (span.offsetLeft || 0)
		};
	}

	function handleInput(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		const newValue = target.value;
		onchange(newValue);
		
		// Check for @ mentions
		const cursorPos = target.selectionStart;
		const textBeforeCursor = newValue.substring(0, cursorPos);
		const atIndex = textBeforeCursor.lastIndexOf('@');
		
		if (atIndex !== -1) {
			const textAfterAt = textBeforeCursor.substring(atIndex + 1);
			// Check if there's no space after the @
			if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
				mentionStart = atIndex;
				mentionQuery = textAfterAt;
				dropdownPosition = getCaretCoordinates();
				updateSuggestions();
				return;
			}
		}
		
		showSuggestions = false;
		mentionStart = -1;
	}

	function insertMention(user: User) {
		if (mentionStart === -1) return;
		
		const before = value.substring(0, mentionStart);
		const after = value.substring(textarea.selectionStart);
		const newValue = `${before}@${user.id} ${after}`;
		
		onchange(newValue);
		showSuggestions = false;
		mentionStart = -1;
		
		// Set cursor position after the mention
		setTimeout(() => {
			const newPos = mentionStart + user.id.length + 2; // @username + space
			textarea.setSelectionRange(newPos, newPos);
			textarea.focus();
		}, 0);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!showSuggestions) return;

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
				break;
			case 'ArrowUp':
				e.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, 0);
				break;
			case 'Enter':
			case 'Tab':
				if (suggestions.length > 0) {
					e.preventDefault();
					insertMention(suggestions[selectedIndex]);
				}
				break;
			case 'Escape':
				showSuggestions = false;
				mentionStart = -1;
				break;
		}
	}

	function handleBlur() {
		// Delay hiding to allow click on suggestion
		setTimeout(() => {
			showSuggestions = false;
		}, 200);
	}
</script>

<div class="relative">
	<textarea 
		bind:this={textarea}
		{value}
		{placeholder}
		{rows}
		class="input resize-y text-xs {className}"
		oninput={handleInput}
		onkeydown={handleKeydown}
		onblur={handleBlur}
	></textarea>

	{#if showSuggestions}
		<div 
			class="fixed z-50 bg-void-100 border border-void-50 shadow-lg min-w-[180px] max-h-[200px] overflow-y-auto"
			style="top: {dropdownPosition.top}px; left: {dropdownPosition.left}px;"
		>
			{#each suggestions as user, i}
				<button
					type="button"
					class="w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors
						{i === selectedIndex ? 'bg-cyber/20 text-cyber' : 'text-ghost hover:bg-void-50'}"
					onmousedown={() => insertMention(user)}
					onmouseenter={() => selectedIndex = i}
				>
					<span class="text-ghost-dim">@</span>
					<span class="font-medium">{user.id}</span>
					<span class="text-ghost-dim text-2xs">({user.name})</span>
				</button>
			{/each}
			{#if suggestions.length === 0}
				<div class="px-3 py-2 text-xs text-ghost-dim">No users found</div>
			{/if}
		</div>
	{/if}
</div>

<script lang="ts">
	import { users, type User } from '$lib/stores/users';
	import { User as UserIcon, X } from 'lucide-svelte';

	interface Props {
		value: string | null;
		onchange: (userId: string | null) => void;
		placeholder?: string;
		showClear?: boolean;
		class?: string;
	}

	let { value, onchange, placeholder = 'Select assignee...', showClear = true, class: className = '' }: Props = $props();
</script>

<div class="relative flex items-center gap-1 {className}">
	<div class="relative flex-1">
		<UserIcon size={12} class="absolute left-2 top-1/2 -translate-y-1/2 text-ghost-dim" />
		<select 
			class="input pl-7 pr-6 w-full appearance-none"
			value={value ?? ''}
			onchange={(e) => onchange(e.currentTarget.value || null)}
		>
			<option value="">{placeholder}</option>
			{#each $users as user}
				<option value={user.id}>{user.name}</option>
			{/each}
		</select>
	</div>
	{#if showClear && value}
		<button 
			type="button"
			class="btn btn-ghost p-1 text-ghost-dim hover:text-ghost"
			onclick={() => onchange(null)}
			title="Clear assignee"
		>
			<X size={12} />
		</button>
	{/if}
</div>

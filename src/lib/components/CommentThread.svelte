<script lang="ts">
	import type { Comment } from '$lib/db/schema';
	import { Send, MessageSquare } from 'lucide-svelte';
	import MarkdownContent from './MarkdownContent.svelte';

	interface Props {
		comments: Comment[];
		onAddComment: (content: string) => void;
	}

	let { comments, onAddComment }: Props = $props();

	let newComment = $state('');
	let isSubmitting = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!newComment.trim() || isSubmitting) return;

		isSubmitting = true;
		await onAddComment(newComment);
		newComment = '';
		isSubmitting = false;
	}

	function formatDate(dateStr: string) {
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div class="space-y-4">
	<div class="flex items-center gap-2 text-surface-300">
		<MessageSquare size={18} />
		<h3 class="font-medium">Comments ({comments.length})</h3>
	</div>

	<!-- Comment List -->
	<div class="space-y-3">
		{#each comments as comment (comment.id)}
			<div class="bg-surface-800/50 rounded-xl p-4 border border-surface-700 animate-fade-in">
				<div class="flex items-center gap-2 mb-2">
					<span class="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-accent text-sm font-medium">
						{(comment.author || 'A').charAt(0).toUpperCase()}
					</span>
					<span class="font-medium text-surface-200">{comment.author || 'Anonymous'}</span>
					<span class="text-xs text-surface-500">{formatDate(comment.createdAt)}</span>
				</div>
				<div class="pl-9">
					<MarkdownContent content={comment.content} />
				</div>
			</div>
		{:else}
			<div class="text-center py-8 text-surface-500 text-sm">
				No comments yet. Be the first to comment!
			</div>
		{/each}
	</div>

	<!-- Add Comment Form -->
	<form onsubmit={handleSubmit} class="mt-4">
		<div class="bg-surface-800 rounded-xl border border-surface-700 focus-within:border-accent transition-colors">
			<textarea
				class="w-full bg-transparent p-4 text-surface-100 placeholder-surface-500 resize-none focus:outline-none min-h-[100px] font-mono text-sm"
				placeholder="Add a comment... (Markdown supported)"
				bind:value={newComment}
			></textarea>
			<div class="flex justify-end p-2 border-t border-surface-700">
				<button 
					type="submit" 
					class="btn btn-primary"
					disabled={!newComment.trim() || isSubmitting}
				>
					<Send size={16} />
					{isSubmitting ? 'Sending...' : 'Comment'}
				</button>
			</div>
		</div>
	</form>
</div>

<script lang="ts">
	import type { Comment } from '$lib/db/schema';
	import { Send, MessageSquare, Reply, Edit2, Trash2, MoreVertical, X, Check, Quote } from 'lucide-svelte';
	import MarkdownContent from './MarkdownContent.svelte';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	interface Props {
		comments: Comment[];
		onAddComment: (content: string) => Promise<void>;
		onEditComment?: (commentId: number, content: string) => Promise<void>;
		onDeleteComment?: (commentId: number, hard: boolean) => Promise<void>;
	}

	let { comments, onAddComment, onEditComment, onDeleteComment }: Props = $props();

	let newComment = $state('');
	let isSubmitting = $state(false);
	let replyingTo = $state<Comment | null>(null);
	let editingComment = $state<number | null>(null);
	let editContent = $state('');
	let highlightedComment = $state<number | null>(null);
	let showMenuFor = $state<number | null>(null);

	// Get the comment being replied to (for quote box display)
	function getQuotedComment(commentId: number): Comment | undefined {
		return comments.find(c => c.id === commentId);
	}

	onMount(() => {
		if (browser) {
			// Check for comment hash in URL
			const hash = window.location.hash;
			if (hash && hash.startsWith('#')) {
				const commentId = parseInt(hash.slice(1));
				if (!isNaN(commentId)) {
					highlightedComment = commentId;
					setTimeout(() => {
						const el = document.getElementById(`comment-${commentId}`);
						if (el) {
							el.scrollIntoView({ behavior: 'smooth', block: 'center' });
						}
					}, 100);
				}
			}

			const handleHashChange = () => {
				const hash = window.location.hash;
				if (hash && hash.startsWith('#')) {
					const commentId = parseInt(hash.slice(1));
					if (!isNaN(commentId)) {
						highlightedComment = commentId;
						const el = document.getElementById(`comment-${commentId}`);
						if (el) {
							el.scrollIntoView({ behavior: 'smooth', block: 'center' });
						}
					}
				}
			};
			window.addEventListener('hashchange', handleHashChange);
			return () => window.removeEventListener('hashchange', handleHashChange);
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!newComment.trim() || isSubmitting) return;

		isSubmitting = true;
		
		// If replying, prepend quoted content
		let content = newComment;
		if (replyingTo) {
			const quotedLines = replyingTo.content.split('\n').map(line => `> ${line}`).join('\n');
			content = `**Replying to ${replyingTo.author} ([#${replyingTo.id}](#${replyingTo.id})):**\n${quotedLines}\n\n---\n\n${newComment}`;
		}
		
		await onAddComment(content);
		newComment = '';
		replyingTo = null;
		isSubmitting = false;
	}

	async function handleEdit(commentId: number) {
		if (!editContent.trim() || isSubmitting || !onEditComment) return;

		isSubmitting = true;
		await onEditComment(commentId, editContent);
		editingComment = null;
		editContent = '';
		isSubmitting = false;
	}

	async function handleDelete(commentId: number, hard: boolean) {
		if (!onDeleteComment) return;
		if (hard && !confirm('Permanently delete this comment? This cannot be undone.')) return;
		
		await onDeleteComment(commentId, hard);
		showMenuFor = null;
	}

	function startEdit(comment: Comment) {
		editingComment = comment.id;
		editContent = comment.content;
		showMenuFor = null;
	}

	function startReply(comment: Comment) {
		replyingTo = comment;
		newComment = '';
		showMenuFor = null;
		// Scroll to the comment form
		setTimeout(() => {
			const form = document.getElementById('comment-form');
			if (form) {
				form.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
		}, 100);
	}

	function cancelEdit() {
		editingComment = null;
		editContent = '';
	}

	function cancelReply() {
		replyingTo = null;
		newComment = '';
	}

	function toggleMenu(e: Event, commentId: number) {
		e.stopPropagation();
		showMenuFor = showMenuFor === commentId ? null : commentId;
	}

	function handleMenuAction(e: Event, action: () => void) {
		e.stopPropagation();
		action();
	}

	function closeMenus() {
		showMenuFor = null;
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

	function getCommentLink(commentId: number) {
		if (browser) {
			return `${window.location.pathname}#${commentId}`;
		}
		return `#${commentId}`;
	}

	function truncateQuote(content: string, maxLength = 100): string {
		const plain = content.replace(/[#*`>\[\]()]/g, '').replace(/\n/g, ' ').trim();
		return plain.length > maxLength ? plain.slice(0, maxLength) + '...' : plain;
	}
</script>

<div class="space-y-4">
	<div class="flex items-center gap-2 text-surface-300">
		<MessageSquare size={18} />
		<h3 class="font-medium">Comments ({comments.filter(c => !c.isDeleted).length})</h3>
	</div>

	<!-- Comment List -->
	<div class="space-y-3">
		{#each comments as comment (comment.id)}
			{@const isHighlighted = highlightedComment === comment.id}
			
			<div 
				id="comment-{comment.id}"
				class="group rounded-xl border transition-all duration-500 {isHighlighted ? 'bg-accent/10 border-accent/50 animate-flash' : 'bg-surface-800/50 border-surface-700'}"
			>
				<div class="p-4">
					{#if comment.isDeleted}
						<p class="text-surface-500 italic text-sm">[Comment deleted]</p>
					{:else if editingComment === comment.id}
						<!-- Edit Mode -->
						<div class="space-y-2">
							<textarea
								class="w-full bg-surface-900 border border-surface-600 rounded-lg p-3 text-surface-100 placeholder-surface-500 resize-none focus:outline-none focus:ring-2 focus:ring-accent/50 min-h-[80px] font-mono text-sm"
								bind:value={editContent}
							></textarea>
							<div class="flex justify-end gap-2">
								<button class="btn btn-ghost text-sm py-1" onclick={cancelEdit}>
									<X size={14} /> Cancel
								</button>
								<button 
									class="btn btn-primary text-sm py-1" 
									onclick={() => handleEdit(comment.id)}
									disabled={isSubmitting}
								>
									<Check size={14} /> Save
								</button>
							</div>
						</div>
					{:else}
						<div class="flex items-start justify-between gap-2">
							<div class="flex items-center gap-2 mb-2 flex-wrap">
								<span class="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-accent text-sm font-medium">
									{(comment.author || 'A').charAt(0).toUpperCase()}
								</span>
								<span class="font-medium text-surface-200">{comment.author || 'Anonymous'}</span>
								<a 
									href={getCommentLink(comment.id)} 
									class="text-xs text-surface-500 hover:text-accent"
									title="Link to this comment"
								>
									#{comment.id}
								</a>
								<span class="text-xs text-surface-500">{formatDate(comment.createdAt)}</span>
								{#if comment.editedAt}
									<span class="text-xs text-surface-500 italic">(edited)</span>
								{/if}
							</div>

							<!-- Actions Menu -->
							<div class="relative flex-shrink-0">
								<button 
									class="p-1.5 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-200 transition-colors"
									onclick={(e) => toggleMenu(e, comment.id)}
									title="Actions"
								>
									<MoreVertical size={16} />
								</button>

								{#if showMenuFor === comment.id}
									<div class="absolute right-0 top-full mt-1 bg-surface-800 border border-surface-600 rounded-lg shadow-xl z-20 py-1 min-w-[160px]">
										<button 
											class="w-full px-3 py-2 text-left text-sm text-surface-300 hover:bg-surface-700 flex items-center gap-2"
											onclick={(e) => handleMenuAction(e, () => startReply(comment))}
										>
											<Reply size={14} /> Reply
										</button>
										<button 
											class="w-full px-3 py-2 text-left text-sm text-surface-300 hover:bg-surface-700 flex items-center gap-2"
											onclick={(e) => handleMenuAction(e, () => startEdit(comment))}
										>
											<Edit2 size={14} /> Edit
										</button>
										<hr class="my-1 border-surface-600" />
										<button 
											class="w-full px-3 py-2 text-left text-sm text-surface-300 hover:bg-surface-700 flex items-center gap-2"
											onclick={(e) => handleMenuAction(e, () => handleDelete(comment.id, false))}
										>
											<Trash2 size={14} /> Hide
										</button>
										<button 
											class="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
											onclick={(e) => handleMenuAction(e, () => handleDelete(comment.id, true))}
										>
											<Trash2 size={14} /> Delete permanently
										</button>
									</div>
								{/if}
							</div>
						</div>

						<div class="mt-2">
							<MarkdownContent content={comment.content} />
						</div>

						<!-- Quick Reply button -->
						<div class="mt-3 pt-2 border-t border-surface-700/50">
							<button 
								class="text-xs text-surface-500 hover:text-accent flex items-center gap-1 transition-colors"
								onclick={() => startReply(comment)}
							>
								<Reply size={12} /> Reply
							</button>
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<div class="text-center py-8 text-surface-500 text-sm">
				No comments yet. Be the first to comment!
			</div>
		{/each}
	</div>

	<!-- Add Comment Form -->
	<form id="comment-form" onsubmit={handleSubmit} class="mt-4">
		<!-- Reply Quote Box -->
		{#if replyingTo}
			<div class="mb-3 p-3 bg-surface-800 border-l-4 border-accent rounded-r-lg">
				<div class="flex items-center justify-between mb-1">
					<span class="text-xs text-surface-400 flex items-center gap-1">
						<Quote size={12} />
						Replying to <span class="text-accent">{replyingTo.author}</span>
						<a href="#{replyingTo.id}" class="text-surface-500 hover:text-accent">#{replyingTo.id}</a>
					</span>
					<button 
						type="button"
						class="text-surface-500 hover:text-surface-300 p-1"
						onclick={cancelReply}
						title="Cancel reply"
					>
						<X size={14} />
					</button>
				</div>
				<p class="text-sm text-surface-400 italic">
					"{truncateQuote(replyingTo.content)}"
				</p>
			</div>
		{/if}

		<div class="bg-surface-800 rounded-xl border border-surface-700 focus-within:border-accent transition-colors">
			<textarea
				class="w-full bg-transparent p-4 text-surface-100 placeholder-surface-500 resize-none focus:outline-none min-h-[100px] font-mono text-sm"
				placeholder={replyingTo ? "Write your reply..." : "Add a comment... (Markdown supported)"}
				bind:value={newComment}
			></textarea>
			<div class="flex justify-between items-center p-2 border-t border-surface-700">
				<span class="text-xs text-surface-500 px-2">Markdown supported</span>
				<button 
					type="submit" 
					class="btn btn-primary"
					disabled={!newComment.trim() || isSubmitting}
				>
					<Send size={16} />
					{isSubmitting ? 'Sending...' : (replyingTo ? 'Reply' : 'Comment')}
				</button>
			</div>
		</div>
	</form>
</div>

<!-- Click outside to close menus -->
<svelte:window onclick={closeMenus} />

<style>
	@keyframes flash {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	.animate-flash {
		animation: flash 0.5s ease-in-out 3;
	}
</style>

<script lang="ts">
	import type { Comment } from '$lib/db/schema';
	import { Send, MessageSquare, Reply, Edit2, Trash2, MoreVertical, X, Check, Quote, Eye, Edit3, SmilePlus } from 'lucide-svelte';
	import MarkdownContent from './MarkdownContent.svelte';
	import MentionInput from './MentionInput.svelte';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { newCommentIds } from '$lib/stores/websocket';
	import RelativeTime from './RelativeTime.svelte';
	import { settings } from '$lib/stores/settings';

	interface Props {
		comments: Comment[];
		onAddComment: (content: string) => Promise<void>;
		onEditComment?: (commentId: number, content: string) => Promise<void>;
		onDeleteComment?: (commentId: number, hard: boolean) => Promise<void>;
		onRefresh?: () => Promise<void>;
	}

	let { comments, onAddComment, onEditComment, onDeleteComment, onRefresh }: Props = $props();

	let newComment = $state('');
	let isSubmitting = $state(false);
	let replyingTo = $state<Comment | null>(null);
	let editingComment = $state<number | null>(null);
	let editContent = $state('');
	let highlightedComment = $state<number | null>(null);
	let showMenuFor = $state<number | null>(null);
	let showPreview = $state(false);
	let showEditPreview = $state(false);
	let showEmojiPicker = $state<number | null>(null);

	const quickEmojis = ['👍', '👎', '❤️', '🎉', '😄', '🤔', '👀', '🚀'];

	function parseReactions(reactionsJson: string | null | undefined): Record<string, string[]> {
		if (!reactionsJson) return {};
		try {
			return JSON.parse(reactionsJson);
		} catch {
			return {};
		}
	}

	async function toggleReaction(commentId: number, emoji: string) {
		const user = settings.getCurrentUser();
		const comment = comments.find(c => c.id === commentId);
		if (!comment) return;

		const reactions = parseReactions(comment.reactions);
		const hasReacted = reactions[emoji]?.includes(user);

		const method = hasReacted ? 'DELETE' : 'POST';
		await fetch(`/api/comments/${commentId}/reactions`, {
			method,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ emoji, user })
		});

		showEmojiPicker = null;
		if (onRefresh) await onRefresh();
	}

	onMount(() => {
		if (browser) {
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
		
		let content = newComment;
		if (replyingTo) {
			const quotedLines = replyingTo.content.split('\n').map(line => `> ${line}`).join('\n');
			// Use commentNumber for display, but link to id for scrolling
			content = `**@${replyingTo.author}** [#${replyingTo.commentNumber}](#${replyingTo.id})\n${quotedLines}\n\n${newComment}`;
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
		if (hard && !confirm('DELETE PERMANENTLY?')) return;
		
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

	function getCommentLink(commentId: number) {
		if (browser) {
			return `${window.location.pathname}#${commentId}`;
		}
		return `#${commentId}`;
	}

	function truncateQuote(content: string, maxLength = 80): string {
		const plain = content.replace(/[#*`>\[\]()]/g, '').replace(/\n/g, ' ').trim();
		return plain.length > maxLength ? plain.slice(0, maxLength) + '...' : plain;
	}
</script>

<div class="space-y-3">
	<div class="panel-header">
		<MessageSquare size={12} />
		<span>COMMENTS ({comments.filter(c => !c.isDeleted).length})</span>
	</div>

	<!-- Comment List -->
	<div class="space-y-1">
		{#each comments as comment (comment.id)}
			{@const isHighlighted = highlightedComment === comment.id}
			{@const isNew = $newCommentIds.has(comment.id)}
			
			<div 
				id="comment-{comment.id}"
				class="group border transition-all duration-300 p-2 {isHighlighted ? 'bg-cyber-muted border-cyber-dim animate-flash' : 'bg-void-100 border-void-50'} {isNew ? 'animate-new-comment' : ''}"
			>
				{#if comment.isDeleted}
					<p class="text-ghost-dim italic text-xs">[deleted]</p>
				{:else if editingComment === comment.id}
					<!-- Edit Mode -->
					<div class="space-y-2">
						<div class="flex items-center bg-void-200 border border-void-50 w-fit">
							<button 
								type="button"
								class="p-0.5 px-1.5 text-2xs flex items-center gap-1 transition-colors
									{!showEditPreview ? 'bg-cyber-muted text-cyber' : 'text-ghost-dim hover:text-ghost'}"
								onclick={() => showEditPreview = false}
							>
								<Edit3 size={8} />
								WRITE
							</button>
							<button 
								type="button"
								class="p-0.5 px-1.5 text-2xs flex items-center gap-1 transition-colors
									{showEditPreview ? 'bg-cyber-muted text-cyber' : 'text-ghost-dim hover:text-ghost'}"
								onclick={() => showEditPreview = true}
							>
								<Eye size={8} />
								PREVIEW
							</button>
						</div>
						{#if showEditPreview}
							<div class="input min-h-[60px] text-xs bg-void-200">
								{#if editContent.trim()}
									<MarkdownContent content={editContent} />
								{:else}
									<p class="text-ghost-dim italic">Nothing to preview</p>
								{/if}
							</div>
						{:else}
						<textarea
							class="input min-h-[60px] text-xs resize-y"
							bind:value={editContent}
						></textarea>
						{/if}
						<div class="flex justify-end gap-1">
							<button class="btn btn-ghost text-2xs" onclick={cancelEdit}>
								<X size={10} /> CANCEL
							</button>
							<button 
								class="btn btn-primary text-2xs" 
								onclick={() => handleEdit(comment.id)}
								disabled={isSubmitting}
							>
								<Check size={10} /> SAVE
							</button>
						</div>
					</div>
				{:else}
					<div class="flex items-start justify-between gap-2">
						<div class="flex items-center gap-2 text-2xs flex-wrap">
							<span class="w-5 h-5 bg-cyber/10 border border-cyber/30 flex items-center justify-center text-cyber text-2xs font-medium">
								{(comment.author || 'A').charAt(0).toUpperCase()}
							</span>
							<span class="text-ghost-bright">{comment.author || 'anon'}</span>
							<a 
								href={getCommentLink(comment.id)} 
								class="text-ghost-dim hover:text-cyber"
								title="Link to comment"
							>
								#{comment.commentNumber}
							</a>
							<span class="text-ghost-dim"><RelativeTime timestamp={comment.createdAt} /></span>
							{#if comment.editedAt}
								<span class="text-ghost-dim">(edited)</span>
							{/if}
						</div>

						<!-- Actions Menu -->
						<div class="relative flex-shrink-0">
							<button 
								class="p-1 text-ghost-dim hover:text-ghost transition-colors opacity-0 group-hover:opacity-100"
								onclick={(e) => toggleMenu(e, comment.id)}
								title="Actions"
							>
								<MoreVertical size={12} />
							</button>

							{#if showMenuFor === comment.id}
								<div class="absolute right-0 top-full mt-1 bg-void-100 border border-void-50 z-20 min-w-[120px]">
									<button 
										class="w-full px-2 py-1 text-left text-2xs text-ghost hover:bg-void-50 flex items-center gap-1.5"
										onclick={(e) => handleMenuAction(e, () => startReply(comment))}
									>
										<Reply size={10} /> Reply
									</button>
									<button 
										class="w-full px-2 py-1 text-left text-2xs text-ghost hover:bg-void-50 flex items-center gap-1.5"
										onclick={(e) => handleMenuAction(e, () => startEdit(comment))}
									>
										<Edit2 size={10} /> Edit
									</button>
									<div class="border-t border-void-50"></div>
									<button 
										class="w-full px-2 py-1 text-left text-2xs text-ghost hover:bg-void-50 flex items-center gap-1.5"
										onclick={(e) => handleMenuAction(e, () => handleDelete(comment.id, false))}
									>
										<Trash2 size={10} /> Hide
									</button>
									<button 
										class="w-full px-2 py-1 text-left text-2xs text-priority-critical hover:bg-priority-critical/10 flex items-center gap-1.5"
										onclick={(e) => handleMenuAction(e, () => handleDelete(comment.id, true))}
									>
										<Trash2 size={10} /> Purge
									</button>
								</div>
							{/if}
						</div>
					</div>

					<div class="mt-1.5 text-xs">
						<MarkdownContent content={comment.content} />
					</div>

					<!-- Reactions Display -->
					{@const reactions = parseReactions(comment.reactions)}
					{#if Object.keys(reactions).length > 0}
						<div class="flex flex-wrap gap-1 mt-2">
							{#each Object.entries(reactions) as [emoji, users]}
								{@const hasReacted = users.includes(settings.getCurrentUser())}
								<button 
									class="inline-flex items-center gap-1 px-1.5 py-0.5 text-2xs border transition-colors
										{hasReacted ? 'bg-cyber-muted border-cyber-dim text-cyber' : 'bg-void-200 border-void-50 text-ghost hover:border-ghost-dim'}"
									onclick={() => toggleReaction(comment.id, emoji)}
									title={users.join(', ')}
								>
									<span>{emoji}</span>
									<span>{users.length}</span>
								</button>
							{/each}
						</div>
					{/if}

					<!-- Quick Actions -->
					<div class="mt-2 pt-1.5 border-t border-void-50 flex items-center gap-2">
						<button 
							class="text-2xs text-ghost-dim hover:text-cyber flex items-center gap-1 transition-colors"
							onclick={() => startReply(comment)}
						>
							<Reply size={10} /> reply
						</button>

						<!-- Add Reaction Button -->
						<div class="relative">
							<button 
								class="text-2xs text-ghost-dim hover:text-cyber flex items-center gap-1 transition-colors"
								onclick={(e) => { e.stopPropagation(); showEmojiPicker = showEmojiPicker === comment.id ? null : comment.id; }}
							>
								<SmilePlus size={10} /> react
							</button>

							{#if showEmojiPicker === comment.id}
								<div class="absolute bottom-full left-0 mb-1 bg-void-100 border border-void-50 p-1 flex gap-0.5 z-20">
									{#each quickEmojis as emoji}
										<button 
											class="w-6 h-6 flex items-center justify-center hover:bg-void-50 transition-colors"
											onclick={() => toggleReaction(comment.id, emoji)}
										>
											{emoji}
										</button>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<div class="text-center py-6 text-ghost-dim text-xs">
				No comments
			</div>
		{/each}
	</div>

	<!-- Add Comment Form -->
	<form id="comment-form" onsubmit={handleSubmit} class="mt-3">
		<!-- Reply Quote Box -->
		{#if replyingTo}
			<div class="mb-2 p-2 bg-void-200 border-l-2 border-cyber">
				<div class="flex items-center justify-between mb-1">
					<span class="text-2xs text-ghost-dim flex items-center gap-1">
						<Quote size={10} />
						replying to <span class="text-cyber">@{replyingTo.author}</span>
						<a href="#{replyingTo.id}" class="text-ghost-dim hover:text-cyber">#{replyingTo.commentNumber}</a>
					</span>
					<button 
						type="button"
						class="text-ghost-dim hover:text-ghost p-0.5"
						onclick={cancelReply}
					>
						<X size={12} />
					</button>
				</div>
				<p class="text-2xs text-ghost-dim italic truncate">
					"{truncateQuote(replyingTo.content)}"
				</p>
			</div>
		{/if}

		<div class="bg-void-100 border border-void-50 focus-within:border-cyber-dim transition-colors">
			<!-- Write/Preview Toggle -->
			<div class="flex items-center justify-between p-1.5 border-b border-void-50">
				<div class="flex items-center bg-void-200 border border-void-50">
					<button 
						type="button"
						class="p-0.5 px-1.5 text-2xs flex items-center gap-1 transition-colors
							{!showPreview ? 'bg-cyber-muted text-cyber' : 'text-ghost-dim hover:text-ghost'}"
						onclick={() => showPreview = false}
					>
						<Edit3 size={8} />
						WRITE
					</button>
					<button 
						type="button"
						class="p-0.5 px-1.5 text-2xs flex items-center gap-1 transition-colors
							{showPreview ? 'bg-cyber-muted text-cyber' : 'text-ghost-dim hover:text-ghost'}"
						onclick={() => showPreview = true}
					>
						<Eye size={8} />
						PREVIEW
					</button>
				</div>
			</div>

			{#if showPreview}
				<div class="p-2 min-h-[60px] text-xs">
					{#if newComment.trim()}
						<MarkdownContent content={newComment} />
					{:else}
						<p class="text-ghost-dim italic">Nothing to preview</p>
					{/if}
				</div>
			{:else}
				<MentionInput
					value={newComment}
					onchange={(v) => newComment = v}
					placeholder={replyingTo ? "Reply... (use @ to mention)" : "Comment... (markdown, use @ to mention)"}
					rows={3}
					class="w-full bg-transparent border-none focus:ring-0 min-h-[60px]"
				/>
			{/if}
			<div class="flex justify-end items-center p-1.5 border-t border-void-50">
				<button 
					type="submit" 
					class="btn btn-primary text-2xs"
					disabled={!newComment.trim() || isSubmitting}
				>
					<Send size={10} />
					{isSubmitting ? '...' : (replyingTo ? 'REPLY' : 'POST')}
				</button>
			</div>
		</div>
	</form>
</div>

<!-- Click outside to close menus -->
<svelte:window onclick={closeMenus} />

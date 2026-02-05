<script lang="ts">
	import { Upload, File, X, FileImage, FileText, FileArchive } from 'lucide-svelte';
	import type { Attachment } from '$lib/db/schema';

	interface Props {
		issueId: number;
		commentId?: number;
		attachments?: Attachment[];
		onUpload?: (attachment: Attachment) => void;
		onDelete?: (id: number) => void;
		uploadedBy?: string;
	}

	let { issueId, commentId, attachments = [], onUpload, onDelete, uploadedBy = 'System' }: Props = $props();

	let uploading = $state(false);
	let dragOver = $state(false);
	let fileInput: HTMLInputElement;

	function getFileIcon(mimeType: string) {
		if (mimeType.startsWith('image/')) return FileImage;
		if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('compressed')) return FileArchive;
		return FileText;
	}

	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	async function handleFiles(files: FileList | null) {
		if (!files || files.length === 0) return;

		uploading = true;

		for (const file of Array.from(files)) {
			const formData = new FormData();
			formData.append('file', file);
			formData.append('issueId', issueId.toString());
			if (commentId) formData.append('commentId', commentId.toString());
			formData.append('uploadedBy', uploadedBy);

			try {
				const res = await fetch('/api/attachments', {
					method: 'POST',
					body: formData
				});

				if (res.ok) {
					const attachment = await res.json();
					onUpload?.(attachment);
				}
			} catch (error) {
				console.error('Upload failed:', error);
			}
		}

		uploading = false;
		if (fileInput) fileInput.value = '';
	}

	async function handleDelete(id: number) {
		const res = await fetch(`/api/attachments/${id}`, { method: 'DELETE' });
		if (res.ok) {
			onDelete?.(id);
		}
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		handleFiles(e.dataTransfer?.files || null);
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragOver = true;
	}

	function handleDragLeave() {
		dragOver = false;
	}
</script>

<div class="space-y-2">
	<!-- Upload zone -->
	<div 
		class="border-2 border-dashed p-3 transition-colors cursor-pointer
			{dragOver ? 'border-cyber bg-cyber/10' : 'border-void-50 hover:border-ghost-dim'}"
		ondrop={handleDrop}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		onclick={() => fileInput?.click()}
		role="button"
		tabindex="0"
		onkeydown={(e) => e.key === 'Enter' && fileInput?.click()}
	>
		<input 
			type="file" 
			multiple 
			class="hidden" 
			bind:this={fileInput}
			onchange={(e) => handleFiles(e.currentTarget.files)}
		/>
		
		<div class="flex flex-col items-center gap-1 text-center">
			{#if uploading}
				<div class="animate-pulse text-cyber">
					<Upload size={20} />
				</div>
				<span class="text-2xs text-ghost-dim">Uploading...</span>
			{:else}
				<Upload size={20} class="text-ghost-dim" />
				<span class="text-2xs text-ghost-dim">
					Drop files here or <span class="text-cyber">click to browse</span>
				</span>
				<span class="text-2xs text-ghost-dim opacity-50">Max 10MB per file</span>
			{/if}
		</div>
	</div>

	<!-- Attachment list -->
	{#if attachments.length > 0}
		<div class="space-y-1">
			{#each attachments as attachment}
				{@const FileIcon = getFileIcon(attachment.mimeType)}
				<div class="flex items-center gap-2 p-1.5 bg-void-200 border border-void-50 group">
					{#if attachment.mimeType.startsWith('image/')}
						<img 
							src="/uploads/{attachment.filename}" 
							alt={attachment.originalName}
							class="w-8 h-8 object-cover bg-void-100"
						/>
					{:else}
						<div class="w-8 h-8 flex items-center justify-center bg-void-100">
							<FileIcon size={16} class="text-ghost-dim" />
						</div>
					{/if}
					
					<div class="flex-1 min-w-0">
						<a 
							href="/uploads/{attachment.filename}" 
							target="_blank" 
							class="text-xs text-ghost hover:text-cyber truncate block"
							download={attachment.originalName}
						>
							{attachment.originalName}
						</a>
						<span class="text-2xs text-ghost-dim">{formatSize(attachment.size)}</span>
					</div>
					
					<button 
						class="btn btn-ghost p-1 opacity-0 group-hover:opacity-100 text-ghost-dim hover:text-blood"
						onclick={() => handleDelete(attachment.id)}
					>
						<X size={12} />
					</button>
				</div>
			{/each}
		</div>
	{/if}
</div>

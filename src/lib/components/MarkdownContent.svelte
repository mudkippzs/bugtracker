<script lang="ts">
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';
	import { browser } from '$app/environment';

	interface Props {
		content: string;
	}

	let { content }: Props = $props();

	// Configure marked
	marked.setOptions({
		gfm: true,
		breaks: true
	});

	// Highlight @mentions
	function highlightMentions(html: string): string {
		// Match @username patterns (alphanumeric and underscores)
		return html.replace(/@([a-zA-Z0-9_]+)/g, '<span class="mention text-cyber bg-cyber/10 px-1 rounded cursor-pointer hover:bg-cyber/20">@$1</span>');
	}

	let html = $derived(() => {
		if (!content) return '';
		const rawHtml = marked.parse(content) as string;
		if (browser) {
			const sanitized = DOMPurify.sanitize(rawHtml, {
				ADD_ATTR: ['class'] // Allow class attributes for mentions
			});
			return highlightMentions(sanitized);
		}
		// On server, return raw (will be hydrated on client)
		return rawHtml;
	});
</script>

<div class="markdown-content prose prose-invert max-w-none">
	{@html html()}
</div>

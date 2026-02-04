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

	let html = $derived(() => {
		if (!content) return '';
		const rawHtml = marked.parse(content) as string;
		if (browser) {
			return DOMPurify.sanitize(rawHtml);
		}
		// On server, return raw (will be hydrated on client)
		return rawHtml;
	});
</script>

<div class="markdown-content prose prose-invert max-w-none">
	{@html html()}
</div>

import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Create a window object for DOMPurify on the server
const window = new JSDOM('').window;
const purify = DOMPurify(window as unknown as Window);

// Configure marked for GFM (GitHub Flavored Markdown)
marked.setOptions({
	gfm: true,
	breaks: true
});

/**
 * Parse markdown content and sanitize the HTML output
 */
export function parseMarkdown(content: string): string {
	if (!content) return '';
	const html = marked.parse(content) as string;
	return purify.sanitize(html, {
		ALLOWED_TAGS: [
			'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
			'p', 'br', 'hr',
			'ul', 'ol', 'li',
			'blockquote', 'pre', 'code',
			'strong', 'em', 'del', 's',
			'a', 'img',
			'table', 'thead', 'tbody', 'tr', 'th', 'td',
			'div', 'span'
		],
		ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel']
	});
}

/**
 * Strip markdown and return plain text (for previews)
 */
export function stripMarkdown(content: string, maxLength = 200): string {
	if (!content) return '';
	// Remove markdown syntax
	const plain = content
		.replace(/#{1,6}\s/g, '')
		.replace(/\*\*(.+?)\*\*/g, '$1')
		.replace(/\*(.+?)\*/g, '$1')
		.replace(/`(.+?)`/g, '$1')
		.replace(/\[(.+?)\]\(.+?\)/g, '$1')
		.replace(/!\[.+?\]\(.+?\)/g, '')
		.replace(/>\s/g, '')
		.replace(/[-*+]\s/g, '')
		.replace(/\n/g, ' ')
		.trim();
	
	return plain.length > maxLength ? plain.slice(0, maxLength) + '...' : plain;
}

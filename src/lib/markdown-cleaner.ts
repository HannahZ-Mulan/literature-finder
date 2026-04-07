/**
 * Markdown formatting utilities for chat responses
 */

/**
 * Convert markdown to plain text with basic formatting
 * This removes markdown symbols while preserving readability
 */
export function cleanMarkdown(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // Remove bold/italic markers
  cleaned = cleaned.replace(/\*\*\*(.+?)\*\*\*/g, '$1'); // ***bold***
  cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '$1');   // **bold**
  cleaned = cleaned.replace(/\*(.+?)\*/g, '$1');      // *italic*
  cleaned = cleaned.replace(/___(.+?)___/g, '$1');    // ___bold___
  cleaned = cleaned.replace(/__(.+?)__/g, '$1');      // __bold__
  cleaned = cleaned.replace(/_(.+?)_/g, '$1');        // _italic_

  // Remove headers but keep the text
  cleaned = cleaned.replace(/^#+\s+(.+)$/gm, '$1');

  // Remove code blocks
  cleaned = cleaned.replace(/```[\s\S]*?```/g, (match) => {
    return match.replace(/```/g, '').trim();
  });

  // Remove inline code
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');

  // Remove strikethrough
  cleaned = cleaned.replace(/~~(.+?)~~/g, '$1');

  // Convert bullet points to plain text with proper spacing
  cleaned = cleaned.replace(/^[\s]*[-*+]\s+/gm, '• ');
  cleaned = cleaned.replace(/^[\s]*\d+\.\s+/gm, '• ');

  // Clean up excessive whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/[ \t]+/g, ' ');

  // Clean up list items that are too close together
  cleaned = cleaned.replace(/([^\n])\n• /g, '$1\n\n• ');

  return cleaned.trim();
}

/**
 * Format markdown for display with HTML rendering
 * This converts markdown to HTML for proper rendering
 */
export function markdownToHTML(text: string): string {
  if (!text) return '';

  let html = text;

  // Escape HTML characters first
  html = html.replace(/&/g, '&amp;');
  html = html.replace(/</g, '&lt;');
  html = html.replace(/>/g, '&gt;');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<strong>$1</strong>');
  html = html.replace(/^## (.+)$/gm, '<strong>$1</strong>');
  html = html.replace(/^# (.+)$/gm, '<strong>$1</strong>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">$1</code>');

  // Line breaks
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');

  // Wrap in paragraphs
  html = '<p>' + html + '</p>';

  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p><\/p><p>/g, '<p>');

  return html;
}

/**
 * Simple text formatter that preserves some structure without full markdown
 */
export function formatChatMessage(text: string): string {
  return cleanMarkdown(text);
}

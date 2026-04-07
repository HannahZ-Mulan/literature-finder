/**
 * Text formatting utilities for PDF extracted text
 */

/**
 * Clean and format PDF extracted text for better readability
 */
export function formatPDFText(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // 1. Replace multiple consecutive spaces with a single space
  cleaned = cleaned.replace(/[ \t]+/g, ' ');

  // 2. Replace multiple consecutive newlines with double newlines (paragraph break)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // 3. Remove hyphens at end of lines (common in PDFs)
  cleaned = cleaned.replace(/-\n/g, '');

  // 4. Fix common PDF artifacts
  cleaned = cleaned.replace(/\f/g, '\n\n'); // Form feed to paragraph break
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Remove control characters

  // 5. Ensure proper spacing after punctuation
  cleaned = cleaned.replace(/([.!?])\s*([A-Z])/g, '$1\n\n$2'); // Sentence endings to new paragraph

  // 6. Fix common spacing issues around punctuation
  cleaned = cleaned.replace(/\s+([.,!?;:)])/g, '$1');
  cleaned = cleaned.replace(/([(:])\s+/g, '$1 ');

  // 7. Remove page numbers and headers (common patterns)
  cleaned = cleaned.replace(/^\d+\s*$/gm, ''); // Standalone numbers
  cleaned = cleaned.replace(/^(第\s*\d+\s*页|Page\s*\d+)$/gmi, ''); // Page markers

  // 8. Trim whitespace from each line
  cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');

  // 9. Remove empty lines at start and end
  cleaned = cleaned.replace(/^\n+|\n+$/g, '');

  return cleaned;
}

/**
 * Truncate text to a specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Extract a preview snippet from text
 */
export function extractPreview(text: string, sentences: number = 3): string {
  if (!text) return '';

  const formatted = formatPDFText(text);
  const sentenceEndings = /[.!?。！？]+\s+/g;
  const matches = formatted.match(sentenceEndings);

  if (!matches || matches.length < sentences) {
    return truncateText(formatted, 300);
  }

  let count = 0;
  let result = '';
  let lastIndex = 0;

  for (const match of matches) {
    if (count >= sentences) break;
    const index = formatted.indexOf(match, lastIndex);
    if (index !== -1) {
      result = formatted.slice(0, index + match.length);
      lastIndex = index + match.length;
      count++;
    }
  }

  return result.trim();
}

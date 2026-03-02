import type { LiteratureEntry } from './types';

export type CitationFormat = 'bibtex' | 'endnote' | 'ris' | 'plain';

/**
 * Convert literature entry to BibTeX format
 */
export function toBibTeX(literature: LiteratureEntry): string {
  const citeKey = generateCiteKey(literature);

  let bibtex = `@${determineEntryType(literature)}{${citeKey},\n`;

  // Required fields
  bibtex += `  title = {${escapeBraces(literature.title)}},\n`;

  if (literature.authors) {
    const authors = formatAuthorsBibTeX(literature.authors);
    bibtex += `  author = {${authors}},\n`;
  }

  if (literature.year) {
    bibtex += `  year = {${literature.year}},\n`;
  }

  // Optional fields
  if (literature.journal) {
    bibtex += `  journal = {${literature.journal}},\n`;
  }

  if (literature.volume) {
    bibtex += `  volume = {${literature.volume}},\n`;
  }

  if (literature.issue) {
    bibtex += `  number = {${literature.issue}},\n`;
  }

  if (literature.pages) {
    bibtex += `  pages = {${literature.pages}},\n`;
  }

  if (literature.doi) {
    bibtex += `  doi = {${literature.doi}},\n`;
  }

  if (literature.url) {
    bibtex += `  url = {${literature.url}},\n`;
  }

  if (literature.abstract) {
    bibtex += `  abstract = {${escapeBraces(literature.abstract)}},\n`;
  }

  if (literature.keywords && literature.keywords.length > 0) {
    bibtex += `  keywords = {${literature.keywords.join(', ')}},\n`;
  }

  bibtex += `}\n`;

  return bibtex;
}

/**
 * Convert literature entry to EndNote format
 */
export function toEndNote(literature: LiteratureEntry): string {
  let endnote = `%0 Generic\n`;
  endnote += `%T ${literature.title}\n`;

  if (literature.authors) {
    const authors = formatAuthorsPlain(literature.authors);
    endnote += `%A ${authors}\n`;
  }

  if (literature.year) {
    endnote += `%D ${literature.year}\n`;
  }

  if (literature.journal) {
    endnote += `%J ${literature.journal}\n`;
  }

  if (literature.volume) {
    endnote += `%V ${literature.volume}\n`;
  }

  if (literature.issue) {
    endnote += `%N ${literature.issue}\n`;
  }

  if (literature.pages) {
    endnote += `%P ${literature.pages}\n`;
  }

  if (literature.doi) {
    endnote += `%R ${literature.doi}\n`;
  }

  if (literature.url) {
    endnote += `%U ${literature.url}\n`;
  }

  if (literature.abstract) {
    endnote += `%X ${literature.abstract}\n`;
  }

  endnote += `\n`;

  return endnote;
}

/**
 * Convert literature entry to RIS format
 */
export function toRIS(literature: LiteratureEntry): string {
  const typeMap: Record<string, string> = {
    'journal-article': 'JOUR',
    'conference-paper': 'CONF',
    'preprint': 'GEN',
    'book': 'BOOK',
    'default': 'GEN'
  };

  const type = typeMap[literature.type || 'default'] || typeMap.default;

  let ris = `TY  - ${type}\n`;

  ris += `TI  - ${literature.title}\n`;

  if (literature.authors) {
    const authors = Array.isArray(literature.authors) ? literature.authors : [];
    authors.forEach((author: any) => {
      const name = typeof author === 'string' ? author : author.name || '';
      if (name) {
        ris += `AU  - ${name}\n`;
      }
    });
  }

  if (literature.year) {
    ris += `PY  - ${literature.year}\n`;
  }

  if (literature.journal) {
    ris += `T2  - ${literature.journal}\n`;
    ris += `JO  - ${literature.journal}\n`;
  }

  if (literature.volume) {
    ris += `VL  - ${literature.volume}\n`;
  }

  if (literature.issue) {
    ris += `IS  - ${literature.issue}\n`;
  }

  if (literature.pages) {
    ris += `SP  - ${literature.pages}\n`;
  }

  if (literature.doi) {
    ris += `DO  - ${literature.doi}\n`;
  }

  if (literature.url) {
    ris += `UR  - ${literature.url}\n`;
  }

  if (literature.abstract) {
    ris += `AB  - ${literature.abstract}\n`;
  }

  if (literature.keywords && literature.keywords.length > 0) {
    literature.keywords.forEach((keyword: string) => {
      ris += `KW  - ${keyword}\n`;
    });
  }

  ris += `ER  - \n`;

  return ris;
}

/**
 * Convert literature entry to plain text format
 */
export function toPlainText(literature: LiteratureEntry): string {
  let text = '';

  if (literature.authors) {
    text += formatAuthorsPlain(literature.authors);
    text += '. ';
  }

  text += literature.title;

  if (literature.journal) {
    text += `. ${literature.journal}`;
  }

  if (literature.year) {
    text += ` (${literature.year})`;
  }

  if (literature.volume) {
    text += `, ${literature.volume}`;
  }

  if (literature.issue) {
    text += `(${literature.issue})`;
  }

  if (literature.pages) {
    text += `, ${literature.pages}`;
  }

  if (literature.doi) {
    text += `. DOI: ${literature.doi}`;
  }

  text += '.';

  return text;
}

/**
 * Export multiple entries to BibTeX
 */
export function exportMultipleToBibTeX(literatures: LiteratureEntry[]): string {
  return literatures.map(entry => toBibTeX(entry)).join('\n\n');
}

/**
 * Export multiple entries to EndNote
 */
export function exportMultipleToEndNote(literatures: LiteratureEntry[]): string {
  return literatures.map(entry => toEndNote(entry)).join('\n');
}

/**
 * Export multiple entries to RIS
 */
export function exportMultipleToRIS(literatures: LiteratureEntry[]): string {
  return literatures.map(entry => toRIS(entry)).join('\n');
}

// Helper functions

/**
 * Generate a unique citation key for BibTeX
 */
function generateCiteKey(literature: LiteratureEntry): string {
  let key = '';

  // First author's last name
  if (literature.authors && literature.authors.length > 0) {
    const firstAuthor = literature.authors[0];
    const name = typeof firstAuthor === 'string' ? firstAuthor : firstAuthor.name || '';
    const lastName = name.split(' ').pop() || name;
    key += lastName.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  // Year
  if (literature.year) {
    key += literature.year;
  }

  // First word of title (no spaces, no special chars)
  if (literature.title) {
    const firstWord = literature.title.split(/\s+/)[0] || '';
    key += firstWord.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  return key || 'citation';
}

/**
 * Determine BibTeX entry type
 */
function determineEntryType(literature: LiteratureEntry): string {
  const type = literature.type || '';

  if (type.includes('journal') || type.includes('article')) {
    return 'article';
  } else if (type.includes('conference')) {
    return 'inproceedings';
  } else if (type.includes('book')) {
    return 'book';
  } else if (type.includes('preprint') || literature.source === 'arxiv') {
    return 'misc';
  }

  return 'article';
}

/**
 * Format authors for BibTeX (and: John Doe)
 */
function formatAuthorsBibTeX(authors: any): string {
  if (!authors) return '';

  const authorList = Array.isArray(authors) ? authors : [];

  return authorList
    .map((author: any) => {
      const name = typeof author === 'string' ? author : author.name || '';
      const parts = name.trim().split(/\s+/);

      if (parts.length === 1) {
        return parts[0];
      }

      const lastName = parts.pop() || '';
      const firstNames = parts.join(' ');

      return `${lastName}, ${firstNames}`;
    })
    .join(' and ');
}

/**
 * Format authors for plain text (John Doe and Jane Smith)
 */
function formatAuthorsPlain(authors: any): string {
  if (!authors) return '';

  const authorList = Array.isArray(authors) ? authors : [];

  return authorList
    .map((author: any) => typeof author === 'string' ? author : author.name || '')
    .join(', ');
}

/**
 * Escape braces in BibTeX
 */
function escapeBraces(text: string): string {
  return text.replace(/[{]/g, '\\{').replace(/[}]/g, '\\}');
}

/**
 * Get file extension for citation format
 */
export function getFileExtension(format: CitationFormat): string {
  const extensions: Record<CitationFormat, string> = {
    bibtex: '.bib',
    endnote: '.enw',
    ris: '.ris',
    plain: '.txt'
  };

  return extensions[format] || '.txt';
}

/**
 * Get MIME type for citation format
 */
export function getMimeType(format: CitationFormat): string {
  const mimeTypes: Record<CitationFormat, string> = {
    bibtex: 'application/x-bibtex',
    endnote: 'application/x-endnote-refer',
    ris: 'application/x-research-info-systems',
    plain: 'text/plain'
  };

  return mimeTypes[format] || 'text/plain';
}

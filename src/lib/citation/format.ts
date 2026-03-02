export interface LiteratureForCitation {
  title: string;
  authors: Array<{ name: string }>;
  publication_date?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
}

export type CitationFormat = 'apa' | 'mla' | 'chicago' | 'harvard' | 'vancouver';

/**
 * Parse author name and return [last name, first name/middle initials]
 * Supports formats: "Smith, John" or "John Smith"
 */
function parseAuthorName(name: string): [string, string] {
  const trimmedName = name.trim();

  // Check if name is in "Last, First" format
  if (trimmedName.includes(',')) {
    const parts = trimmedName.split(',').map(p => p.trim());
    const lastName = parts[0];
    const firstPart = parts.slice(1).join(' ');
    return [lastName, firstPart];
  }

  // Otherwise, assume "First Middle Last" format
  const parts = trimmedName.split(/\s+/);
  if (parts.length === 1) return [parts[0], ''];
  const lastName = parts[parts.length - 1];
  const firstPart = parts.slice(0, -1).join(' ');
  return [lastName, firstPart];
}

/**
 * Convert name to APA format: Smith, J. R.
 */
function toApaFormat(name: string): string {
  const [lastName, firstPart] = parseAuthorName(name);
  if (!firstPart) return lastName;

  // Convert first/middle names to initials
  const initials = firstPart
    .split(/\s+/)
    .map((n) => (n.length > 0 ? n[0].toUpperCase() + '.' : ''))
    .join(' ');

  return `${lastName}, ${initials}`;
}

/**
 * Convert name to MLA/Chicago format: Smith, John
 */
function toFullFormat(name: string): string {
  const [lastName, firstPart] = parseAuthorName(name);
  if (!firstPart) return lastName;
  return `${lastName}, ${firstPart}`;
}

/**
 * Format authors' names for different citation styles
 */
function formatAuthors(authors: Array<{ name: string }>, format: CitationFormat): string {
  if (authors.length === 0) return 'Unknown Author';

  switch (format) {
    case 'apa':
      if (authors.length === 1) return toApaFormat(authors[0].name);
      if (authors.length === 2) {
        return `${toApaFormat(authors[0].name)}, & ${toApaFormat(authors[1].name)}`;
      }
      // 3+ authors: First author, Second, et al.
      if (authors.length === 3) {
        return `${toApaFormat(authors[0].name)}, ${toApaFormat(authors[1].name)}, & ${toApaFormat(authors[2].name)}`;
      }
      // 4+ authors
      return `${toApaFormat(authors[0].name)}, ${toApaFormat(authors[1].name)}, et al.`;

    case 'mla':
      if (authors.length === 1) return toFullFormat(authors[0].name);
      if (authors.length === 2) {
        return `${toFullFormat(authors[0].name)}, and ${toFullFormat(authors[1].name)}`;
      }
      // 3+ authors: use et al.
      return `${toFullFormat(authors[0].name)}, et al.`;

    case 'chicago':
      if (authors.length === 1) return toFullFormat(authors[0].name);
      if (authors.length === 2) {
        return `${toFullFormat(authors[0].name)}, and ${toFullFormat(authors[1].name)}`;
      }
      if (authors.length === 3) {
        return `${toFullFormat(authors[0].name)}, ${toFullFormat(authors[1].name)}, and ${toFullFormat(authors[2].name)}`;
      }
      // 4+ authors: use et al.
      return `${toFullFormat(authors[0].name)}, et al.`;

    case 'harvard':
      return authors.map((a) => {
        const [lastName, firstPart] = parseAuthorName(a.name);
        if (!firstPart) return lastName;
        const initials = firstPart
          .split(/\s+/)
          .map((n) => (n.length > 0 ? n[0].toUpperCase() : ''))
          .join('');
        return `${lastName} ${initials}`;
      }).join(', ').replace(/, ([^,]+)$/, ' & $1');


    case 'vancouver':
      return authors.map((a, index) => {
        const [lastName, firstPart] = parseAuthorName(a.name);
        if (!firstPart) return lastName;
        const initials = firstPart
          .split(/\s+/)
          .map((n) => (n.length > 0 ? n[0].toUpperCase() : ''))
          .join('');
        return `${lastName} ${initials}`;
      }).join(', ');

    default:
      return authors.map((a) => a.name).join(', ');
  }
}

/**
 * Format date for citation
 */
function formatDate(dateString?: string): string {
  if (!dateString) return 'n.d.';
  const date = new Date(dateString);
  const year = date.getFullYear();
  return isNaN(year) ? 'n.d.' : year.toString();
}

/**
 * Generate APA 7th edition citation
 * Format: Author, A. A., & Author, B. B. (Year). Title of article. Journal Name, Volume(Issue), pages. DOI
 */
function formatApa(literature: LiteratureForCitation): string {
  const authors = formatAuthors(literature.authors, 'apa');
  const year = formatDate(literature.publication_date);

  // APA: Use sentence case for title
  const title = literature.title.charAt(0).toUpperCase() + literature.title.slice(1).toLowerCase();

  let citation = `${authors} (${year}). ${title}.`;

  if (literature.journal) {
    citation += ` ${literature.journal}`;
    if (literature.volume) {
      citation += `, ${literature.volume}`;
      if (literature.issue) {
        citation += `(${literature.issue})`;
      }
    }
    if (literature.pages) citation += `, ${literature.pages}`;
  }

  if (literature.doi) {
    citation += `. https://doi.org/${literature.doi}`;
  }

  return citation;
}

/**
 * Generate MLA 9th edition citation
 * Format: Author. "Title of Article." Journal Name, vol. Volume, no. Issue, Year, pp. Page range.
 */
function formatMla(literature: LiteratureForCitation): string {
  const authors = formatAuthors(literature.authors, 'mla');
  const year = formatDate(literature.publication_date);
  // MLA: Use sentence case for title in quotes
  const title = literature.title.charAt(0).toUpperCase() + literature.title.slice(1).toLowerCase();
  let citation = `${authors}. "${title}."`;

  if (literature.journal) {
    citation += ` ${literature.journal}`;
    if (literature.volume) citation += `, vol. ${literature.volume}`;
    if (literature.issue) citation += `, no. ${literature.issue}`;
    if (year !== 'n.d.') citation += `, ${year}`;
    if (literature.pages) citation += `, pp. ${literature.pages}`;
  } else {
    citation += '.';
  }

  return citation;
}

/**
 * Generate Chicago 18th edition author-date citation
 * Format: Author, First Name. Year. "Title of Article." Journal Name Volume, no. Issue (Year): Page range. DOI
 */
function formatChicago(literature: LiteratureForCitation): string {
  const authors = formatAuthors(literature.authors, 'chicago');
  const year = formatDate(literature.publication_date);
  // Chicago: Use sentence case for title in quotes
  const title = literature.title.charAt(0).toUpperCase() + literature.title.slice(1).toLowerCase();
  let citation = `${authors}. ${year}. "${title}."`;

  if (literature.journal) {
    citation += ` ${literature.journal}`;
    if (literature.volume) {
      citation += ` ${literature.volume}`;
      if (literature.issue) {
        citation += `, no. ${literature.issue}`;
      }
      citation += ` (${year})`;
      if (literature.pages) {
        citation += `: ${literature.pages}`;
      }
    } else if (literature.pages) {
      citation += ` (${year}): ${literature.pages}`;
    } else {
      citation += ` (${year})`;
    }
  }

  if (literature.doi) {
    citation += ` https://doi.org/${literature.doi}`;
  }

  return citation;
}

/**
 * Generate Harvard referencing style citation
 * Format: Author, Initials. (Year) 'Title of article', Journal Title, Volume(Issue), pp. page range.
 */
function formatHarvard(literature: LiteratureForCitation): string {
  const authors = formatAuthors(literature.authors, 'harvard');
  const year = formatDate(literature.publication_date);
  // Harvard: Use sentence case for title in single quotes
  const title = literature.title.charAt(0).toUpperCase() + literature.title.slice(1).toLowerCase();
  let citation = `${authors}. (${year}) '${title}'`;

  if (literature.journal) {
    citation += `, ${literature.journal}`;
    if (literature.volume) {
      citation += `, ${literature.volume}`;
      if (literature.issue) {
        citation += `(${literature.issue})`;
      }
    }
    if (literature.pages) {
      citation += `, pp. ${literature.pages}`;
    }
  }

  if (literature.doi) {
    citation += `. https://doi.org/${literature.doi}`;
  }

  return citation;
}

/**
 * Generate Vancouver referencing style citation
 * Format: Author(s). Title of article. Journal Name. Year Month Day;Volume(Issue):Pages. DOI
 * Note: Title uses sentence case, journal name not italicized, pages use abbreviated format
 */
function formatVancouver(literature: LiteratureForCitation): string {
  const authors = formatAuthors(literature.authors, 'vancouver');

  // Convert title to sentence case
  const title = literature.title.charAt(0).toUpperCase() + literature.title.slice(1).toLowerCase();

  // Convert journal to title case (each word capitalized)
  const journal = literature.journal
    ? literature.journal.toLowerCase().split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ')
    : '';

  // Get date in "YYYY Mon DD" format
  let dateStr = '';
  if (literature.publication_date) {
    const date = new Date(literature.publication_date);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const day = date.getDate();
      dateStr = `${year} ${month} ${day}`;
    }
  }

  // Abbreviate page numbers (e.g., 123-156 becomes 123-56)
  let pages = literature.pages;
  if (pages && pages.includes('-')) {
    const [start, end] = pages.split('-');
    if (end && end.length > 2) {
      // Keep only the last 2 digits of the end page
      pages = `${start}-${end.slice(-2)}`;
    }
  }

  // Build citation
  let citation = `${authors}. ${title}.`;

  if (journal) {
    citation += ` ${journal}.`;
  }

  if (dateStr) {
    citation += ` ${dateStr};`;
  }

  if (literature.volume) {
    citation += literature.volume;
    if (literature.issue) {
      citation += `(${literature.issue})`;
    }
  }

  if (pages) {
    citation += `:${pages}`;
  }

  if (literature.doi) {
    citation += `. doi:${literature.doi}`;
  }

  return citation;
}

/**
 * Main function to format literature citation
 */
export function formatCitation(
  literature: LiteratureForCitation,
  format: CitationFormat,
  id?: string
): string {
  switch (format) {
    case 'apa':
      return formatApa(literature);
    case 'mla':
      return formatMla(literature);
    case 'chicago':
      return formatChicago(literature);
    case 'harvard':
      return formatHarvard(literature);
    case 'vancouver':
      return formatVancouver(literature);
    default:
      throw new Error(`Unsupported citation format: ${format}`);
  }
}

/**
 * Format multiple literature items for bibliography
 */
export function formatBibliography(
  literatureList: Array<{ id: number } & LiteratureForCitation>,
  format: CitationFormat
): string {
  return literatureList
    .map((lit) => formatCitation(lit, format, lit.id.toString()))
    .join('\n\n');
}

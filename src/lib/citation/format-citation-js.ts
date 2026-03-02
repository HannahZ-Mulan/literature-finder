import Cite from 'citation-js';
import * as pluginCsl from '@citation-js/plugin-csl';
import { fetchDOIMetadata, extractPages } from '../doi/fetch-metadata';

// Configure citation-js to use CSL plugin
Cite.plugins.add(pluginCsl);

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
 * Journal abbreviation to full name mapping
 */
const JOURNAL_ABBREVIATIONS: Record<string, string> = {
  'PACM on Human-Computer Interaction': 'Proceedings of the ACM on Human-Computer Interaction',
  'PACM on Human-Computer Interaction 6': 'Proceedings of the ACM on Human-Computer Interaction',
  'J Artif Intell Res': 'Journal of Artificial Intelligence Research',
  'J ACM': 'Journal of the ACM',
  // Add more mappings as needed
};

/**
 * Expand journal abbreviation to full name
 */
function expandJournalName(name: string): string {
  // Direct match
  if (JOURNAL_ABBREVIATIONS[name]) {
    return JOURNAL_ABBREVIATIONS[name];
  }

  // Partial match (e.g., "PACM on Human-Computer Interaction 6" should match "PACM on Human-Computer Interaction")
  for (const [abbr, full] of Object.entries(JOURNAL_ABBREVIATIONS)) {
    if (name.startsWith(abbr) || abbr.startsWith(name)) {
      return full;
    }
  }

  return name;
}

/**
 * Parse journal field that might contain combined information
 * Example: "PACM on Human-Computer Interaction 6, CSCW2, Article 395 (November 2022)"
 * Extracts: journal name, volume, issue
 */
function parseJournalField(journal: string | undefined): {
  journalName: string;
  volume?: string;
  issue?: string;
} {
  if (!journal) {
    return { journalName: '' };
  }

  // Try to match pattern: "Journal Name Volume, Issue, Article X (Month Year)"
  // or simpler: "Journal Name Volume(Issue)"

  // Remove "Article X" part
  let cleaned = journal.replace(/,\s*Article\s+\d+/gi, '');

  // Extract date in parentheses like "(November 2022)"
  cleaned = cleaned.replace(/\s*\([A-Za-z]+\s+\d{4}\)/gi, '');

  // Try to extract volume and issue
  // Pattern: "Journal Name 6, CSCW2" or "Journal Name 6(CSCW2)"
  const volumeIssueMatch = cleaned.match(/^(.+?)\s+(\d+)[,\(]([^)]*)\)?$/);

  if (volumeIssueMatch) {
    return {
      journalName: expandJournalName(volumeIssueMatch[1].trim()),
      volume: volumeIssueMatch[2],
      issue: volumeIssueMatch[3].trim() || undefined,
    };
  }

  // Try simpler pattern: "Journal Name Volume"
  const volumeMatch = cleaned.match(/^(.+?)\s+(\d+)$/);

  if (volumeMatch) {
    return {
      journalName: expandJournalName(volumeMatch[1].trim()),
      volume: volumeMatch[2],
    };
  }

  // Return original as journal name (expanded)
  return { journalName: expandJournalName(journal.trim()) };
}

/**
 * Convert title to sentence case (only first letter and proper nouns capitalized)
 * For academic citations, most words should be lowercase
 */
function toSentenceCase(title: string): string {
  // Keep the first letter capitalized
  let result = title.charAt(0).toUpperCase() + title.slice(1).toLowerCase();

  // Capitalize after colon
  result = result.replace(/:\s*([a-z])/g, (match, letter) => `: ${letter.toUpperCase()}`);

  // Capitalize proper nouns (common in academic titles)
  const properNouns = [
    // Programming languages & technologies
    'Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'HTML', 'CSS', 'SQL',
    'GitHub', 'Git', 'Android', 'iOS', 'Windows', 'Linux', 'Unix', 'Docker',
    // AI & ML terms
    'Deep Learning', 'Natural Language Processing', 'Machine Learning', 'AI',
    'Neural Network', 'Transformer', 'BERT', 'GPT', 'LLM', 'NLP',
    // Academic organizations
    'ACM', 'IEEE', 'PACM', 'DOI', 'arXiv',
    // Academic terms
    'Computer Science', 'Data Science', 'Software Engineering',
    'Human-Computer Interaction', 'User Interface', 'User Experience',
    'Web', 'API', 'HTTP', 'HTTPS', 'URL', 'DOI',
  ];

  properNouns.forEach(noun => {
    // Escape special regex characters in the noun
    const escapedNoun = noun.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedNoun.toLowerCase()}\\b`, 'gi');
    result = result.replace(regex, noun);
  });

  return result;
}

/**
 * Convert journal name to sentence case (for APA, MLA, Chicago, Harvard)
 */
function toSentenceCaseJournal(name: string | undefined): string {
  if (!name) {
    return '';
  }

  // Convert to lowercase first
  let result = name.toLowerCase();

  // Capitalize first letter
  result = result.charAt(0).toUpperCase() + result.slice(1);

  // Keep "ACM", "PACM", "IEEE" etc. capitalized
  result = result.replace(/\b(acm|pacm|ieee|doi|api|ai|cpu|gpu|http|https)\b/gi, (match) => match.toUpperCase());

  return result;
}

/**
 * Convert journal name to Vancouver format (sentence case, like sentence case but keeps organizations uppercase)
 * Vancouver format: First word capitalized, organizations like ACM/IEEE uppercase, everything else lowercase
 */
function toVancouverTitleCase(name: string | undefined): string {
  if (!name) {
    return '';
  }

  // Convert to lowercase first
  let result = name.toLowerCase();

  // Split into words and capitalize appropriately
  const words = result.split(/\s+/);

  return words.map((word, index) => {
    // Always capitalize first word
    if (index === 0) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }
    // Keep organizations uppercase
    if (/^(acm|ieee|pacm|doi|api|ai|cpu|gpu|http|https)$/i.test(word)) {
      return word.toUpperCase();
    }
    // Everything else lowercase
    return word;
  }).join(' ');
}

/**
 * Convert our literature format to CSL-JSON format required by citation-js
 * Fetches pages from DOI if not provided
 */
async function toCSLJSON(literature: LiteratureForCitation) {
  // Parse authors
  const author = literature.authors.map(a => {
    const parts = a.name.trim();

    // Check if format is "Last, First" or "First Last"
    if (parts.includes(',')) {
      const [lastName, firstPart] = parts.split(',').map(p => p.trim());
      const given = firstPart;
      const family = lastName;
      return { given, family };
    } else {
      const nameParts = parts.split(/\s+/);
      const family = nameParts[nameParts.length - 1];
      const given = nameParts.slice(0, -1).join(' ');
      return { given, family };
    }
  });

  // Parse journal field to extract journal name, volume, issue
  const { journalName, volume: parsedVolume, issue: parsedIssue } = parseJournalField(literature.journal);

  // Handle pages, date, journal name, volume, and issue from DOI if available
  let pages = literature.pages;
  let doiDate: string[] | undefined = undefined;
  let doiJournalName: string | undefined = undefined;
  let doiVolume: string | undefined = undefined;
  let doiIssue: string | undefined = undefined;

  if (literature.doi) {
    try {
      const doiMetadata = await fetchDOIMetadata(literature.doi);
      pages = pages || extractPages(doiMetadata);
      doiDate = doiMetadata.published_date;
      doiJournalName = doiMetadata.journal_name;
      doiVolume = doiMetadata.volume;
      doiIssue = doiMetadata.issue;
    } catch (e) {
      // Silently fail if DOI fetch fails
      console.debug('Failed to fetch metadata from DOI:', e);
    }
  }

  // Use DOI data if available, otherwise use parsed or explicit values
  const volume = doiVolume || literature.volume || parsedVolume;
  const issue = doiIssue || literature.issue || parsedIssue;
  const containerTitle = doiJournalName || journalName || literature.journal;

  // Convert title to sentence case
  const title = toSentenceCase(literature.title);

  // Convert journal to sentence case
  const finalJournalName = toSentenceCaseJournal(containerTitle);
  // For Vancouver, use the DOI journal name if available (clean format), otherwise expand abbreviation
  const vancouverJournalName = doiJournalName || expandJournalName(containerTitle);

  // Build CSL-JSON object
  const cslData: any = {
    type: 'article-journal',
    title,
    author,
  };

  if (finalJournalName) {
    cslData['container-title'] = finalJournalName;
    // Store Vancouver format journal name (from DOI if available)
    cslData['container-title-vancouver'] = vancouverJournalName;
  }

  if (volume) {
    cslData.volume = volume;
  }

  if (issue) {
    cslData.issue = issue;
  }

  if (pages) {
    cslData.page = pages;
  }

  if (literature.doi) {
    cslData.DOI = literature.doi;
  }

  // Use DOI date if available, otherwise fall back to literature.publication_date
  const dateParts = doiDate || (literature.publication_date ? (() => {
    const date = new Date(literature.publication_date);
    if (!isNaN(date.getTime())) {
      return [date.getFullYear(), date.getMonth() + 1, date.getDate()];
    }
    return undefined;
  })() : undefined);

  if (dateParts) {
    cslData.issued = {
      'date-parts': [dateParts]
    };
  }

  return [cslData];
}

/**
 * Post-process Harvard format citation to fix specific issues
 * Harvard format should use "and" instead of "&" before the last author
 */
function postProcessHarvard(citation: string): string {
  // Replace "& " with "and " in the author section (before the year)
  // Harvard format: "Author, Author, and Author, Year. Title..."
  const beforeYearMatch = citation.match(/^([^.\n]+&[^.\n]+)\.\s*(\d{4})/);
  if (beforeYearMatch) {
    const authorsAndYear = beforeYearMatch[1];
    const year = beforeYearMatch[2];
    const rest = citation.slice(beforeYearMatch[0].length);
    // Replace & with and before the year
    const fixedAuthors = authorsAndYear.replace(/,\s*&\s+/g, ', and ');
    return fixedAuthors + '. ' + year + rest;
  }

  // Also try pattern: "... & Author., Year" -> "... and Author., Year"
  return citation.replace(/,\s*&\s+/g, ', and ');
}

/**
 * Post-process Vancouver format citation
 * Vancouver should not have "1." prefix in single citations
 */
function postProcessVancouver(citation: string): string {
  // Remove leading number and dot
  return citation.replace(/^\d+\.\s*/, '');
}

/**
 * Format-specific post-processing for all citation types
 */
function postProcessCitation(citation: string, format: CitationFormat): string {
  let result = citation;

  switch (format) {
    case 'harvard':
      result = postProcessHarvard(result);
      break;
    case 'vancouver':
      result = postProcessVancouver(result);
      break;
  }

  return result;
}

/**
 * Format citation manually for better control over output
 * This bypasses citation-js style loading issues
 */
function formatCitationManually(cslData: any[], format: CitationFormat): string {
  const data = cslData[0];
  const { author, title, 'container-title': journal, volume, issue, page, issued, DOI } = data;

  // Format authors
  const formatAuthor = (useInitials: boolean, useAnd: boolean, lastNameOnly: boolean = false) => {
    if (!author || author.length === 0) return '';

    if (lastNameOnly) {
      return author.map((a: any) => {
        const family = a.family || '';
        return family;
      }).join(', ');
    }

    const names = author.map((a: any) => {
      const family = a.family || '';
      const given = a.given || '';
      if (useInitials && given) {
        const initials = given.split(/\s+/).map((n: string) => n.charAt(0).toUpperCase()).join('. ');
        return `${family}, ${initials}.`;
      } else {
        return `${family}, ${given}`;
      }
    });

    if (names.length > 1 && useAnd) {
      // Harvard format: "Author, A.A. and Author, B.B." (no comma after last author)
      return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
    } else if (names.length > 1) {
      // APA/MLA/Chicago: last author with "&"
      return names.slice(0, -1).join(', ') + ', & ' + names[names.length - 1];
    }
    return names[0];
  };

  // Get year
  const year = issued?.['date-parts']?.[0]?.[0] || '';

  // Get pages
  const pages = page || '';

  // Format based on style
  switch (format) {
    case 'apa':
      // APA: Author, A. A., & Author, B. B. (Year). Title. Journal, volume(issue), pages.
      return `${formatAuthor(true, false)} (${year}). ${title}. ${journal}${volume ? `, ${volume}` : ''}${issue ? `(${issue})` : ''}${pages ? `, ${pages}` : ''}.`;

    case 'mla':
      // MLA: Author, Full Name, et al. "Title." Journal vol.issue (Year): pages.
      // For 3+ authors, use "First Author, Full Name, et al."
      const mlaAuthor = author.length > 3
        ? `${author[0].family}, ${author[0].given}, et al.`
        : formatAuthor(false, false);
      return `${mlaAuthor} "${title}." ${journal}${volume ? ` ${volume}` : ''}${issue ? `.${issue}` : ''} (${year})${pages ? `: ${pages}` : ''}.`;

    case 'chicago':
      // Chicago: First Author, First, Second Author, Third Author, and Last Author. "Title." Journal Name volume, no. issue (Year): pages.
      // First author uses "Last, First" format, subsequent authors use "First Last"
      if (author.length === 0) return '';
      const chicagoFirstAuthor = `${author[0].family}, ${author[0].given}`;
      const chicagoRestAuthors = author.slice(1).map((a: any) => `${a.given} ${a.family}`);
      let chicagoAuthorList: string;
      if (author.length === 1) {
        chicagoAuthorList = chicagoFirstAuthor;
      } else {
        chicagoAuthorList = `${chicagoFirstAuthor}, ${chicagoRestAuthors.slice(0, -1).join(', ')}`;
        if (chicagoRestAuthors.length > 0) {
          chicagoAuthorList += `, and ${chicagoRestAuthors[chicagoRestAuthors.length - 1]}`;
        }
      }
      return `${chicagoAuthorList}. "${title}." ${journal}${volume ? ` ${volume}` : ''}${issue ? `, no. ${issue}` : ''} (${year})${pages ? `: ${pages}` : ''}.`;

    case 'harvard':
      // Harvard: Author, A.A. and Author, B.B., Year. Title. Journal, volume, p.pages.
      // Google Scholar format: "Mazzolini, A. and Celani, A., 2020. Title. Journal, volume, p.pages."
      const harvardAuthor = formatAuthor(true, true);
      // Use p. for single page, pp. for range (with space after p./pp.)
      const pageText = pages && pages.includes('-') ? `pp. ${pages}` : pages ? `p. ${pages}` : '';
      return `${harvardAuthor}, ${year}. ${title}. ${journal}${volume ? `, ${volume}` : ''}${pageText ? `, ${pageText}` : ''}.`;

    case 'vancouver':
      // Vancouver: Author AA, Author BB, Author CC. Title. Journal Name. Year Mon DD;volume:pages.
      // Note: Vancouver format typically doesn't show issue
      const vancouverAuthor = author.map((a: any) => {
        const family = a.family || '';
        const given = a.given || '';
        const initials = given.split(/\s+/).map((n: string) => n.charAt(0).toUpperCase()).join('');
        return `${family} ${initials}`;
      }).join(', ');
      // Format date as YYYY Mon DD (e.g., "2020 Jan")
      const dateParts = issued?.['date-parts']?.[0] || [];
      let vancouverDate = '';
      if (dateParts.length >= 1) {
        const year = dateParts[0];
        const month = dateParts.length >= 2 ? dateParts[1] : null;
        const day = dateParts.length >= 3 ? dateParts[2] : null;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        if (month && day) {
          vancouverDate = `${year} ${months[month - 1]} ${day}`;
        } else if (month) {
          vancouverDate = `${year} ${months[month - 1]}`;
        } else {
          vancouverDate = `${year}`;
        }
      }
      // Use Vancouver format journal name
      const vancouverJournal = data['container-title-vancouver'] || journal || '';
      // Vancouver format: Year;volume:pages (no issue)
      return `${vancouverAuthor}. ${title}. ${vancouverJournal}. ${vancouverDate}${volume ? `;${volume}` : ''}${pages ? `:${pages}` : ''}.`;

    default:
      return `${formatAuthor(true, false)} (${year}). ${title}. ${journal}.`;
  }
}

/**
 * Format citation using citation-js library
 */
export async function formatCitation(
  literature: LiteratureForCitation,
  format: CitationFormat,
  id?: string
): Promise<string> {
  try {
    // Convert to CSL-JSON (now async due to DOI fetch)
    const cslData = await toCSLJSON(literature);

    // Use manual formatting for better control
    const output = formatCitationManually(cslData, format);

    return output.trim();
  } catch (error) {
    console.error('Citation formatting error:', error);
    throw error;
  }
}

/**
 * Format multiple literature items for bibliography
 */
export async function formatBibliography(
  literatureList: Array<{ id: number } & LiteratureForCitation>,
  format: CitationFormat
): Promise<string> {
  // Convert all to CSL-JSON (now async due to DOI fetch)
  const cslDataPromises = literatureList.map(lit => toCSLJSON(lit));
  const cslData = await Promise.all(cslDataPromises);

  // Use manual formatting for each item
  const entries = cslData.map(data => formatCitationManually(data, format));

  return entries.join('\n\n').trim();
}

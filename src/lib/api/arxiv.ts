import { Literature, SearchParams, SearchResults, ArXivRawEntry, LiteratureSource } from '../types';
import { rateLimiters } from '../rate-limiter';

const ARXIV_API_BASE = 'http://export.arxiv.org/api/query';

/**
 * Parse arXiv ID from URL or return the ID
 */
function parseArXivId(id: string): string {
  const match = id.match(/(\d+\.\d+)/);
  return match ? match[1] : id;
}

/**
 * Convert arXiv raw entry to unified Literature format
 */
function arXivToLiterature(entry: ArXivRawEntry): Literature {
  const arxivId = parseArXivId(entry.id);

  return {
    id: `arxiv-${arxivId}`,
    title: entry.title.trim(),
    authors: entry.authors.map((author) => ({
      name: author.name,
      affiliation: author.affiliation,
    })),
    abstract: entry.summary.trim(),
    publishedDate: entry.published,
    journal: entry.journal_ref,
    doi: entry.doi,
    source: 'arxiv' as LiteratureSource,
    sourceUrl: entry.id,
    pdfUrl: `https://arxiv.org/pdf/${arxivId}.pdf`,
    categories: entry.categories.map((cat) => cat.term),
    keywords: entry.categories.map((cat) => cat.term),
  };
}

/**
 * Build arXiv search query from search parameters
 */
function buildArXivQuery(params: SearchParams): string {
  const searchTerms: string[] = [];

  // Build field-specific search
  const field = params.field || 'all';
  const query = params.query.trim();

  switch (field) {
    case 'title':
      searchTerms.push(`ti:${query}`);
      break;
    case 'author':
      searchTerms.push(`au:${query}`);
      break;
    case 'abstract':
      searchTerms.push(`abs:${query}`);
      break;
    case 'doi':
      searchTerms.push(`doi:${query}`);
      break;
    case 'all':
    default:
      // Search in all fields
      searchTerms.push(`all:${query}`);
      break;
  }

  // Add date filters
  if (params.yearStart || params.yearEnd) {
    const dateFilter = [
      params.yearStart && `submitted_date:[${params.yearStart}0000 TO *}`,
      params.yearEnd && `submitted_date:[* TO ${params.yearEnd}1232}`,
    ]
      .filter(Boolean)
      .join(' AND ');

    if (dateFilter) {
      searchTerms.push(`and(${dateFilter})`);
    }
  }

  return searchTerms.join(' ');
}

/**
 * Search arXiv database
 */
export async function searchArXiv(params: SearchParams): Promise<SearchResults> {
  await rateLimiters.arxiv.throttle();

  const query = buildArXivQuery(params);
  const maxResults = params.maxResults || 20;
  const offset = params.offset || 0;

  const searchParams = new URLSearchParams({
    search_query: query,
    start: offset.toString(),
    max_results: maxResults.toString(),
  });

  const url = `${ARXIV_API_BASE}?${searchParams.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/xml',
      },
    });

    if (!response.ok) {
      throw new Error(`arXiv API error: ${response.status} ${response.statusText}`);
    }

    const xmlText = await response.text();
    const entries = parseArXivXML(xmlText);

    const papers = entries.map(arXivToLiterature);

    return {
      papers,
      totalCount: papers.length, // arXiv doesn't return total count
      offset,
      source: 'arxiv',
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to search arXiv: ${error.message}`);
    }
    throw new Error('Failed to search arXiv: Unknown error');
  }
}

/**
 * Get paper details from arXiv by ID
 */
export async function getArXivPaper(id: string): Promise<Literature> {
  await rateLimiters.arxiv.throttle();

  const arxivId = parseArXivId(id);
  const searchParams = new URLSearchParams({
    search_query: `id:${arxivId}`,
    max_results: '1',
  });

  const url = `${ARXIV_API_BASE}?${searchParams.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/xml',
      },
    });

    if (!response.ok) {
      throw new Error(`arXiv API error: ${response.status} ${response.statusText}`);
    }

    const xmlText = await response.text();
    const entries = parseArXivXML(xmlText);

    if (entries.length === 0) {
      throw new Error(`Paper not found: ${id}`);
    }

    return arXivToLiterature(entries[0]);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get arXiv paper: ${error.message}`);
    }
    throw new Error('Failed to get arXiv paper: Unknown error');
  }
}

/**
 * Parse arXiv XML response
 */
function parseArXivXML(xmlText: string): ArXivRawEntry[] {
  const entries: ArXivRawEntry[] = [];

  // Simple XML parser for arXiv response
  // In production, consider using a proper XML parser like xml2js
  const entryMatches = xmlText.matchAll(/<entry>([\s\S]*?)<\/entry>/g);

  for (const match of entryMatches) {
    const entryXml = match[1];

    const id = extractXmlTag(entryXml, 'id') || '';
    const updated = extractXmlTag(entryXml, 'updated') || '';
    const published = extractXmlTag(entryXml, 'published') || '';
    const title = extractXmlTag(entryXml, 'title') || '';
    const summary = extractXmlTag(entryXml, 'summary') || '';
    const doi = extractXmlTag(entryXml, 'arxiv:doi') || extractXmlTag(entryXml, 'doi') || undefined;
    const journalRef = extractXmlTag(entryXml, 'arxiv:journal_ref') || undefined;

    // Parse authors
    const authors: Array<{ name: string; affiliation?: string }> = [];
    const authorMatches = entryXml.matchAll(/<author>([\s\S]*?)<\/author>/g);
    for (const authorMatch of authorMatches) {
      const authorXml = authorMatch[1];
      const name = extractXmlTag(authorXml, 'name');
      if (name) {
        authors.push({ name });
      }
    }

    // Parse categories
    const categories: Array<{ term: string }> = [];
    const categoryMatches = entryXml.matchAll(/<category[^>]*term="([^"]*)"/g);
    for (const categoryMatch of categoryMatches) {
      categories.push({ term: categoryMatch[1] });
    }

    // Get primary category
    const primaryCategoryMatch = entryXml.match(/<primary_category[^>]*term="([^"]*)"/);
    const primaryCategory = primaryCategoryMatch
      ? { term: primaryCategoryMatch[1] }
      : categories[0];

    entries.push({
      id,
      updated,
      published,
      title,
      summary,
      authors,
      doi,
      journal_ref: journalRef,
      primary_category: primaryCategory,
      categories,
      links: [],
    });
  }

  return entries;
}

/**
 * Extract content from XML tag
 */
function extractXmlTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Test connection to arXiv API
 */
export async function testArXivConnection(): Promise<boolean> {
  try {
    const result = await searchArXiv({
      query: 'test',
      maxResults: 1,
    });
    return result.papers.length >= 0;
  } catch {
    return false;
  }
}

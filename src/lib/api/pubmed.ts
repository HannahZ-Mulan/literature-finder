import { Literature, SearchParams, SearchResults, PubMedRawEntry, LiteratureSource } from '../types';
import { rateLimiters } from '../rate-limiter';

const PUBMED_API_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const PUBMED_API_KEY = process.env.PUBMED_API_KEY || '';

/**
 * Convert PubMed raw entry to unified Literature format
 */
function pubmedToLiterature(entry: PubMedRawEntry): Literature {
  const authors = entry.authors?.map((author) => ({
    name: author.name,
    affiliation: author.affiliation,
  })) || [];

  const keywords = entry.keywords?.map((k) => k.name) || [];

  return {
    id: `pubmed-${entry.uid}`,
    title: entry.title,
    authors,
    abstract: entry.abstract || '',
    publishedDate: entry.publicationDate || entry.journal?.date || '',
    journal: entry.journal?.name,
    doi: entry.doi,
    citationCount: entry.citationCount,
    keywords,
    source: 'pubmed' as LiteratureSource,
    sourceUrl: `https://pubmed.ncbi.nlm.nih.gov/${entry.uid}/`,
  };
}

/**
 * Build PubMed search query from search parameters
 */
function buildPubMedQuery(params: SearchParams): string {
  const searchTerms: string[] = [];
  const query = params.query.trim();

  // Build field-specific search
  const field = params.field || 'all';
  let fieldTag = '';

  switch (field) {
    case 'title':
      fieldTag = '[Title]';
      break;
    case 'author':
      fieldTag = '[Author]';
      break;
    case 'abstract':
      fieldTag = '[Abstract]';
      break;
    case 'doi':
      return `${query}[DOI]`;
    case 'keywords':
      fieldTag = '[Keywords]';
      break;
    case 'all':
    default:
      fieldTag = '[All Fields]';
      break;
  }

  searchTerms.push(`${query}${fieldTag}`);

  // Add date filters
  if (params.yearStart || params.yearEnd) {
    const dateFilters = [];
    if (params.yearStart) {
      dateFilters.push(`${params.yearStart}/01/01:3000[Date - Publication]`);
    }
    if (params.yearEnd) {
      dateFilters.push(`1809/01/01:${params.yearEnd}/12/31[Date - Publication]`);
    }
    searchTerms.push(`AND (${dateFilters.join(' AND ')})`);
  }

  return searchTerms.join(' ');
}

/**
 * Search PubMed database
 */
export async function searchPubMed(params: SearchParams): Promise<SearchResults> {
  await rateLimiters.pubmed.throttle();

  const query = buildPubMedQuery(params);
  const maxResults = params.maxResults || 20;
  const offset = params.offset || 0;

  // Step 1: Search for UIDs
  const searchParams = new URLSearchParams({
    db: 'pubmed',
    term: query,
    retmax: maxResults.toString(),
    retstart: offset.toString(),
    retmode: 'json',
  });

  if (PUBMED_API_KEY) {
    searchParams.append('api_key', PUBMED_API_KEY);
  }

  const searchUrl = `${PUBMED_API_BASE}/esearch.fcgi?${searchParams.toString()}`;

  try {
    const searchResponse = await fetch(searchUrl);

    if (!searchResponse.ok) {
      throw new Error(`PubMed search error: ${searchResponse.status} ${searchResponse.statusText}`);
    }

    const searchData = await searchResponse.json();

    if (!searchData.esearchresult?.idlist?.length) {
      return {
        papers: [],
        totalCount: 0,
        offset,
        source: 'pubmed',
      };
    }

    const uids = searchData.esearchresult.idlist;
    const totalCount = parseInt(searchData.esearchresult.count) || uids.length;

    // Step 2: Fetch summaries for UIDs
    const summaryParams = new URLSearchParams({
      db: 'pubmed',
      id: uids.join(','),
      retmode: 'json',
    });

    if (PUBMED_API_KEY) {
      summaryParams.append('api_key', PUBMED_API_KEY);
    }

    const summaryUrl = `${PUBMED_API_BASE}/esummary.fcgi?${summaryParams.toString()}`;
    const summaryResponse = await fetch(summaryUrl);

    if (!summaryResponse.ok) {
      throw new Error(`PubMed summary error: ${summaryResponse.status} ${summaryResponse.statusText}`);
    }

    const summaryData = await summaryResponse.json();
    const entries = parsePubMedSummary(summaryData);

    const papers = entries.map(pubmedToLiterature);

    return {
      papers,
      totalCount,
      offset,
      source: 'pubmed',
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to search PubMed: ${error.message}`);
    }
    throw new Error('Failed to search PubMed: Unknown error');
  }
}

/**
 * Get paper details from PubMed by ID
 */
export async function getPubMedPaper(uid: string): Promise<Literature> {
  await rateLimiters.pubmed.throttle();

  const summaryParams = new URLSearchParams({
    db: 'pubmed',
    id: uid,
    retmode: 'json',
  });

  if (PUBMED_API_KEY) {
    summaryParams.append('api_key', PUBMED_API_KEY);
  }

  const url = `${PUBMED_API_BASE}/esummary.fcgi?${summaryParams.toString()}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`PubMed API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const entries = parsePubMedSummary(data);

    if (entries.length === 0) {
      throw new Error(`Paper not found: ${uid}`);
    }

    return pubmedToLiterature(entries[0]);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get PubMed paper: ${error.message}`);
    }
    throw new Error('Failed to get PubMed paper: Unknown error');
  }
}

/**
 * Parse PubMed summary response
 */
function parsePubMedSummary(data: any): PubMedRawEntry[] {
  const entries: PubMedRawEntry[] = [];

  if (!data.result) {
    return entries;
  }

  // Skip the 'uids' key
  const uids = data.result.uids || [];

  for (const uid of uids) {
    const item = data.result[uid];
    if (!item) continue;

    const entry: PubMedRawEntry = {
      uid,
      title: item.title || '',
    };

    // Extract abstract (needs separate fetch in full implementation)
    // For now, we'll set abstract as empty
    entry.abstract = '';

    // Parse authors
    if (item.authors) {
      entry.authors = item.authors.map((author: any) => ({
        name: author.name || '',
        affiliation: author.affiliation || author.collectivename,
      }));
    }

    // Parse journal info
    if (item.source) {
      entry.journal = {
        name: item.source,
        date: item.pubdate || '',
      };
    }

    entry.publicationDate = item.pubdate || '';

    // Extract DOI from elocationid if available
    if (item.elocationid && item.elocationid.toLowerCase().includes('doi')) {
      entry.doi = item.elocationid.replace(/doi:\s*/i, '');
    }

    // Parse keywords (if available in the response)
    if (item.keywords) {
      entry.keywords = item.keywords.map((k: any) => ({ name: k }));
    }

    entries.push(entry);
  }

  return entries;
}

/**
 * Fetch full abstract for a PubMed entry
 */
export async function fetchPubMedAbstract(uid: string): Promise<string> {
  await rateLimiters.pubmed.throttle();

  const params = new URLSearchParams({
    db: 'pubmed',
    id: uid,
    rettype: 'abstract',
    retmode: 'xml',
  });

  if (PUBMED_API_KEY) {
    params.append('api_key', PUBMED_API_KEY);
  }

  const url = `${PUBMED_API_BASE}/efetch.fcgi?${params.toString()}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`PubMed fetch error: ${response.status} ${response.statusText}`);
    }

    const xmlText = await response.text();

    // Extract abstract from XML
    const abstractMatch = xmlText.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/i);
    return abstractMatch ? abstractMatch[1].trim() : '';
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch PubMed abstract: ${error.message}`);
    }
    throw new Error('Failed to fetch PubMed abstract: Unknown error');
  }
}

/**
 * Test connection to PubMed API
 */
export async function testPubMedConnection(): Promise<boolean> {
  try {
    const result = await searchPubMed({
      query: 'cancer',
      maxResults: 1,
    });
    return result.papers.length >= 0;
  } catch {
    return false;
  }
}

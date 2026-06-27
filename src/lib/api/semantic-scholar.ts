import { Literature, SearchParams, SearchResults, SemanticScholarRawEntry, LiteratureSource } from '../types';
import { rateLimiters } from '../rate-limiter';

const SEMANTIC_SCHOLAR_API_BASE = process.env.SEMANTIC_SCHOLAR_PROXY || 'https://api.semanticscholar.org/graph/v1';
const SEMANTIC_SCHOLAR_API_KEY = process.env.SEMANTIC_SCHOLAR_API_KEY || '';

/**
 * Convert Semantic Scholar raw entry to unified Literature format
 */
function semanticScholarToLiterature(entry: SemanticScholarRawEntry): Literature {
  const authors = entry.authors?.map((author) => ({
    name: author.name,
    affiliation: author.affiliation,
  })) || [];

  let id = `semantic-scholar-${entry.paperId}`;

  // Try to use external IDs for better identification
  if (entry.externalIds?.ArXiv) {
    id = `arxiv-${entry.externalIds.ArXiv}`;
  } else if (entry.externalIds?.PubMed) {
    id = `pubmed-${entry.externalIds.PubMed}`;
  } else if (entry.externalIds?.DOI) {
    id = `doi-${entry.externalIds.DOI}`;
  }

  return {
    id,
    title: entry.title,
    authors,
    abstract: entry.abstract || '',
    publishedDate: entry.publicationDate || entry.year ? `${entry.year}-01-01` : '',
    journal: entry.journal?.name || entry.venue,
    doi: entry.doi,
    citationCount: entry.citationCount,
    source: entry.externalIds?.ArXiv ? 'arxiv' as LiteratureSource :
           entry.externalIds?.PubMed ? 'pubmed' as LiteratureSource :
           'semantic-scholar' as LiteratureSource,
    sourceUrl: `https://www.semanticscholar.org/paper/${entry.paperId}`,
    pdfUrl: entry.openAccessPdf?.url,
  };
}

/**
 * Build Semantic Scholar search query from search parameters
 */
function buildSemanticScholarQuery(params: SearchParams): string {
  const query = params.query.trim();
  const field = params.field || 'all';

  // Semantic Scholar API doesn't support field-specific search in the basic API
  // We'll use the query as-is
  let searchQuery = query;

  // Add year filters if provided
  if (params.yearStart || params.yearEnd) {
    const yearFilters = [];
    if (params.yearStart) {
      yearFilters.push(`year:${params.yearStart}-`);
    }
    if (params.yearEnd) {
      yearFilters.push(`year:-${params.yearEnd}`);
    }
    if (yearFilters.length > 0) {
      searchQuery = `${query} ${yearFilters.join(' ')}`;
    }
  }

  return searchQuery;
}

/**
 * Search Semantic Scholar database
 */
export async function searchSemanticScholar(params: SearchParams): Promise<SearchResults> {
  await rateLimiters.semanticScholar.throttle();

  const query = buildSemanticScholarQuery(params);
  const maxResults = Math.min(params.maxResults || 20, 100); // Max 100 per request
  const offset = params.offset || 0;

  const searchParams = new URLSearchParams({
    query,
    limit: maxResults.toString(),
    offset: offset.toString(),
    fields: 'paperId,title,abstract,authors,year,publicationDate,journal,venue,citationCount,doi,openAccessPdf,externalIds',
  });

  const url = `${SEMANTIC_SCHOLAR_API_BASE}/paper/search?${searchParams.toString()}`;

  const headers: HeadersInit = {
    'Accept': 'application/json',
  };

  if (SEMANTIC_SCHOLAR_API_KEY) {
    headers['x-api-key'] = SEMANTIC_SCHOLAR_API_KEY;
  }

  try {
    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`Semantic Scholar API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.data) {
      return {
        papers: [],
        totalCount: 0,
        offset,
        source: 'semantic-scholar',
      };
    }

    const papers = data.data.map(semanticScholarToLiterature);
    const totalCount = data.total || papers.length;

    return {
      papers,
      totalCount,
      offset,
      source: 'semantic-scholar',
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to search Semantic Scholar: ${error.message}`);
    }
    throw new Error('Failed to search Semantic Scholar: Unknown error');
  }
}

/**
 * Get paper details from Semantic Scholar by ID
 */
export async function getSemanticScholarPaper(paperId: string): Promise<Literature> {
  await rateLimiters.semanticScholar.throttle();

  const searchParams = new URLSearchParams({
    fields: 'paperId,title,abstract,authors,year,publicationDate,journal,venue,citationCount,doi,openAccessPdf,externalIds',
  });

  const url = `${SEMANTIC_SCHOLAR_API_BASE}/paper/${paperId}?${searchParams.toString()}`;

  const headers: HeadersInit = {
    'Accept': 'application/json',
  };

  if (SEMANTIC_SCHOLAR_API_KEY) {
    headers['x-api-key'] = SEMANTIC_SCHOLAR_API_KEY;
  }

  try {
    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`Semantic Scholar API error: ${response.status} ${response.statusText}`);
    }

    const entry: SemanticScholarRawEntry = await response.json();

    if (!entry || !entry.title) {
      throw new Error(`Paper not found: ${paperId}`);
    }

    return semanticScholarToLiterature(entry);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get Semantic Scholar paper: ${error.message}`);
    }
    throw new Error('Failed to get Semantic Scholar paper: Unknown error');
  }
}

/**
 * Search by DOI in Semantic Scholar
 */
export async function searchSemanticScholarByDOI(doi: string): Promise<Literature | null> {
  await rateLimiters.semanticScholar.throttle();

  const url = `${SEMANTIC_SCHOLAR_API_BASE}/paper/DOI:${encodeURIComponent(doi)}`;

  const headers: HeadersInit = {
    'Accept': 'application/json',
  };

  if (SEMANTIC_SCHOLAR_API_KEY) {
    headers['x-api-key'] = SEMANTIC_SCHOLAR_API_KEY;
  }

  try {
    const response = await fetch(url, { headers });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Semantic Scholar API error: ${response.status} ${response.statusText}`);
    }

    const entry: SemanticScholarRawEntry = await response.json();

    if (!entry || !entry.title) {
      return null;
    }

    return semanticScholarToLiterature(entry);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to search Semantic Scholar by DOI: ${error.message}`);
    }
    throw new Error('Failed to search Semantic Scholar by DOI: Unknown error');
  }
}

/**
 * Get related papers for a given paper
 */
export async function getRelatedPapers(paperId: string, limit = 20): Promise<Literature[]> {
  await rateLimiters.semanticScholar.throttle();

  const searchParams = new URLSearchParams({
    limit: limit.toString(),
    fields: 'paperId,title,abstract,authors,year,publicationDate,journal,venue,citationCount,doi,openAccessPdf,externalIds',
  });

  const url = `${SEMANTIC_SCHOLAR_API_BASE}/paper/${paperId}/related?${searchParams.toString()}`;

  const headers: HeadersInit = {
    'Accept': 'application/json',
  };

  if (SEMANTIC_SCHOLAR_API_KEY) {
    headers['x-api-key'] = SEMANTIC_SCHOLAR_API_KEY;
  }

  try {
    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`Semantic Scholar API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.data) {
      return [];
    }

    return data.data.map(semanticScholarToLiterature);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get related papers: ${error.message}`);
    }
    throw new Error('Failed to get related papers: Unknown error');
  }
}

/**
 * Test connection to Semantic Scholar API
 */
export async function testSemanticScholarConnection(): Promise<boolean> {
  try {
    const result = await searchSemanticScholar({
      query: 'machine learning',
      maxResults: 1,
    });
    return result.papers.length >= 0;
  } catch {
    return false;
  }
}

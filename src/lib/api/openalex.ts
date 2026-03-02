import { Literature, SearchParams, SearchResults, OpenAlexRawEntry, LiteratureSource } from '../types';
import { rateLimiters } from '../rate-limiter';

const OPENALEX_API_BASE = 'https://api.openalex.org';

/**
 * Reconstruct abstract from OpenAlex's inverted index format
 * OpenAlex stores abstracts as {word: [position1, position2, ...]}
 */
function reconstructAbstract(invertedIndex: { [word: string]: number[] } | null | undefined): string {
  if (!invertedIndex) return '';

  try {
    // Create an array of [position, word] pairs
    const wordPositions: Array<[number, string]> = [];

    for (const [word, positions] of Object.entries(invertedIndex)) {
      for (const pos of positions) {
        wordPositions.push([pos, word]);
      }
    }

    // Sort by position
    wordPositions.sort((a, b) => a[0] - b[0]);

    // Join words back together
    const abstract = wordPositions.map(([_, word]) => word).join(' ');

    return abstract;
  } catch (error) {
    console.error('Error reconstructing abstract:', error);
    return '';
  }
}

/**
 * Convert OpenAlex raw entry to unified Literature format
 */
function openAlexToLiterature(work: OpenAlexRawEntry): Literature {
  const authors = work.authorships?.map((authorship) => ({
    name: authorship.author?.display_name || 'Unknown',
    affiliation: authorship.institutions?.[0]?.display_name,
  })) || [];

  // Get publication date
  let publishedDate = '';
  if (work.publication_date) {
    publishedDate = work.publication_date;
  } else if (work.publication_year) {
    publishedDate = `${work.publication_year}-01-01`;
  }

  // Get journal/venue name
  const journal = work.primary_location?.source?.display_name ||
                  work.host_venue?.display_name ||
                  work.type;

  // Get DOI
  const doi = work.doi || work.ids?.doi;

  // Build keywords from concepts
  const keywords = work.concepts?.slice(0, 5).map(c => c.display_name) || [];

  // Reconstruct abstract from inverted index
  const abstract = reconstructAbstract((work as any).abstract_inverted_index);

  return {
    id: `openalex-${work.id.split('/').pop()}`,
    title: work.title,
    authors,
    abstract,
    publishedDate,
    journal,
    doi,
    citationCount: work.cited_by_count,
    keywords,
    source: 'openalex' as LiteratureSource,
    sourceUrl: work.id,
    pdfUrl: work.best_oa_location?.pdf_url || work.primary_location?.pdf_url,
    categories: work.concepts?.slice(0, 10).map(c => c.display_name) || [],
  };
}

/**
 * Build OpenAlex search query from search parameters
 */
function buildOpenAlexQuery(params: SearchParams): string {
  return params.query.trim();
}

/**
 * Build OpenAlex filters from search parameters
 */
function buildOpenAlexFilters(params: SearchParams): string {
  const filters: string[] = [];

  // Add year filters
  if (params.yearStart || params.yearEnd) {
    if (params.yearStart && params.yearEnd) {
      filters.push(`from_publication_date:${params.yearStart}-01-01,to_publication_date:${params.yearEnd}-12-31`);
    } else if (params.yearStart) {
      filters.push(`from_publication_date:${params.yearStart}-01-01`);
    } else if (params.yearEnd) {
      filters.push(`to_publication_date:${params.yearEnd}-12-31`);
    }
  }

  return filters.join(',');
}

/**
 * Search OpenAlex database
 */
export async function searchOpenAlex(params: SearchParams): Promise<SearchResults> {
  await rateLimiters.openalex.throttle();

  const query = buildOpenAlexQuery(params);
  const maxResults = Math.min(params.maxResults || 20, 200); // OpenAlex max is 200
  const offset = params.offset || 0;
  const field = params.field || 'all';

  const searchParams = new URLSearchParams({
    per_page: maxResults.toString(),
  });

  // Request abstract field - OpenAlex stores abstracts as abstract_inverted_index
  // We need to explicitly request it
  searchParams.set('select', 'id,title,publication_date,publication_year,primary_location,best_oa_location,type,authorships,institutions,cited_by_count,doi,ids,concepts,abstract_inverted_index');

  // OpenAlex uses page-based pagination, not offset
  // Convert offset to page number (assuming per_page results per page)
  if (offset > 0) {
    const page = Math.floor(offset / maxResults) + 1;
    searchParams.set('page', page.toString());
  }

  // Build filters based on field
  const filters = buildOpenAlexFilters(params);

  // Add field-specific filters
  // Note: URLSearchParams automatically encodes values, so don't use encodeURIComponent
  if (field === 'title') {
    // For title search, use title.search filter
    if (filters) {
      searchParams.set('filter', `${filters},title.search:${query}`);
    } else {
      searchParams.set('filter', `title.search:${query}`);
    }
  } else if (field === 'author') {
    // For author search, use author.search filter
    if (filters) {
      searchParams.set('filter', `${filters},author.search:${query}`);
    } else {
      searchParams.set('filter', `author.search:${query}`);
    }
  } else {
    // For all/abstract/doi search, use the default search parameter
    searchParams.set('search', query);
    if (filters) {
      searchParams.set('filter', filters);
    }
  }

  const url = `${OPENALEX_API_BASE}/works?${searchParams.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Literature-Finder/1.0 (mailto:your-email@example.com)',
      },
    });

    if (!response.ok) {
      throw new Error(`OpenAlex API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.results) {
      return {
        papers: [],
        totalCount: 0,
        offset,
        source: 'openalex',
      };
    }

    const papers = data.results.map(openAlexToLiterature);
    const totalCount = data.meta?.count || papers.length;

    return {
      papers,
      totalCount,
      offset,
      source: 'openalex',
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to search OpenAlex: ${error.message}`);
    }
    throw new Error('Failed to search OpenAlex: Unknown error');
  }
}

/**
 * Get paper details from OpenAlex by ID
 */
export async function getOpenAlexPaper(id: string): Promise<Literature> {
  await rateLimiters.openalex.throttle();

  const url = `${OPENALEX_API_BASE}/works/${id}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Literature-Finder/1.0 (mailto:your-email@example.com)',
      },
    });

    if (!response.ok) {
      throw new Error(`OpenAlex API error: ${response.status} ${response.statusText}`);
    }

    const work: OpenAlexRawEntry = await response.json();

    if (!work || !work.title) {
      throw new Error(`Paper not found: ${id}`);
    }

    return openAlexToLiterature(work);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get OpenAlex paper: ${error.message}`);
    }
    throw new Error('Failed to get OpenAlex paper: Unknown error');
  }
}

/**
 * Search by DOI in OpenAlex
 */
export async function searchOpenAlexByDOI(doi: string): Promise<Literature | null> {
  await rateLimiters.openalex.throttle();

  const url = `${OPENALEX_API_BASE}/works/https://doi.org/${encodeURIComponent(doi)}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Literature-Finder/1.0 (mailto:your-email@example.com)',
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`OpenAlex API error: ${response.status} ${response.statusText}`);
    }

    const work: OpenAlexRawEntry = await response.json();

    if (!work || !work.title) {
      return null;
    }

    return openAlexToLiterature(work);
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      return null;
    }
    if (error instanceof Error) {
      throw new Error(`Failed to search OpenAlex by DOI: ${error.message}`);
    }
    throw new Error('Failed to search OpenAlex by DOI: Unknown error');
  }
}

/**
 * Get related works for a given paper
 */
export async function getRelatedWorks(workId: string, limit = 20): Promise<Literature[]> {
  await rateLimiters.openalex.throttle();

  const url = `${OPENALEX_API_BASE}/works/${workId}/related`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Literature-Finder/1.0 (mailto:your-email@example.com)',
      },
    });

    if (!response.ok) {
      throw new Error(`OpenAlex API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.results) {
      return [];
    }

    return data.results.slice(0, limit).map(openAlexToLiterature);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get related works: ${error.message}`);
    }
    throw new Error('Failed to get related works: Unknown error');
  }
}

/**
 * Search by author
 */
export async function searchOpenAlexByAuthor(
  authorName: string,
  maxResults = 20
): Promise<Literature[]> {
  await rateLimiters.openalex.throttle();

  const searchParams = new URLSearchParams({
    filter: `author.search:${authorName}`,
    per_page: maxResults.toString(),
  });

  const url = `${OPENALEX_API_BASE}/works?${searchParams.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Literature-Finder/1.0 (mailto:your-email@example.com)',
      },
    });

    if (!response.ok) {
      throw new Error(`OpenAlex API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.results) {
      return [];
    }

    return data.results.map(openAlexToLiterature);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to search by author: ${error.message}`);
    }
    throw new Error('Failed to search by author: Unknown error');
  }
}

/**
 * Test connection to OpenAlex API
 */
export async function testOpenAlexConnection(): Promise<boolean> {
  try {
    const result = await searchOpenAlex({
      query: 'machine learning',
      maxResults: 1,
    });
    return result.papers.length >= 0;
  } catch {
    return false;
  }
}

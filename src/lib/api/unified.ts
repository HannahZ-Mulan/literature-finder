import {
  Literature,
  SearchParams,
  SearchResults,
  UnifiedSearchParams,
  LiteratureSource,
  ApiError,
} from '../types';
import { searchArXiv, getArXivPaper, testArXivConnection } from './arxiv';
import { searchPubMed, getPubMedPaper, testPubMedConnection } from './pubmed';
import {
  searchSemanticScholar,
  getSemanticScholarPaper,
  searchSemanticScholarByDOI,
  testSemanticScholarConnection,
} from './semantic-scholar';
import {
  searchOpenAlex,
  getOpenAlexPaper,
  searchOpenAlexByDOI,
  testOpenAlexConnection,
} from './openalex';

/**
 * Source priority for cross-source deduplication. When the same DOI is found
 * in multiple sources, the paper is kept in the highest-priority source.
 * Lower number = higher priority.
 */
const SOURCE_PRIORITY: Record<string, number> = {
  openalex: 0,
  'semantic-scholar': 1,
  arxiv: 2,
  pubmed: 3,
};

/**
 * Deduplicate papers across sources by DOI, in place.
 *
 * - Papers WITHOUT a doi are left untouched (cannot safely merge).
 * - For each DOI seen in more than one source, the paper is kept only in the
 *   source with the highest priority (lowest number); it is removed from all
 *   other sources' paper lists.
 *
 * This keeps each result group (per source) internally consistent with the
 * frontend, which renders results grouped by `result.source`.
 */
function dedupeAcrossSources(results: SearchResults[]): void {
  // Map: doi -> priority of the source that already owns it
  const seenDoi = new Map<string, number>();

  // First pass: claim each DOI for the highest-priority source that has it.
  for (const group of results) {
    const groupPriority = SOURCE_PRIORITY[group.source] ?? 99;
    for (const paper of group.papers) {
      const doi = paper.doi?.trim().toLowerCase();
      if (!doi) continue;
      const currentOwner = seenDoi.get(doi);
      if (currentOwner === undefined) {
        seenDoi.set(doi, groupPriority);
      } else if (groupPriority < currentOwner) {
        // This source has higher priority; take ownership.
        seenDoi.set(doi, groupPriority);
      }
    }
  }

  // Second pass: drop papers whose DOI is owned by a higher-priority source.
  for (const group of results) {
    const groupPriority = SOURCE_PRIORITY[group.source] ?? 99;
    group.papers = group.papers.filter((paper) => {
      const doi = paper.doi?.trim().toLowerCase();
      if (!doi) return true; // no DOI: keep
      const ownerPriority = seenDoi.get(doi);
      // Keep only if this source is the owner (its priority == owner priority).
      return ownerPriority === groupPriority;
    });
  }
}

/**
 * Unified literature search across all databases
 */
export async function searchLiterature(params: UnifiedSearchParams): Promise<{
  results: SearchResults[];
  errors: ApiError[];
}> {
  const sources = params.sources || ['arxiv', 'pubmed', 'semantic-scholar', 'openalex'];
  const results: SearchResults[] = [];
  const errors: ApiError[] = [];

  // Create search params for each source
  const searchParams: SearchParams = {
    query: params.query,
    field: params.field,
    yearStart: params.yearStart,
    yearEnd: params.yearEnd,
    maxResults: params.maxResults || 20,
    offset: params.offset || 0,
  };

  // Search each source in parallel
  const searchPromises = sources.map(async (source) => {
    try {
      let result: SearchResults;

      switch (source) {
        case 'arxiv':
          result = await searchArXiv({ ...searchParams, source });
          break;
        case 'pubmed':
          result = await searchPubMed({ ...searchParams, source });
          break;
        case 'semantic-scholar':
          result = await searchSemanticScholar({ ...searchParams, source });
          break;
        case 'openalex':
          result = await searchOpenAlex({ ...searchParams, source });
          break;
        default:
          throw new Error(`Unknown source: ${source}`);
      }

      return { success: true, result };
    } catch (error) {
      const apiError: ApiError = {
        code: 'SEARCH_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        source,
        retryable: isRetryableError(error),
      };
      return { success: false, error: apiError };
    }
  });

  const outcomes = await Promise.all(searchPromises);

  for (const outcome of outcomes) {
    if (outcome.success && outcome.result) {
      results.push(outcome.result);
    } else if (!outcome.success && outcome.error) {
      errors.push(outcome.error);
    }
  }

  // Deduplicate papers across sources by DOI. When the same DOI appears in
  // multiple sources, keep it in the highest-priority source and drop the
  // copies elsewhere. Priority: openalex > semantic-scholar > arxiv > pubmed
  // (OpenAlex carries the richest metadata). Papers without a DOI are kept
  // untouched (we cannot safely merge them).
  dedupeAcrossSources(results);

  return { results, errors };
}

/**
 * Search a specific literature source
 */
export async function searchSingleSource(
  source: LiteratureSource,
  params: SearchParams
): Promise<SearchResults> {
  switch (source) {
    case 'arxiv':
      return searchArXiv(params);
    case 'pubmed':
      return searchPubMed(params);
    case 'semantic-scholar':
      return searchSemanticScholar(params);
    case 'openalex':
      return searchOpenAlex(params);
    default:
      throw new Error(`Unknown source: ${source}`);
  }
}

/**
 * Get paper details by ID
 * ID format: {source}-{id} or direct ID
 */
export async function getPaper(id: string): Promise<Literature> {
  // Parse ID to determine source
  const [source, paperId] = parsePaperId(id);

  switch (source) {
    case 'arxiv':
      return getArXivPaper(paperId);
    case 'pubmed':
      return getPubMedPaper(paperId);
    case 'semantic-scholar':
      return getSemanticScholarPaper(paperId);
    case 'openalex':
      return getOpenAlexPaper(paperId);
    case 'doi':
      // Try to find by DOI across all sources
      return getPaperByDOI(paperId);
    default:
      throw new Error(`Unknown source or invalid ID format: ${id}`);
  }
}

/**
 * Get paper by DOI
 */
export async function getPaperByDOI(doi: string): Promise<Literature> {
  // Try OpenAlex first (most comprehensive)
  try {
    const paper = await searchOpenAlexByDOI(doi);
    if (paper) {
      return paper;
    }
  } catch {
    // Continue to other sources
  }

  // Try Semantic Scholar (has good DOI support)
  try {
    const paper = await searchSemanticScholarByDOI(doi);
    if (paper) {
      return paper;
    }
  } catch {
    // Continue to other sources
  }

  // Try arXiv
  try {
    const result = await searchArXiv({
      query: doi,
      field: 'doi',
      maxResults: 1,
    });
    if (result.papers.length > 0) {
      return result.papers[0];
    }
  } catch {
    // Continue to other sources
  }

  // Try PubMed
  try {
    const result = await searchPubMed({
      query: doi,
      field: 'doi',
      maxResults: 1,
    });
    if (result.papers.length > 0) {
      return result.papers[0];
    }
  } catch {
    // Continue
  }

  throw new Error(`Paper not found for DOI: ${doi}`);
}

/**
 * Parse paper ID to extract source and ID
 */
function parsePaperId(id: string): [LiteratureSource, string] {
  // Check if ID has format prefix
  const match = id.match(/^([a-z-]+)-(.+)$/);
  if (match) {
    const [, source, paperId] = match;
    return [source as LiteratureSource, paperId];
  }

  // If no prefix, try to determine source from ID pattern
  if (/^\d+\.\d+$/.test(id)) {
    return ['arxiv', id];
  }

  // Default to semantic-scholar
  return ['semantic-scholar', id];
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    return (
      errorMessage.includes('timeout') ||
      errorMessage.includes('econnreset') ||
      errorMessage.includes('econnrefused') ||
      errorMessage.includes('etimedout') ||
      errorMessage.includes('429') || // Too many requests
      errorMessage.includes('503') || // Service unavailable
      errorMessage.includes('502') // Bad gateway
    );
  }
  return false;
}

/**
 * Test connection to all APIs
 */
export async function testAllConnections(): Promise<{
  arxiv: boolean;
  pubmed: boolean;
  semanticScholar: boolean;
  openalex: boolean;
}> {
  const results = await Promise.allSettled([
    testArXivConnection(),
    testPubMedConnection(),
    testSemanticScholarConnection(),
    testOpenAlexConnection(),
  ]);

  return {
    arxiv: results[0].status === 'fulfilled' && results[0].value === true,
    pubmed: results[1].status === 'fulfilled' && results[1].value === true,
    semanticScholar: results[2].status === 'fulfilled' && results[2].value === true,
    openalex: results[3].status === 'fulfilled' && results[3].value === true,
  };
}

/**
 * Get available sources
 */
export function getAvailableSources(): LiteratureSource[] {
  return ['arxiv', 'pubmed', 'semantic-scholar', 'openalex'];
}

/**
 * Validate search parameters
 */
export function validateSearchParams(params: UnifiedSearchParams): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!params.query || params.query.trim().length === 0) {
    errors.push('Query is required');
  }

  if (params.sources) {
    const validSources = getAvailableSources();
    const invalidSources = params.sources.filter(
      (s) => !validSources.includes(s)
    );

    if (invalidSources.length > 0) {
      errors.push(`Invalid sources: ${invalidSources.join(', ')}`);
    }
  }

  if (params.maxResults !== undefined && params.maxResults < 1) {
    errors.push('maxResults must be at least 1');
  }

  if (params.maxResults !== undefined && params.maxResults > 100) {
    errors.push('maxResults cannot exceed 100');
  }

  if (params.yearStart && params.yearEnd && params.yearStart > params.yearEnd) {
    errors.push('yearStart must be less than or equal to yearEnd');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

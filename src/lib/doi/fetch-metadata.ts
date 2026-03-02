/**
 * DOI Metadata Fetcher
 * Fetches complete metadata from DOI using Content Negotiation
 */

export interface DOIMetadata {
  pages?: string;
  page_first?: string;
  page_last?: string;
  volume?: string;
  issue?: string;
  published_date?: string[]; // [year, month, day] from published-print or published-online
  journal_name?: string; // Short journal name from DOI
  // Add other fields as needed
}

/**
 * Fetch metadata from DOI using Crossref Content Negotiation
 * https://api.crossref.org/swagger-ui/index.html
 */
export async function fetchDOIMetadata(doi: string): Promise<DOIMetadata | null> {
  if (!doi) {
    return null;
  }

  try {
    // Clean DOI - remove URL prefix if present
    const cleanDoi = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, '');

    // Try Crossref REST API
    const crossrefUrl = `https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`;

    const response = await fetch(crossrefUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Literature-Finder/1.0 (mailto:noreply@example.com)',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      console.warn(`DOI fetch failed: ${response.status} for ${cleanDoi}`);
      return null;
    }

    const data = await response.json();

    if (data.status !== 'ok' || !data.message) {
      return null;
    }

    const work = data.message;

    // Extract page information
    const pages = work.page || work['article-number'] || undefined;
    const page_first = work['page-first'] || undefined;
    const page_last = work['page-last'] || undefined;

    // Extract published date (prefer online over print to match Google Scholar)
    let published_date: string[] | undefined = undefined;
    const publishedOnline = work['published-online']?.['date-parts']?.[0];
    const publishedPrint = work['published-print']?.['date-parts']?.[0];
    if (publishedOnline) {
      published_date = publishedOnline;
    } else if (publishedPrint) {
      published_date = publishedPrint;
    }

    // Get journal name (prefer full name over abbreviation)
    const journalName = work['container-title']?.[0] ||
                        work['short-container-title']?.[0] ||
                        undefined;

    return {
      pages,
      page_first,
      page_last,
      volume: work.volume || undefined,
      issue: work.issue || undefined,
      published_date,
      journal_name: journalName,
    };
  } catch (error) {
    console.error('Error fetching DOI metadata:', error);
    return null;
  }
}

/**
 * Extract pages from DOI metadata
 */
export function extractPages(metadata: DOIMetadata | null): string | undefined {
  if (!metadata) {
    return undefined;
  }

  // If pages is already set, return it
  if (metadata.pages) {
    return metadata.pages;
  }

  // If page_first and page_last are set, construct pages range
  if (metadata.page_first && metadata.page_last) {
    return `${metadata.page_first}-${metadata.page_last}`;
  }

  if (metadata.page_first) {
    return metadata.page_first;
  }

  return undefined;
}

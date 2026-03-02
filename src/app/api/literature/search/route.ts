import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/middleware';
import { z } from 'zod';

// Validation schema
const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  source: z.enum(['arxiv', 'pubmed', 'semantic-scholar', 'openalex', 'all']).default('openalex'),
  field: z.enum(['all', 'title', 'abstract', 'author', 'doi', 'keywords']).default('all'),
  yearStart: z.coerce.number().optional(),
  yearEnd: z.coerce.number().optional(),
  maxResults: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.enum(['relevance', 'date', 'date_asc', 'citations']).default('relevance'),
});

// POST /api/literature/search - Search academic databases
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request);
    if (!auth.success || !auth.userId) {
      return NextResponse.json(
        { error: auth.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate request
    const validation = searchSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { query, source, field, yearStart, yearEnd, maxResults, offset, sortBy } = validation.data;

    // Import the unified search function
    const { searchLiterature } = await import('@/lib/api/unified');

    // Perform search
    // Map source to sources array
    let sources: string[];
    if (source === 'all') {
      // Search all sources - OpenAlex + others (slower but comprehensive)
      sources = ['openalex', 'arxiv', 'pubmed', 'semantic-scholar'];
    } else {
      sources = [source];
    }

    const { results, errors } = await searchLiterature({
      query,
      sources: sources as any,
      field,
      yearStart,
      yearEnd,
      maxResults,
      offset,
    });

    // Sort results based on sortBy parameter
    const sortedResults = sortResults(results, sortBy);

    // Save search to history (fire and forget, don't wait for completion)
    saveSearchHistory(auth.userId, query, source).catch((err) => {
      console.error('Failed to save search history:', err);
    });

    // Return search results
    return NextResponse.json({
      query,
      results: sortedResults,
      errors,
      summary: {
        total: sortedResults.reduce((sum: number, r: any) => sum + r.papers.length, 0),
        sources: {
          openalex: sortedResults.find((r: any) => r.source === 'openalex')?.papers.length || 0,
          arxiv: sortedResults.find((r: any) => r.source === 'arxiv')?.papers.length || 0,
          pubmed: sortedResults.find((r: any) => r.source === 'pubmed')?.papers.length || 0,
          'semantic-scholar': sortedResults.find((r: any) => r.source === 'semantic-scholar')?.papers.length || 0,
        },
      },
      pagination: {
        offset,
        maxResults,
        hasMore: sortedResults.some((r: any) => r.papers.length >= maxResults),
      },
      sortBy,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Sort results based on sortBy parameter
 */
function sortResults(results: any[], sortBy: string): any[] {
  if (sortBy === 'relevance') {
    // Keep original order (API returns by relevance)
    return results;
  }

  return results.map((result) => ({
    ...result,
    papers: [...result.papers].sort((a: any, b: any) => {
      if (sortBy === 'date') {
        // Sort by publication date (newest first)
        const dateA = a.publishedDate ? new Date(a.publishedDate).getTime() : 0;
        const dateB = b.publishedDate ? new Date(b.publishedDate).getTime() : 0;
        return dateB - dateA;
      }

      if (sortBy === 'date_asc') {
        // Sort by publication date (oldest first)
        const dateA = a.publishedDate ? new Date(a.publishedDate).getTime() : 0;
        const dateB = b.publishedDate ? new Date(b.publishedDate).getTime() : 0;
        return dateA - dateB;
      }

      if (sortBy === 'citations') {
        // Sort by citation count (highest first)
        const citationsA = a.citationCount || 0;
        const citationsB = b.citationCount || 0;
        return citationsB - citationsA;
      }

      return 0;
    }),
  }));
}

/**
 * Save search to history (async, non-blocking)
 */
async function saveSearchHistory(userId: number, query: string, source: string) {
  try {
    const { db } = await import('@/db');
    const { searchHistory } = await import('@/db/schema');

    // Save search to history
    await db.insert(searchHistory).values({
      user_id: userId,
      query,
      source,
      created_at: new Date(),
    });
  } catch (error) {
    // Silently fail - don't let search history errors break search
    console.error('Failed to save search history:', error);
  }
}


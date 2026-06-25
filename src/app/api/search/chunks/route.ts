import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { paperChunks, uploadedPapers } from '@/db/schema';
import { desc, sql, and, eq } from 'drizzle-orm';
import {
  calculateRelevanceScore,
  generateHighlight,
  normalizeQuery,
  type SearchResult
} from '@/lib/search/keyword-extractor';

/**
 * POST /api/search/chunks - Search chunks by keywords
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Parse and validate search query
    const query = body.query?.trim();
    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters' },
        { status: 400 }
      );
    }

    const paperId = body.paperId; // Optional: search within specific paper
    const chunkTypes = body.chunkTypes; // Optional: filter by chunk types
    const limit = body.limit || 20; // Default: 20 results

    // Normalize query
    const queryTerms = normalizeQuery(query);
    if (queryTerms.length === 0) {
      return NextResponse.json(
        { error: 'No valid search terms after filtering stopwords' },
        { status: 400 }
      );
    }

    // Build query conditions
    const conditions = [];

    // Optional: Filter by paper
    if (paperId) {
      conditions.push(eq(paperChunks.paper_id, paperId));
    }

    // Optional: Filter by chunk types
    if (chunkTypes && Array.isArray(chunkTypes) && chunkTypes.length > 0) {
      conditions.push(sql`${paperChunks.chunk_type} IN ${chunkTypes}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Fetch all chunks that might match (we'll filter and score in memory)
    // This is a simple approach - for production with large datasets, consider:
    // - Full-text search (SQLite FTS5)
    // - Vector embeddings (for semantic search)
    // - External search service (Elasticsearch, Meilisearch)
    const allChunks = await db
      .select({
        id: paperChunks.id,
        paperId: paperChunks.paper_id,
        chunkType: paperChunks.chunk_type,
        chunkText: paperChunks.chunk_text,
        paperTitle: uploadedPapers.title
      })
      .from(paperChunks)
      .leftJoin(uploadedPapers, eq(paperChunks.paper_id, uploadedPapers.id))
      .where(whereClause)
      .orderBy(desc(paperChunks.created_at))
      .limit(500); // Limit initial fetch for performance

    // Calculate relevance scores for each chunk
    const scoredChunks: SearchResult[] = allChunks
      .map(chunk => {
        const relevanceScore = calculateRelevanceScore(
          chunk.chunkText,
          query,
          chunk.chunkType
        );

        // Only include chunks with non-zero score
        if (relevanceScore === 0) {
          return null;
        }

        // Find matched keywords
        const chunkLower = chunk.chunkText.toLowerCase();
        const matchedKeywords = queryTerms.filter(term =>
          chunkLower.includes(term)
        );

        return {
          chunkId: chunk.id,
          paperId: chunk.paperId,
          chunkType: chunk.chunkType,
          chunkText: chunk.chunkText,
          relevanceScore,
          matchedKeywords,
          highlight: generateHighlight(chunk.chunkText, query)
        };
      })
      .filter((chunk): chunk is SearchResult => chunk !== null)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);

    // Return results
    return NextResponse.json({
      results: scoredChunks,
      totalResults: scoredChunks.length,
      query: query,
      queryTerms: queryTerms
    });

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/search/chunks - Get search suggestions/autocomplete
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q')?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    // Get unique chunks that might contain the query
    const chunks = await db
      .select({
        chunkText: paperChunks.chunk_text
      })
      .from(paperChunks)
      .limit(100);

    // Extract words from chunks that start with query
    const words = new Set<string>();
    const queryLower = query.toLowerCase();

    for (const chunk of chunks) {
      const matches = chunk.chunkText
        .toLowerCase()
        .match(new RegExp(`\\b${queryLower}\\w*\\b`, 'g'));

      if (matches) {
        matches.forEach(word => {
          if (word.length >= 3) {
            words.add(word);
          }
        });
      }
    }

    // Return top 10 suggestions
    const suggestions = Array.from(words)
      .filter(word => word.startsWith(queryLower))
      .slice(0, 10);

    return NextResponse.json({
      suggestions,
      query
    });

  } catch (error) {
    console.error('Autocomplete error:', error);
    return NextResponse.json(
      { error: 'Autocomplete failed' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { paperChunks, uploadedPapers } from '@/db/schema';
import { desc, sql, and, eq } from 'drizzle-orm';
import {
  normalizeQuery,
} from '@/lib/search/keyword-extractor';
import { hybridSearch } from '@/lib/search/hybrid-search';
import { ensureIndexLoaded } from '@/lib/search/index-loader';

/**
 * POST /api/search/chunks - Hybrid search (keyword + semantic vector via RRF)
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

    // Normalize query for keyword-channel highlighting in the response.
    // NOTE: we do NOT gate on queryTerms.length === 0 here. normalizeQuery is
    // English-oriented (stopword list is English), so a pure Chinese/natural-
    // language query can produce zero English tokens — but the semantic channel
    // can still match it. Gating would block the very natural-language queries
    // semantic search is meant to enable.
    const queryTerms = normalizeQuery(query);

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

    // Fetch all candidate chunks (filtered by paperId/chunkTypes).
    // Both keyword and semantic channels score these in memory.
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

    // Ensure the in-memory vector index is warm (lazy load from DB on first call).
    // Failures here are non-fatal — hybridSearch degrades to keyword-only.
    try {
      await ensureIndexLoaded();
    } catch (e) {
      console.warn('[search/chunks] vector index load failed, falling back to keyword-only:', e);
    }

    // Run hybrid search: keyword recall + semantic recall, fused via RRF.
    const { results: scoredChunks, matchType } = await hybridSearch({
      query,
      chunks: allChunks.map((c) => ({
        chunkId: c.id,
        paperId: c.paperId,
        chunkType: c.chunkType,
        chunkText: c.chunkText,
      })),
      limit,
    });

    // Return results (contract is backward-compatible: existing fields kept,
    // matchType added so the UI can indicate semantic vs keyword matching).
    return NextResponse.json({
      results: scoredChunks,
      totalResults: scoredChunks.length,
      query: query,
      queryTerms: queryTerms,
      matchType
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

/**
 * Hybrid Search — fuses keyword retrieval with semantic vector retrieval
 * via Reciprocal Rank Fusion (RRF).
 *
 * Why RRF (not weighted score sum):
 *  - Keyword scores (count × position weight) and cosine similarities
 *    live on incomparable scales; a naive sum is dominated by whichever
 *    has larger magnitude.
 *  - RRF only uses each result's RANK within its own ranking, which is
 *    scale-invariant and robust. Standard formula with k=60.
 *
 * Graceful degradation (REQUIRED by SPEC):
 *  - If the vector index is empty or query embedding fails, falls back
 *    to keyword-only results. Search never breaks.
 */

import { calculateRelevanceScore, generateHighlight, normalizeQuery } from './keyword-extractor';
import { vectorIndex } from './vector-index';
import { generateEmbedding, isEmbeddingAvailable } from '../ai/embeddings';
import type { SearchResult } from './keyword-extractor';

/** A chunk row passed in by the caller (route fetches these once). */
export interface HybridChunkInput {
  chunkId: number;
  paperId: number;
  chunkType: string;
  chunkText: string;
}

export interface HybridSearchOptions {
  query: string;
  chunks: HybridChunkInput[];
  limit?: number;       // final results to return (default 20)
  topKPerChannel?: number; // per-channel recall depth (default 50)
}

export interface HybridSearchResult extends SearchResult {
  /** Which channels matched. */
  matchChannels: ('keyword' | 'semantic')[];
  /** Final fused RRF score. */
  rrfScore: number;
  /** Whether this result came only from semantic (no keyword overlap). */
  semanticOnly: boolean;
}

const RRF_K = 60; // standard constant; balances head vs tail of rankings

/** Detects if a chunk is mostly PDF-extraction garbage (skip semantic value). */
function looksLikeGarbage(text: string): boolean {
  if (!text || text.trim().length < 20) return true;
  const low = text.toLowerCase();
  // Heuristic: >50% "Warning:" lines → extraction noise.
  const warnCount = (low.match(/warning:/g) || []).length;
  const lineCount = text.split('\n').filter(Boolean).length || 1;
  return warnCount / lineCount > 0.5;
}

/**
 * Run hybrid search. Returns results sorted by fused RRF score.
 *
 * The caller is responsible for fetching `chunks` (filtered by paperId /
 * chunkTypes as needed) so this function stays a pure, testable transform.
 */
export async function hybridSearch(opts: HybridSearchOptions): Promise<{
  results: HybridSearchResult[];
  matchType: 'hybrid' | 'keyword-only' | 'semantic-only' | 'none';
}> {
  const { query, chunks, limit = 20, topKPerChannel = 50 } = opts;
  const queryTerms = normalizeQuery(query);

  // --- Channel A: keyword recall ---
  // Score every chunk, drop zeros, keep top-K.
  const keywordRanked: Array<{ chunk: HybridChunkInput; score: number }> = [];
  for (const chunk of chunks) {
    const score = calculateRelevanceScore(chunk.chunkText, query, chunk.chunkType);
    if (score > 0) keywordRanked.push({ chunk, score });
  }
  keywordRanked.sort((a, b) => b.score - a.score);
  const keywordTop = keywordRanked.slice(0, topKPerChannel);

  // --- Channel B: semantic recall (with graceful degradation) ---
  const semanticRanked: Array<{ chunkId: number; score: number }> = [];
  let semanticAvailable = false;
  let semanticReason = '';

  if (vectorIndex.size === 0) {
    semanticReason = 'vector index empty (not yet backfilled)';
  } else if (!isEmbeddingAvailable()) {
    semanticReason = 'ZHIPU_API_KEY not configured';
  } else {
    try {
      const queryEmbedding = await generateEmbedding(query);
      // Restrict semantic recall to the candidate set's chunkIds. The vector
      // index is global (all papers), but the caller filtered `chunks` by
      // paperId / chunkTypes — semantic hits outside that set would violate
      // the filter and surface as chunks we can't describe (unknown chunkType).
      const candidateIds = new Set(chunks.map((c) => c.chunkId));
      const rawHits = vectorIndex.search(queryEmbedding, topKPerChannel);
      semanticRanked.push(...rawHits.filter((h) => candidateIds.has(h.chunkId)));
      semanticAvailable = semanticRanked.length > 0;
    } catch (e: any) {
      // Any embedding failure → degrade to keyword-only. Never throw.
      semanticReason = `embedding error: ${e.message?.slice(0, 80) || 'unknown'}`;
    }
  }

  if (!semanticAvailable && semanticReason) {
    // Log once so operators can see why semantic is off, but don't break search.
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[hybrid-search] semantic channel disabled: ${semanticReason}`);
    }
  }

  // --- Fuse via RRF ---
  // Build RRF scores keyed by chunkId.
  const rrf = new Map<number, { score: number; channels: Set<'keyword' | 'semantic'> }>();
  const bump = (chunkId: number, rank: number, channel: 'keyword' | 'semantic') => {
    const contribution = 1 / (RRF_K + rank + 1); // rank is 0-indexed
    const entry = rrf.get(chunkId) || { score: 0, channels: new Set() };
    entry.score += contribution;
    entry.channels.add(channel);
    rrf.set(chunkId, entry);
  };
  keywordTop.forEach((r, rank) => bump(r.chunk.chunkId, rank, 'keyword'));
  semanticRanked.forEach((r, rank) => bump(r.chunkId, rank, 'semantic'));

  // Index chunk inputs for O(1) lookup during result assembly.
  const chunkById = new Map(chunks.map((c) => [c.chunkId, c]));

  // Assemble final results sorted by fused score.
  const fused: HybridSearchResult[] = Array.from(rrf.entries())
    .map(([chunkId, info]) => {
      const chunk = chunkById.get(chunkId);
      // Defensive: skip any chunkId we can't describe (shouldn't happen now
      // that semantic recall is restricted to the candidate set, but never
      // surface an under-described result).
      if (!chunk) return null;
      const matchedKeywords = queryTerms.filter((term) =>
        chunk.chunkText.toLowerCase().includes(term.toLowerCase())
      );
      const channels = Array.from(info.channels);
      return {
        chunkId,
        paperId: chunk.paperId,
        chunkType: chunk.chunkType,
        chunkText: chunk.chunkText,
        relevanceScore: info.score, // fused score, surfaced under existing field
        matchedKeywords,
        highlight: generateHighlight(chunk.chunkText, query),
        matchChannels: channels,
        rrfScore: info.score,
        semanticOnly: channels.length === 1 && channels[0] === 'semantic',
      } as HybridSearchResult;
    })
    .filter((r): r is HybridSearchResult => r !== null)
    // Garbage chunks shouldn't surface even if semantic matched them.
    .filter((r) => !looksLikeGarbage(r.chunkText))
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .slice(0, limit);

  let matchType: 'hybrid' | 'keyword-only' | 'semantic-only' | 'none' = 'none';
  const hasKeyword = fused.some((r) => r.matchChannels.includes('keyword'));
  const hasSemantic = fused.some((r) => r.matchChannels.includes('semantic'));
  if (hasKeyword && hasSemantic) matchType = 'hybrid';
  else if (hasKeyword) matchType = 'keyword-only';
  else if (hasSemantic) matchType = 'semantic-only';

  return { results: fused, matchType };
}

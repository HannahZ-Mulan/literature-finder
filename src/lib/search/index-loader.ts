/**
 * Vector index loader — populates the in-memory index from the
 * chunk_embeddings table on first use (lazy), then it stays warm.
 *
 * Why lazy (not at boot): embedding rows are only needed when search
 * runs; lazy loading keeps cold-start fast and avoids hitting the DB on
 * routes that never search.
 */

import { db } from '@/db';
import { chunkEmbeddings } from '@/db/schema';
import { vectorIndex } from './vector-index';

let loadPromise: Promise<void> | null = null;

/**
 * Ensure the in-memory index is populated. Safe to call on every search —
 * after the first successful load it's a no-op (returns immediately).
 * Concurrent callers share the same load promise (no thundering herd).
 */
export async function ensureIndexLoaded(): Promise<void> {
  if (vectorIndex.size > 0) return; // already warm
  if (!loadPromise) {
    loadPromise = loadFromDb().catch((e) => {
      // Reset so a later call can retry after a transient failure.
      loadPromise = null;
      throw e;
    });
  }
  return loadPromise;
}

async function loadFromDb(): Promise<void> {
  const rows = await db.select({
    chunkId: chunkEmbeddings.chunk_id,
    embedding: chunkEmbeddings.embedding,
  }).from(chunkEmbeddings);

  const items: Array<{ chunkId: number; vector: number[] }> = [];
  for (const row of rows) {
    try {
      items.push({ chunkId: row.chunkId, vector: JSON.parse(row.embedding) });
    } catch {
      // Skip malformed rows (shouldn't happen, but don't poison the index).
    }
  }
  vectorIndex.loadAll(items);

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[vector-index] loaded ${vectorIndex.size} embeddings into memory`);
  }
}

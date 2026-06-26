/**
 * In-Memory Vector Index
 *
 * Stores chunk embeddings in a process-singleton Map and computes cosine
 * similarity at search time. No external vector database — at 195 chunks
 * (≈800KB for 1024-dim) full-scan cosine is microsecond-scale, and stays
 * comfortable well past 10k chunks.
 *
 * The index is rebuilt from the `chunk_embeddings` table at startup (Task 3).
 * Until populated, search() returns [], which callers treat as graceful
 * degradation to keyword-only retrieval.
 */

/** A scored hit from vector search. */
export interface VectorSearchResult {
  chunkId: number;
  /** Cosine similarity in [-1, 1]; higher is more similar. */
  score: number;
}

interface Entry {
  chunkId: number;
  vector: number[];
  /** Pre-computed L2 norm for cosine efficiency. */
  norm: number;
}

class VectorIndex {
  private entries = new Map<number, Entry>();

  /** Upsert a chunk's embedding. Replaces if chunkId already exists. */
  addVector(chunkId: number, vector: number[]): void {
    this.entries.set(chunkId, {
      chunkId,
      vector,
      norm: l2Norm(vector),
    });
  }

  /** Bulk load (clears existing first). Used at startup rebuild. */
  loadAll(items: Array<{ chunkId: number; vector: number[] }>): void {
    this.entries.clear();
    for (const item of items) {
      this.addVector(item.chunkId, item.vector);
    }
  }

  removeVector(chunkId: number): void {
    this.entries.delete(chunkId);
  }

  /** Number of indexed chunks. Useful for health checks / degradation logic. */
  get size(): number {
    return this.entries.size;
  }

  /**
   * Find the top-K most similar chunks to the query embedding.
   * Returns [] when the index is empty (caller should degrade to keyword).
   */
  search(queryVector: number[], topK: number = 50): VectorSearchResult[] {
    if (this.entries.size === 0) return [];

    const queryNorm = l2Norm(queryVector);
    // Guard against zero vector (would produce NaN similarities).
    if (queryNorm === 0) return [];

    const scored: VectorSearchResult[] = [];
    for (const entry of this.entries.values()) {
      const denom = queryNorm * entry.norm;
      if (denom === 0) continue;
      const score = dot(queryVector, entry.vector) / denom;
      scored.push({ chunkId: entry.chunkId, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }
}

/** Process-wide singleton. */
export const vectorIndex = new VectorIndex();

// --- linear-algebra helpers (no deps) ---

function dot(a: number[], b: number[]): number {
  let sum = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) sum += a[i] * b[i];
  return sum;
}

function l2Norm(v: number[]): number {
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
  return Math.sqrt(sum);
}

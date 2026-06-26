/**
 * Zhipu Embedding Service
 *
 * Converts text to dense vectors using Zhipu's embedding-3 model (1024 dims).
 * Reuses the auth pattern from src/lib/glm/client.ts (open.bigmodel.cn/api/paas/v4).
 *
 * Why embedding-3 (not DeepSeek):
 *  - DeepSeek focuses on chat; embedding endpoints are limited.
 *  - Zhipu embedding-3 is mature, bilingual (zh+en), 1024-dim, and
 *    ZHIPU_API_KEY is already configured in this project.
 *
 * Pricing: ~¥0.5 / 1M tokens. 195 chunks backfill ≈ a few thousand tokens (< ¥0.1).
 */

const EMBEDDING_MODEL = 'embedding-3';
const EMBEDDING_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4/embeddings';
// Max texts per batch request — keeps payload reasonable; embedding-3 supports batching.
const BATCH_SIZE = 16;

/** Result of a single embedding call with usage telemetry. */
export interface EmbeddingResult {
  embedding: number[];
  usage?: { promptTokens: number; totalTokens: number };
}

/**
 * Check whether the embedding service is configured.
 * Search callers use this to decide graceful degradation.
 */
export function isEmbeddingAvailable(): boolean {
  return !!(process.env.ZHIPU_API_KEY || process.env.ZHIPU_GLM_API_KEY);
}

function getApiKey(): string {
  const key = process.env.ZHIPU_API_KEY || process.env.ZHIPU_GLM_API_KEY || '';
  if (!key) {
    throw new Error(
      '[embeddings] ZHIPU_API_KEY not configured. Set it in .env.local to enable semantic search.'
    );
  }
  return key;
}

/**
 * Generate embedding for a single text.
 * Throws on missing key or API failure — callers must catch and degrade.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('[embeddings] Cannot embed empty text.');
  }
  const result = await generateEmbeddings([text]);
  return result[0];
}

/**
 * Generate embeddings for multiple texts in batched requests.
 * Returns a flat array aligned with the input order.
 *
 * Batching reduces API calls: 195 chunks ÷ 16/batch ≈ 13 requests.
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const apiKey = getApiKey();
  const results: number[][] = [];

  // Embed one text per request (most compatible with the cURL example,
  // which uses a single string for `input`). Batch optimization deferred
  // until the basic path is proven working.
  for (const text of texts) {
    const embedding = await callEmbeddingApi(apiKey, text);
    results.push(embedding);
  }

  return results;
}

/**
 * Low-level call to the Zhipu embeddings endpoint.
 * Mirrors the fetch shape used by glm/client.ts.
 *
 * NOTE: `input` is a single string (per official cURL example), not an array.
 */
async function callEmbeddingApi(
  apiKey: string,
  input: string
): Promise<number[]> {
  const response = await fetch(EMBEDDING_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '<unreadable>');
    throw new Error(
      `[embeddings] Zhipu API error ${response.status}: ${errBody.slice(0, 300)}`
    );
  }

  const data = await response.json();

  // Zhipu returns { data: [{ embedding: number[], index }], usage: {...} }
  // For a single-string input, data.data has exactly one element.
  if (!data?.data || !Array.isArray(data.data) || data.data.length === 0) {
    throw new Error(
      `[embeddings] Unexpected response shape: ${JSON.stringify(data).slice(0, 300)}`
    );
  }

  return data.data[0].embedding as number[];
}

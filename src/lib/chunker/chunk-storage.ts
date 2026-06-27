import { db } from '@/db';
import { paperChunks, chunkEmbeddings } from '@/db/schema';
import { Section } from './section-detector';
import { eq } from 'drizzle-orm';
import { generateEmbedding, isEmbeddingAvailable } from '@/lib/ai/embeddings';
import { vectorIndex } from '@/lib/search/vector-index';

// Minimum meaningful text length for embedding (filters PDF-extraction garbage).
const MIN_EMBEDDABLE_CHARS = 20;

/**
 * Store chunks in database
 * @param paperId - ID of paper
 * @param sections - Array of sections to store
 * @returns Number of chunks stored
 */
export async function storeChunks(
  paperId: number,
  sections: Section[]
): Promise<number> {
  console.log(`Storing ${sections.length} chunks for paper ${paperId}...`);

  let storedCount = 0;
  let embeddedCount = 0;
  const errors: Array<{ index: number; error: string }> = [];

  const canEmbed = isEmbeddingAvailable();

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];

    try {
      // Insert and return the generated chunk id (for linking the embedding).
      const [inserted] = await db.insert(paperChunks).values({
        paper_id: paperId,
        chunk_type: section.type,
        chunk_text: section.text,
        char_start: section.startPos,
        char_end: section.endPos
      }).returning({ id: paperChunks.id });
      storedCount++;

      // Best-effort incremental embedding: failures must NOT break upload.
      // Skipped when no API key, or text is too short / garbage.
      if (canEmbed && inserted && section.text.trim().length >= MIN_EMBEDDABLE_CHARS) {
        try {
          const embedding = await generateEmbedding(section.text.slice(0, 6000));
          await db.insert(chunkEmbeddings).values({
            chunk_id: inserted.id,
            embedding: JSON.stringify(embedding),
            model: 'embedding-3',
          });
          vectorIndex.addVector(inserted.id, embedding);
          embeddedCount++;
        } catch (embError) {
          console.warn(`[chunk-storage] embedding failed for chunk ${inserted.id} (non-fatal):`,
            embError instanceof Error ? embError.message.slice(0, 80) : 'unknown');
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to store chunk ${i}:`, errorMsg);
      errors.push({ index: i, error: errorMsg });
    }
  }

  if (errors.length > 0) {
    console.warn(`⚠️  Failed to store ${errors.length}/${sections.length} chunks:`, errors);
  }

  console.log(`✅ Stored ${storedCount}/${sections.length} chunks (${embeddedCount} embedded)`);
  return storedCount;
}

/**
 * Get all chunks for a paper
 * @param paperId - ID of paper
 * @returns Array of chunks
 */
export async function getChunksByPaperId(paperId: number) {
  const chunks = await db.select({
    id: paperChunks.id,
    paper_id: paperChunks.paper_id,
    chunk_type: paperChunks.chunk_type,
    chunk_text: paperChunks.chunk_text,
    char_start: paperChunks.char_start,
    char_end: paperChunks.char_end,
    created_at: paperChunks.created_at
  })
  .from(paperChunks)
  .where(eq(paperChunks.paper_id, paperId))
  .orderBy(paperChunks.char_start);

  return chunks;
}

/**
 * Delete all chunks for a paper
 * @param paperId - ID of paper
 */
export async function deleteChunksByPaperId(paperId: number) {
  await db.delete(paperChunks)
    .where(eq(paperChunks.paper_id, paperId));
}

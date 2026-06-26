import { NextRequest, NextResponse } from 'next/server';
import { dbPapers } from '@/db/index-papers';
import { papers } from '@/db/index-papers';
import { getChunksByPaperId } from '@/lib/chunker/chunk-storage';
import { getChunkReadingGuidePrompt, getChunkTypeLabel } from '@/lib/ai/immersive-read-prompt';
import { eq } from 'drizzle-orm';

// Concurrency control: prevent duplicate generation for the same paper
const generationInProgress = new Set<number>();

// Types that should be skipped (not worth reading guide)
const SKIP_CHUNK_TYPES = new Set(['references', 'appendix']);

// Min chunk length to generate a reading guide
const MIN_CHUNK_LENGTH = 100;

// Chunks shorter than this will be merged with adjacent chunks
const MERGE_THRESHOLD = 500;

export interface ImmersiveReading {
  chunkId: number;
  chunkType: string;
  chunkTypeLabel: string;
  chunkText: string;
  reading: string;
  error?: boolean;
}

/**
 * Merge adjacent short chunks to reduce API calls
 */
function mergeShortChunks(
  chunks: Array<{ id: number; chunk_type: string; chunk_text: string }>
): Array<{ id: number; chunk_type: string; chunk_text: string }> {
  const merged: Array<{ id: number; chunk_type: string; chunk_text: string }> = [];
  let current = chunks[0] ? { ...chunks[0] } : null;

  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (
      current &&
      current.chunk_type === chunk.chunk_type &&
      current.chunk_text.length < MERGE_THRESHOLD
    ) {
      // Merge adjacent chunks of the same type if current is still short
      current.chunk_text += '\n\n' + chunk.chunk_text;
      // Keep the first chunk's ID for reference
    } else {
      if (current) merged.push(current);
      current = { ...chunk };
    }
  }
  if (current) merged.push(current);

  return merged;
}

/**
 * Generate a reading guide for a single chunk using DeepSeek
 */
async function generateSingleReading(
  chunkText: string,
  chunkType: string,
  title: string
): Promise<string> {
  const { getDeepSeekClient } = await import('@/lib/ai/deepseek');
  const client = getDeepSeekClient();

  const prompt = getChunkReadingGuidePrompt({
    chunkText,
    chunkType,
    title,
  });

  const result = await client.chat(
    '你是一位研究经验丰富的学术导师，擅长用通俗易懂的中文讲解英文学术论文。',
    prompt,
    { temperature: 0.6, maxTokens: 400 }
  );
  return result.content?.trim() || '';
}

// GET - Load cached readings
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paperId = parseInt(params.id);
    if (isNaN(paperId)) {
      return NextResponse.json({ error: 'Invalid paper ID' }, { status: 400 });
    }

    const paperList = await dbPapers
      .select({ id: papers.id, immersiveReadings: papers.immersiveReadings })
      .from(papers)
      .where(eq(papers.id, paperId))
      .limit(1);

    if (paperList.length === 0) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 });
    }

    const paper = paperList[0];

    // Return cached readings if available
    if (paper.immersiveReadings) {
      try {
        const readings: ImmersiveReading[] = JSON.parse(paper.immersiveReadings);
        return NextResponse.json({ readings, cached: true });
      } catch (e) {
        console.error('[Immersive Read] Failed to parse cached readings:', e);
      }
    }

    return NextResponse.json({ readings: [], cached: false });
  } catch (error) {
    console.error('[Immersive Read] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load readings' },
      { status: 500 }
    );
  }
}

// POST - Generate readings for all chunks
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paperId = parseInt(params.id);
    if (isNaN(paperId)) {
      return NextResponse.json({ error: 'Invalid paper ID' }, { status: 400 });
    }

    // Concurrency control
    if (generationInProgress.has(paperId)) {
      return NextResponse.json(
        { error: '正在生成中，请勿重复请求', retry: true, degraded: false },
        { status: 409 }
      );
    }
    generationInProgress.add(paperId);

    try {
      // Fetch paper
      const paperList = await dbPapers
        .select()
        .from(papers)
        .where(eq(papers.id, paperId))
        .limit(1);

      if (paperList.length === 0) {
        return NextResponse.json({ error: 'Paper not found' }, { status: 404 });
      }

      const paper = paperList[0];

      if (!paper.extractedText || paper.extractedText.trim().length < 50) {
        return NextResponse.json(
          { error: '论文内容为空，无法生成沉浸式深读' },
          { status: 400 }
        );
      }

      // Fetch chunks
      const chunks = await getChunksByPaperId(paperId);

      if (!chunks || chunks.length === 0) {
        return NextResponse.json(
          { error: '论文尚未完成分段分析，请稍后重试' },
          { status: 400 }
        );
      }

      // Filter: remove skip types and short chunks
      const filteredChunks = chunks.filter(
        (c) =>
          !SKIP_CHUNK_TYPES.has(c.chunk_type) && c.chunk_text.trim().length >= MIN_CHUNK_LENGTH
      );

      if (filteredChunks.length === 0) {
        return NextResponse.json(
          { error: '没有可生成导读的段落' },
          { status: 400 }
        );
      }

      // Merge adjacent short chunks of same type
      const mergedChunks = mergeShortChunks(filteredChunks);

      console.log(
        `[Immersive Read] Paper ${paperId}: ${chunks.length} total chunks → ${filteredChunks.length} filtered → ${mergedChunks.length} after merge`
      );

      // Generate readings sequentially (controlled rate)
      const readings: ImmersiveReading[] = [];
      let completed = 0;
      let failed = 0;

      for (const chunk of mergedChunks) {
        try {
          const reading = await generateSingleReading(
            chunk.chunk_text,
            chunk.chunk_type,
            paper.title
          );

          readings.push({
            chunkId: chunk.id,
            chunkType: chunk.chunk_type,
            chunkTypeLabel: getChunkTypeLabel(chunk.chunk_type),
            chunkText: chunk.chunk_text,
            reading,
          });
          completed++;
        } catch (error) {
          console.error(
            `[Immersive Read] Failed to generate reading for chunk ${chunk.id}:`,
            error
          );
          readings.push({
            chunkId: chunk.id,
            chunkType: chunk.chunk_type,
            chunkTypeLabel: getChunkTypeLabel(chunk.chunk_type),
            chunkText: chunk.chunk_text,
            reading: '',
            error: true,
          });
          failed++;
        }
      }

      // Cache results to database
      try {
        await dbPapers
          .update(papers)
          .set({
            immersiveReadings: JSON.stringify(readings),
            updatedAt: new Date(),
          })
          .where(eq(papers.id, paperId));
        console.log(`[Immersive Read] Cached ${readings.length} readings for paper ${paperId}`);
      } catch (cacheError) {
        console.error('[Immersive Read] Failed to cache readings:', cacheError);
        // Non-fatal: still return results to client
      }

      return NextResponse.json({
        readings,
        cached: false,
        progress: { total: mergedChunks.length, completed, failed },
      });
    } finally {
      generationInProgress.delete(paperId);
    }
  } catch (error) {
    console.error('[Immersive Read] POST error:', error);
    // Clean up concurrency lock using the validated paperId
    // (paperId may not be defined if error occurs before validation, so guard with parseInt)
    const pid = parseInt(params.id);
    if (!isNaN(pid)) generationInProgress.delete(pid);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '生成沉浸式深读失败',
        degraded: true,
      },
      { status: 503 }
    );
  }
}

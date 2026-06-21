import { NextRequest, NextResponse } from 'next/server';
import { dbPapers, papers } from '@/db/index-papers';
import { eq } from 'drizzle-orm';
import { detectSections } from '@/lib/chunker/section-detector';
import { storeChunks, deleteChunksByPaperId } from '@/lib/chunker/chunk-storage';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paperId = parseInt(params.id);
    if (isNaN(paperId)) {
      return NextResponse.json({ error: 'Invalid paper ID' }, { status: 400 });
    }

    console.log(`[ReChunk] Starting re-chunking for paper ID=${paperId}`);

    // Get the paper from database
    const paperList = await dbPapers.select({
      id: papers.id,
      title: papers.title,
      extractedText: papers.extractedText,
    })
    .from(papers)
    .where(eq(papers.id, paperId))
    .limit(1);

    if (paperList.length === 0) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 });
    }

    const paper = paperList[0];

    // Check if text extraction is complete
    if (!paper.extractedText || paper.extractedText.length < 100) {
      return NextResponse.json(
        { error: 'Paper text extraction not complete or too short' },
        { status: 400 }
      );
    }

    // Delete existing chunks
    console.log(`[ReChunk] Deleting existing chunks for paper ID=${paperId}`);
    await deleteChunksByPaperId(paperId);

    // Detect and store new chunks
    console.log(`[ReChunk] Detecting sections for paper ID=${paperId}`);
    const sections = detectSections(paper.extractedText);
    const storedCount = await storeChunks(paperId, sections);

    console.log(`[ReChunk] ✅ Re-chunked paper ID=${paperId}: ${storedCount} chunks created`);

    return NextResponse.json({
      success: true,
      message: 'Paper re-chunked successfully',
      paperId,
      chunksStored: storedCount,
      title: paper.title,
    });
  } catch (error) {
    console.error(`[ReChunk] ❌ Failed for paper ID=${params.id}:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

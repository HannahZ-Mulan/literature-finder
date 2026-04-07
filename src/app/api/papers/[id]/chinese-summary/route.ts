import { NextRequest, NextResponse } from 'next/server';
import { dbPapers } from '@/db/index-papers';
import { papers } from '@/db/index-papers';
import { eq } from 'drizzle-orm';
import { getAIManager } from '@/lib/ai';
import { getHumanChineseSummaryPrompt } from '@/lib/ai/chinese-summary-prompt';

// POST - Generate human-friendly Chinese summary
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paperId = parseInt(params.id);
    if (isNaN(paperId)) {
      return NextResponse.json({ error: 'Invalid paper ID' }, { status: 400 });
    }

    const paperList = await dbPapers
      .select()
      .from(papers)
      .where(eq(papers.id, paperId))
      .limit(1);

    if (paperList.length === 0) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 });
    }

    const paper = paperList[0];

    // Check if paper has content
    if (!paper.extractedText || paper.extractedText.trim().length < 50) {
      return NextResponse.json({
        error: '论文内容为空，无法生成中文解读',
        details: `论文《${paper.title}》文本长度不足`,
      }, { status: 400 });
    }

    // Use first 10000 chars for better context
    const content = paper.extractedText.slice(0, 10000);

    // Get the human-friendly Chinese summary prompt
    const prompt = getHumanChineseSummaryPrompt({
      title: paper.title,
      content: content
    });

    console.log(`[Chinese Summary] Generating for paper ${paperId}...`);

    // 直接调用 DeepSeek API
    const { getDeepSeekClient } = await import('@/lib/ai/deepseek');
    const deepSeekClient = getDeepSeekClient();

    const result = await deepSeekClient.generateSummary(
      paper.title,
      prompt, // Use our custom prompt as the content
      'detailed' // Use detailed to get more content
    );

    console.log(`[Chinese Summary] Generated successfully`);
    console.log(`[Chinese Summary] Response length:`, result.content?.length || 0);

    // Return the raw AI response (already formatted by the prompt)
    return NextResponse.json({
      summary: result.content,
      provider: 'deepseek',
      usage: result.usage,
      cached: false,
    });
  } catch (error) {
    console.error('Generate Chinese summary error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate Chinese summary' },
      { status: 500 }
    );
  }
}

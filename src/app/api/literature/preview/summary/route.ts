import { NextRequest, NextResponse } from 'next/server';
import { getAIManager } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, abstract } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // 使用 AI 管理器生成快速预览（中英文对照）
    const aiManager = getAIManager();

    try {
      const response = await aiManager.generateQuickPreview(
        title,
        abstract || ''
      );

      // generateMockQuickPreview 返回 { content, chinese, english, usage }
      // 其他 provider 只返回 { content, usage }
      const english = (response as any).english || response.content;
      const chinese = (response as any).chinese || '';

      return NextResponse.json({
        english,
        chinese,
        provider: response.provider,
        usage: response.usage,
      });
    } catch (aiError: any) {
      console.error('[Preview Summary] AI Error:', aiError.message);

      // 返回基础信息作为fallback
      const fallbackEnglish = `**Title**: ${title}\n\nAI summary generation failed. Please try again later.\n\n${abstract ? `\n---\n\n**Original Abstract:**\n\n${abstract}` : ''}`;

      const fallbackChinese = `**标题**: ${title}\n\n暂无AI生成摘要，请稍后重试。`;

      return NextResponse.json({
        english: fallbackEnglish,
        chinese: fallbackChinese,
        provider: 'fallback',
      });
    }
  } catch (error: any) {
    console.error('[Preview Summary] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}

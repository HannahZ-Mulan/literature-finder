import { NextRequest, NextResponse } from 'next/server';
import { dbPapers } from '@/db/index-papers';
import { papers } from '@/db/index-papers';
import { eq } from 'drizzle-orm';
import { getAIManager } from '@/lib/ai';

// GET - Retrieve existing summary
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
      .select()
      .from(papers)
      .where(eq(papers.id, paperId))
      .limit(1);

    if (paperList.length === 0) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 });
    }

    const paper = paperList[0];

    if (!paper.summary) {
      return NextResponse.json({ error: 'No summary found' }, { status: 404 });
    }

    return NextResponse.json({
      summary: JSON.parse(paper.summary),
      cached: true,
    });
  } catch (error) {
    console.error('Get summary error:', error);
    return NextResponse.json({ error: 'Failed to get summary' }, { status: 500 });
  }
}

// POST - Generate new summary
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
        error: '论文内容为空，无法生成摘要',
        details: `论文《${paper.title}》尚未提取文本内容，或者提取失败。文本长度：${paper.extractedText?.length || 0} 字符`,
      }, { status: 400 });
    }

    // Check if summary already exists (skip when ?force=1 to regenerate)
    const forceRegenerate = request.nextUrl.searchParams.get('force') === '1';
    if (paper.summary && !forceRegenerate) {
      return NextResponse.json({
        summary: JSON.parse(paper.summary),
        cached: true,
      });
    }

    // 直接调用 DeepSeek API，要求 JSON 输出（markdown 解析过于脆弱）
    const { getDeepSeekClient } = await import('@/lib/ai/deepseek');
    const deepSeekClient = getDeepSeekClient();

    const title = paper.title;

    // 智能提取策略：开头+结尾，确保覆盖摘要、引言、方法、讨论、结论
    const getContentForAnalysis = (fullText: string) => {
      const maxLength = 25000;

      if (fullText.length <= maxLength) {
        return fullText;
      }

      const beginning = fullText.substring(0, 18000);
      const ending = fullText.substring(fullText.length - 7000);

      return beginning + '\n\n...[中间内容省略]...\n\n' + ending;
    };

    const content = getContentForAnalysis(paper.extractedText);

    const prompt = `你是一个学术论文解读专家。请基于提供的论文内容生成结构化的中文摘要。

要求：
- 使用简洁、清晰的中文
- 不要编造信息
- 如果论文中没有提到，请明确说明"论文未提及"
- 每个字段都必须有内容，不能为空字符串

论文标题：${title}

论文内容：
${content}

严格按照以下 JSON schema 输出，只返回 JSON 对象，不要任何额外文字或 markdown 代码块：
{
  "one_sentence": "一句话总结，≤50字",
  "research_question": "论文要解决的核心问题",
  "method": "研究方法和实验设计",
  "key_findings": "主要研究结果和结论",
  "contribution": "研究的创新点和学术贡献",
  "limitations": "研究的不足和限制"
}

只返回 JSON 对象。`;

    let result;
    try {
      result = await deepSeekClient.generateSummary(title, prompt, 'detailed');
    } catch (aiError) {
      console.error('[Summary] AI generation failed:', aiError);
      return NextResponse.json({
        error: 'AI 摘要生成失败，请稍后重试',
        degraded: true,
        message: 'AI 服务暂时不可用，无法生成结构化摘要',
      }, { status: 503 });
    }

    const aiContent = result.content || '';

    // 解析 JSON：先尝试 ```json 代码块，再尝试裸 {...}
    const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) ||
                      aiContent.match(/\{[\s\S]*\}/);

    let structuredSummary;

    if (jsonMatch) {
      try {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        structuredSummary = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('[Summary] JSON parse failed:', parseError);
        return NextResponse.json({
          error: 'AI 返回格式无法解析',
          degraded: true,
          message: 'AI 返回的内容格式异常，请重试',
        }, { status: 502 });
      }
    } else {
      console.warn('[Summary] No JSON found in AI response');
      return NextResponse.json({
        error: 'AI 未返回有效 JSON',
        degraded: true,
        message: 'AI 返回的内容格式异常，请重试',
      }, { status: 502 });
    }

    // 空字段守卫：任何缺失的字段填入明确提示，避免前端显示空白
    const FIELDS = ['one_sentence', 'research_question', 'method', 'key_findings', 'contribution', 'limitations'] as const;
    for (const field of FIELDS) {
      if (!structuredSummary[field] || !String(structuredSummary[field]).trim()) {
        structuredSummary[field] = '论文未明确提及该部分内容';
      }
    }

    // Save summary to database
    await dbPapers
      .update(papers)
      .set({ summary: JSON.stringify(structuredSummary) })
      .where(eq(papers.id, paperId));

    return NextResponse.json({
      summary: structuredSummary,
      cached: false,
      provider: 'deepseek',
      usage: result.usage,
    });
  } catch (error) {
    console.error('Generate summary error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate summary' },
      { status: 500 }
    );
  }
}

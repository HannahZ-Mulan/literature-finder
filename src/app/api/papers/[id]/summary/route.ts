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

    // Check if summary already exists
    if (paper.summary) {
      return NextResponse.json({
        summary: JSON.parse(paper.summary),
        cached: true,
      });
    }

    // 直接调用 DeepSeek API，避免双步生成
    const { getDeepSeekClient } = await import('@/lib/ai/deepseek');
    const deepSeekClient = getDeepSeekClient();

    const title = paper.title;

    // 智能提取策略：开头+结尾，确保覆盖摘要、引言、方法、讨论、结论
    const getContentForAnalysis = (fullText: string) => {
      const maxLength = 25000; // 增加到25000字符

      if (fullText.length <= maxLength) {
        return fullText; // 如果全文不长，使用全部
      }

      // 否则：提取开头18000字符 + 结尾7000字符
      const beginning = fullText.substring(0, 18000);
      const ending = fullText.substring(fullText.length - 7000);

      return beginning + '\n\n...[中间内容省略]...\n\n' + ending;
    };

    const content = getContentForAnalysis(paper.extractedText);

    const prompt = `你是一个学术论文解读专家。请基于提供的论文内容生成结构化的中文摘要。

要求：
- 使用简洁、清晰的中文
- 不要编造信息
- 如果论文中没有提到，请明确说明
- 每个部分都要有内容

论文标题：${title}

论文内容：
${content}

请按照以下结构输出（使用markdown格式）：

## 一句话总结
[≤50字]

## 研究问题
[论文要解决的核心问题]

## 方法
[研究方法和实验设计]

## 关键发现
[主要研究结果和结论]

## 主要贡献
[研究的创新点和学术贡献]

## 局限性
[研究的不足和限制]

请严格按照上述格式输出：`;

    const result = await deepSeekClient.generateSummary(title, prompt, 'detailed');

    // 解析结构化摘要
    const parseSummaryContent = (content: string) => {
      const sections = {
        one_sentence: '',
        research_question: '',
        method: '',
        key_findings: '',
        contribution: '',
        limitations: ''
      };

      // Split by ## headers
      const parts = content.split(/##+/).filter(s => s.trim());

      for (const part of parts) {
        const trimmed = part.trim();
        const lines = trimmed.split('\n').map(l => l.trim()).filter(l => l);

        if (lines.length === 0) continue;

        const header = lines[0];
        const content = lines.slice(1).join('\n').trim();

        // Match header to section
        if (header.includes('一句话总结')) {
          sections.one_sentence = content || '暂无总结';
        } else if (header.includes('研究问题')) {
          sections.research_question = content || '暂无信息';
        } else if (header.includes('方法')) {
          sections.method = content || '暂无信息';
        } else if (header.includes('关键发现') || header.includes('发现')) {
          sections.key_findings = content || '暂无信息';
        } else if (header.includes('贡献')) {
          sections.contribution = content || '暂无信息';
        } else if (header.includes('局限')) {
          sections.limitations = content || '暂无信息';
        }
      }

      return sections;
    };

    const structuredSummary = parseSummaryContent(result.content || '');

    // Save summary to database
    await dbPapers
      .update(papers)
      .set({ summary: JSON.stringify(structuredSummary) })
      .where(eq(papers.id, paperId));

    return NextResponse.json({
      summary: structuredSummary,
      cached: false,
      provider: result.provider,
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

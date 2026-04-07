import { NextRequest, NextResponse } from 'next/server';
import { dbPapers } from '@/db/index-papers';
import { papers } from '@/db/index-papers';
import { eq } from 'drizzle-orm';
import { getAIManager } from '@/lib/ai';

interface CoreInsights {
  oneSentence: string;
  keyFindings: string[];
  practicalValue: {
    students: string;
    professionals: string;
    general: string;
  };
}

// POST - Generate core insights for paper detail page
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
        error: '论文内容为空，无法生成核心解读',
        details: `论文《${paper.title}》文本长度不足`,
      }, { status: 400 });
    }

    // Use first 10000 chars for context
    const content = paper.extractedText.slice(0, 10000);

    console.log(`[Core Insights] Generating for paper ${paperId}...`);

    // Generate core insights using AI
    const insights = await generateCoreInsights(paper.title, content);

    console.log(`[Core Insights] Generated successfully`);

    return NextResponse.json({
      insights,
      cached: false,
    });
  } catch (error) {
    console.error('Generate core insights error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate core insights' },
      { status: 500 }
    );
  }
}

async function generateCoreInsights(title: string, content: string): Promise<CoreInsights> {
  const aiManager = getAIManager();

  // Prompt for generating core insights
  const prompt = `请基于以下论文内容，生成核心解读模块。

论文标题：${title}

论文内容：
${content}

请按以下结构输出（纯文本，不要markdown符号）：

=== 一句话总结 ===
用1-2句话概括这篇论文最核心的结论。

=== 核心发现 ===
只列出最重要的2到3个发现，每个发现用1-2句话说明。

=== 对学生的价值 ===
这篇论文对学生或研究者有什么用？
- 写论文时如何引用
- 做研究时可以借鉴什么
- 这篇论文在领域中的位置

=== 对职场人的价值 ===
这篇论文对职场人或产品经理有什么用？
- 工作中如何应用这个发现
- 能帮助做出什么决策
- 可以设计什么产品或功能

=== 对普通人的价值 ===
这篇论文对普通人或日常生活有什么用？
- 生活中可以怎么用
- 能改善什么问题
- 简单可操作的建议

请开始生成：`;

  const result = await aiManager.generateSummary(title, prompt, 'detailed');

  // Parse the response into structured format
  const sections = result.content.split('===').filter(s => s.trim());

  const insights: CoreInsights = {
    oneSentence: '',
    keyFindings: [],
    practicalValue: {
      students: '',
      professionals: '',
      general: '',
    }
  };

  for (const section of sections) {
    const trimmed = section.trim();
    if (trimmed.startsWith('一句话总结')) {
      insights.oneSentence = trimmed.replace('一句话总结', '').trim();
    } else if (trimmed.startsWith('核心发现')) {
      const findingsText = trimmed.replace('核心发现', '').trim();
      // Split by newlines and take first 2-3 non-empty lines
      const lines = findingsText.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0)
        .slice(0, 3);
      insights.keyFindings = lines;
    } else if (trimmed.startsWith('对学生的价值')) {
      insights.practicalValue.students = trimmed.replace('对学生的价值', '').trim();
    } else if (trimmed.startsWith('对职场人的价值')) {
      insights.practicalValue.professionals = trimmed.replace('对职场人的价值', '').trim();
    } else if (trimmed.startsWith('对普通人的价值')) {
      insights.practicalValue.general = trimmed.replace('对普通人的价值', '').trim();
    }
  }

  return insights;
}

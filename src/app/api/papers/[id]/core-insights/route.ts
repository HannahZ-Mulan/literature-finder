/**
 * AI核心解读 API - 认知压缩 + 价值提炼
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbPapers } from '@/db/index-papers';
import { papers } from '@/db/index-papers';
import { eq } from 'drizzle-orm';

interface CoreInsights {
  oneSentence: string;
  keyFindings: string[];
  qualityAssessment: string;
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

    console.log(`[Core Insights] Generating for paper ${paperId}...`);

    // Generate core insights using AI
    const insights = await generateCoreInsights(paper.title, paper.extractedText);

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
  // 直接调用 DeepSeek API，避免双步生成的复杂解析
  const { getDeepSeekClient } = await import('@/lib/ai/deepseek');
  const deepSeekClient = getDeepSeekClient();

  const prompt = `你是一个研究评估专家。你的任务不是"总结论文"，而是帮用户在30秒内做出判断：

【论文信息】
标题：${title}
内容：${content.substring(0, 8000)}

【输出格式】（严格按照以下格式输出，不要添加其他内容）

=== 一句话总结 ===
[直接讲核心结论，≤50字]

=== 核心发现 ===
1. [发现1，≤30字]
2. [发现2，≤30字]

=== 质量判断 ===
[一句话说明研究可靠程度]

=== 对学生/研究者的价值 ===
[具体可操作的建议]

=== 对职场人/产品经理的价值 ===
[具体可操作的建议]

=== 对普通人的价值 ===
[具体可操作的建议]

请严格按照上述格式输出：`;

  try {
    const response = await deepSeekClient.generateSummary(title, prompt, 'detailed');
    const content = response.content || '';

    // 添加日志以便调试
    console.log('[Core Insights] AI Response length:', content.length);
    console.log('[Core Insights] AI Response preview:', content.substring(0, 300));

    // 解析响应
    const sections = content.split('===').filter(s => s.trim());

    const insights: CoreInsights = {
      oneSentence: '',
      keyFindings: [],
      qualityAssessment: '',
      practicalValue: {
        students: '',
        professionals: '',
        general: '',
      }
    };

    for (const section of sections) {
      const trimmed = section.trim();
      console.log('[Core Insights] Parsing section:', trimmed.substring(0, 60));

      if (trimmed.startsWith('一句话总结')) {
        insights.oneSentence = trimmed.replace('一句话总结', '').trim();
      } else if (trimmed.startsWith('核心发现')) {
        const findingsText = trimmed.replace('核心发现', '').trim();
        // 按行或编号分割
        const lines = findingsText.split(/\n|\d+\.\s*/)
          .map(l => l.trim())
          .filter(l => l.length > 0 && l.length < 150)
          .slice(0, 3);
        insights.keyFindings = lines;
      } else if (trimmed.startsWith('质量判断')) {
        insights.qualityAssessment = trimmed.replace('质量判断', '').trim();
      } else if (trimmed.includes('对学生/研究者')) {
        insights.practicalValue.students = trimmed.replace(/===\s*对学生.*?价值\s*===/, '').trim();
      } else if (trimmed.includes('对职场人')) {
        insights.practicalValue.professionals = trimmed.replace(/===\s*对职场人.*?价值\s*===/, '').trim();
      } else if (trimmed.includes('对普通人')) {
        insights.practicalValue.general = trimmed.replace(/===\s*对普通人.*?价值\s*===/, '').trim();
      }
    }

    console.log('[Core Insights] Parsed insights:', {
      oneSentence: insights.oneSentence,
      keyFindingsCount: insights.keyFindings.length,
      hasQualityAssessment: !!insights.qualityAssessment,
      hasPracticalValue: !!(insights.practicalValue.students || insights.practicalValue.professionals || insights.practicalValue.general)
    });

    return insights;
  } catch (error) {
    console.error('[Core Insights] Generation error:', error);
    throw error;
  }
}

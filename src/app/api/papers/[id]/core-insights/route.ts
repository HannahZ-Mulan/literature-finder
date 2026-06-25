/**
 * AI核心解读 API - 认知压缩 + 价值提炼
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbPapers } from '@/db/index-papers';
import { papers } from '@/db/index-papers';
import { eq } from 'drizzle-orm';

interface CoreInsights {
  one_sentence_summary: string;
  one_sentence_summary_location: string; // 添加：一句话总结的引用位置
  research_question: string;
  research_question_location: string; // 添加：研究问题的引用位置
  methods: string;
  methods_location: string; // 添加：研究方法的引用位置
  key_findings: Array<{
    finding: string; // 发现内容
    location: string; // 引用位置，例如："第3页第2段" 或 "Introduction部分"
  }>;
  contributions: Array<{
    contribution: string; // 贡献内容
    location: string; // 引用位置
  }>;
  limitations: Array<{
    limitation: string; // 局限性内容
    location: string; // 引用位置
  }>;
  applications: {
    researcher: string;
    clinician: string;
    policy_maker: string;
  };
  quality_assessment: {
    level: 'high' | 'medium' | 'low';
    reason: string;
    location: string; // 添加：质量评估的引用位置
  };
  text_coverage: string; // 添加：说明分析覆盖了论文的哪些部分
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
    // AI generation failed. Surface this honestly to the user instead of
    // returning fabricated content that looks like a real analysis.
    console.error('Generate core insights error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to generate core insights',
      degraded: true,
      message: 'AI 核心解读生成失败，请稍后重试。以下内容不可用。',
    }, { status: 503 });
  }
}

async function generateCoreInsights(title: string, content: string): Promise<CoreInsights> {
  const { getDeepSeekClient } = await import('@/lib/ai/deepseek');
  const deepSeekClient = getDeepSeekClient();

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

  const contentForAI = getContentForAnalysis(content);

  const prompt = `You are an academic assistant. Analyze the following paper and return structured JSON.

CRITICAL REQUIREMENTS:
- 每个结论都必须标注引用位置（location）
- location格式：说明在论文中的位置，如"Abstract部分"、"Introduction第2段"、"Methods部分"、"Results第3页"、"Discussion部分结尾"、"Conclusion部分"等
- 必须基于实际论文内容，不能编造
- 如果某个部分无法在论文中找到明确对应，location标注为"全文综合推断"

Requirements:
- Be concise and specific
- No empty fields
- Use simple, clear academic Chinese language
- Strictly follow the JSON schema
- one_sentence_summary: ≤50字
- key_findings: 2-3条, 每条≤30字，必须标注location
- contributions: 2-3条, 每条≤30字，必须标注location
- limitations: 2-3条, 每条≤30字，必须标注location
- applications: each field ≤50字
- quality_assessment.level: only "high", "medium", or "low"
- text_coverage: 说明分析覆盖了论文的哪些部分（如"Abstract + Introduction + Methods + Results + Discussion"）

JSON schema:
{
  "one_sentence_summary": "...",
  "one_sentence_summary_location": "Abstract/Introduction/...",
  "research_question": "...",
  "research_question_location": "Introduction第X段/...",
  "methods": "...",
  "methods_location": "Methods部分/...",
  "key_findings": [
    {"finding": "...", "location": "Results第X段/..."},
    {"finding": "...", "location": "..."}
  ],
  "contributions": [
    {"contribution": "...", "location": "Discussion第X段/..."},
    {"contribution": "...", "location": "..."}
  ],
  "limitations": [
    {"limitation": "...", "location": "Discussion局限性部分/..."},
    {"limitation": "...", "location": "..."}
  ],
  "applications": {
    "researcher": "...",
    "clinician": "...",
    "policy_maker": "..."
  },
  "quality_assessment": {
    "level": "...",
    "reason": "...",
    "location": "Methods/Results部分"
  },
  "text_coverage": "分析覆盖了论文的哪些部分"
}

Paper:
Title: ${title}
Content: ${contentForAI}

Return ONLY the JSON object, no additional text.`;

  try {
    const response = await deepSeekClient.generateSummary(title, prompt, 'detailed');
    const aiContent = response.content || '';

    console.log('[Core Insights] AI Response length:', aiContent.length);
    console.log('[Core Insights] AI Response preview:', aiContent.substring(0, 500));

    // Try to parse JSON from AI response
    let insights: CoreInsights;

    // Extract JSON from response (handle markdown code blocks if present)
    const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) ||
                      aiContent.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      insights = JSON.parse(jsonStr);
      console.log('[Core Insights] Parsed JSON successfully');
    } else {
      console.warn('[Core Insights] No JSON found in response, using mock data');
      throw new Error('Failed to extract JSON from AI response');
    }

    // Validate required fields
    const requiredFields: Array<keyof CoreInsights> = [
      'one_sentence_summary', 'research_question', 'methods',
      'key_findings', 'contributions', 'limitations',
      'applications', 'quality_assessment'
    ];

    const missingFields = requiredFields.filter(field => !insights[field]);
    if (missingFields.length > 0) {
      console.warn('[Core Insights] Missing fields:', missingFields);
    }

    console.log('[Core Insights] Parsed successfully:', {
      one_sentence_summary: insights.one_sentence_summary?.substring(0, 50),
      research_question: insights.research_question?.substring(0, 50),
      key_findings_count: insights.key_findings?.length,
      contributions_count: insights.contributions?.length,
      limitations_count: insights.limitations?.length,
      quality_level: insights.quality_assessment?.level
    });

    return insights;
  } catch (error) {
    // Do NOT swallow the error with fake "mock" data - that would present
    // fabricated conclusions to the user as if they were real analysis.
    // Let the caller decide how to surface the failure.
    console.error('[Core Insights] Generation failed:', error);
    throw error;
  }
}

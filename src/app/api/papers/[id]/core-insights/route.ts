import { NextRequest, NextResponse } from 'next/server';
import { dbPapers } from '@/db/index-papers';
import { papers } from '@/db/index-papers';
import { eq } from 'drizzle-orm';
import { getAIManager } from '@/lib/ai';

interface CoreInsights {
  oneSentence: string;
  keyFindings: string[];
  qualityAssessment: string; // 新增：质量判断
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

  // 核心洞察prompt - 聚焦"认知压缩 + 价值提炼"
  const prompt = `你是一个研究评估专家。你的任务不是"总结论文"，而是帮用户在30秒内做出判断：

【论文信息】
标题：${title}
内容：${content.substring(0, 8000)}

【目标用户的3个问题】

问题1：这篇论文到底在讲什么？
→ 一句话总结（≤50字，直击核心，不要背景铺垫）

问题2：这篇论文值不值得我花时间？
→ 核心发现 + 质量判断（2-3点，每点≤30字）
   重点：研究的可信度、结论的力度、样本是否充足

问题3：这篇论文对我有什么用？
→ 可行动的信息（不是"学术意义"，而是"我能做什么"）

【输出格式】（纯文本，不要markdown）

=== 一句话总结 ===
[直接讲核心结论，不要"本文研究了..."这种开头，≤50字]

=== 核心发现 ===
1. [发现1]（≤30字，强调可信度：样本量、效应量、实验设计）
2. [发现2]（≤30字，强调结论力度：是否显著、是否可推广）
3. [发现3]（≤30字，如果只有2个重要发现就省略）

=== 质量判断 ===
[用一句话说明这项研究的可靠程度，例如："样本量大(>1000)，双盲实验，结论可靠" 或 "小样本探索性研究，结论需谨慎"]

=== 对学生/研究者的价值 ===
[具体可以做什么，例如：
- "写论文时可作为X领域的支持证据"
- "可借鉴其实验设计方法"
- "提供了X问题的系统性回顾"

=== 对职场人/产品经理的价值 ===
[具体可以做什么，例如：
- "支持了Y决策（有数据支撑）"
- "可用于优化Z功能（提升KPI）"
- "提示了X方向的商业机会"

=== 对普通人的价值 ===
[具体可以做什么，例如：
- "每天坚持Y可以改善Z（有实证支持）"
- "避免X误区（研究证明无效）"
- "选择Y时优先考虑Z因素"]

【关键原则】
1. 极简：每句话都有信息量，不废话
2. 可判断：帮助用户决定是否深入阅读
3. 可行动：告诉用户"可以做什么"，不是"学术上有什么意义"

请开始生成：`;

  const result = await aiManager.generateSummary(title, prompt, 'detailed');

  // Parse the response into structured format
  const sections = result.content.split('===').filter(s => s.trim());

  const insights: CoreInsights = {
    oneSentence: '',
    keyFindings: [],
    qualityAssessment: '', // 新增
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
      // Split by numbered list or newlines
      const lines = findingsText.split(/\n|\d+\.\s*/)
        .map(l => l.trim())
        .filter(l => l.length > 0 && l.length < 100) // 过滤过长的行
        .slice(0, 3);
      insights.keyFindings = lines;
    } else if (trimmed.startsWith('质量判断')) {
      insights.qualityAssessment = trimmed.replace('质量判断', '').trim();
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

/**
 * 推荐问题 API - 基于论文内容生成智能推荐问题
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAIManager } from '@/lib/ai';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paperId = parseInt(params.id);
    if (isNaN(paperId)) {
      return NextResponse.json({ error: 'Invalid paper ID' }, { status: 400 });
    }

    // 获取论文数据
    const { db } = await import('@/db');
    const papers = await db.query.uploadedPapers.findMany({
      where: (papers, { eq }) => eq(papers.id, paperId),
      limit: 1,
    });

    const paper = papers[0];
    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 });
    }

    // 检查是否有文本内容
    if (!paper.extractedText || paper.extractedText.length < 100) {
      return NextResponse.json(
        {
          error: '论文内容不足，无法生成推荐问题',
          questions: getDefaultQuestions(),
          isDefault: true,
        },
        { status: 200 }
      );
    }

    // 生成推荐问题
    const aiManager = getAIManager();
    const prompt = generateQuestionsPrompt(paper.title, paper.extractedText);

    try {
      const result = await aiManager.generateSummary(
        paper.title,
        paper.extractedText.substring(0, 3000), // 限制长度避免token超限
        'short'
      );

      // 解析生成的问题
      const questions = parseQuestionsFromResponse(result.content);

      return NextResponse.json({
        questions: questions.length >= 3 ? questions.slice(0, 5) : getDefaultQuestions(),
        isDefault: questions.length < 3,
        cached: false,
      });
    } catch (aiError) {
      console.error('[Recommended Questions] AI error:', aiError);
      // AI失败时返回默认问题
      return NextResponse.json({
        questions: getDefaultQuestions(),
        isDefault: true,
        error: 'AI生成失败，使用默认问题',
      });
    }
  } catch (error) {
    console.error('[Recommended Questions] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '生成推荐问题失败',
        questions: getDefaultQuestions(),
        isDefault: true,
      },
      { status: 500 }
    );
  }
}

/**
 * 生成推荐问题的prompt
 */
function generateQuestionsPrompt(title: string, content: string): string {
  return `基于以下学术论文，生成 3-5 个最有价值的提问。

论文标题：${title}

论文内容：
${content.substring(0, 2000)}

要求：
1. 问题应该是有深度、有价值的，不是简单的事实查询
2. 优先考虑关于研究方法、发现的意义、局限性、应用场景的问题
3. 问题应该用中文表达，自然口语化
4. 只输出问题列表，每行一个问题，编号格式：1. 问题内容

示例格式：
1. 这项研究的样本是否足够代表性？
2. 研究结果在实际场景中如何应用？
3. 这项研究有哪些局限性需要注意？

请生成 3-5 个推荐问题：`;
}

/**
 * 解析AI返回的问题列表
 */
function parseQuestionsFromResponse(response: string): string[] {
  const questions: string[] = [];

  // 尝试多种解析方式
  const lines = response.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // 匹配编号格式：1. 问题 或 1、问题
    const numberedMatch = trimmed.match(/^(\d+)[.、]\s*(.+)$/);
    if (numberedMatch) {
      questions.push(numberedMatch[2]);
      continue;
    }

    // 匹配无编号但以问号结尾的问题
    if (trimmed.endsWith('?') && trimmed.length > 5) {
      questions.push(trimmed);
    }
  }

  return questions;
}

/**
 * 默认推荐问题（AI失败时的fallback）
 */
function getDefaultQuestions(): string[] {
  return [
    '这篇论文主要研究什么问题？',
    '研究方法有哪些创新之处？',
    '主要结论是什么？',
    '这项研究有哪些局限性？',
    '研究结果如何应用到实践中？',
  ];
}

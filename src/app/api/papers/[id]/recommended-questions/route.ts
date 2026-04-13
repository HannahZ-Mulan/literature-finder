/**
 * 推荐问题 API - 基于论文内容生成智能推荐问题
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbPapers } from '@/db/index-papers';
import { papers } from '@/db/index-papers';
import { eq } from 'drizzle-orm';
import { getDeepSeekClient } from '@/lib/ai/deepseek';

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
    const paperList = await dbPapers
      .select()
      .from(papers)
      .where(eq(papers.id, paperId))
      .limit(1);

    const paper = paperList[0];
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

    // 智能提取：开头+结尾
    const getSmartContent = (fullText: string, maxLength: number = 8000) => {
      if (fullText.length <= maxLength) {
        return fullText;
      }

      const beginning = fullText.substring(0, Math.floor(maxLength * 0.6));
      const ending = fullText.substring(fullText.length - Math.floor(maxLength * 0.4));

      return beginning + '\n\n...[中间部分省略]...\n\n' + ending;
    };

    const content = getSmartContent(paper.extractedText);

    // 生成推荐问题
    const prompt = `你是一个学术研究助手。基于以下论文，生成 3-5 个最有价值的提问。

论文标题：${paper.title}

论文内容：
${content}

要求：
1. 问题应该是有深度、有价值的，关注研究本质而非表面事实
2. 优先考虑：研究方法的选择理由、发现的深层含义、局限性的影响、实际应用的可行性
3. 问题应该用中文表达，自然口语化
4. 只输出问题列表，每行一个问题，编号格式：1. 问题内容

示例格式：
1. 为什么选择这种研究方法而不是其他方法？
2. 这项研究发现在实际场景中如何应用？
3. 样本的局限性会影响结论的普适性吗？

请生成 3-5 个推荐问题：`;

    try {
      const deepSeekClient = getDeepSeekClient();
      const result = await deepSeekClient.generateSummary(
        paper.title,
        prompt,
        'short'
      );

      // 解析生成的问题
      const questions = parseQuestionsFromResponse(result.content || '');

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

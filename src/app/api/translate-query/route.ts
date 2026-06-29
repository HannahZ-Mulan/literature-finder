import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAIManager } from '@/lib/ai';

const querySchema = z.object({
  query: z.string().min(1).max(200, '查询词过长（上限 200 字符）'),
});

/**
 * POST /api/translate-query
 * 将中文搜索查询翻译为英文术语，用于跨英文学术数据库（OpenAlex/arXiv 等）检索。
 * 返回逗号分隔的英文术语建议（可能多个）。
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = querySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || 'Invalid request body' },
        { status: 400 }
      );
    }

    const { query } = validation.data;

    // 如果查询里没有中文字符，直接原样返回（无需翻译）
    if (!/[\u4e00-\u9fa5]/.test(query)) {
      return NextResponse.json({ terms: [query.trim()], translated: false });
    }

    try {
      const aiManager = getAIManager();

      const prompt = `将以下中文搜索查询翻译为适合学术数据库检索的英文术语。

中文查询：${query}

要求：
- 返回 1-3 个最相关的英文检索术语，按相关性排序
- 只返回英文术语本身，用英文逗号分隔，不要任何解释、编号或额外文字
- 优先使用学术界通用术语（如"机器学习" → "machine learning"，而非字面直译）
- 保留专有名词原样（如人名、缩写）

示例：
输入："大语言模型微调"
输出：large language model fine-tuning, LLM fine-tuning, instruction tuning`;

      const result = await aiManager.chatWithPaper(
        prompt,
        'Academic Query Translation',
        'You are a precise academic search term translator. Output ONLY the English terms, comma-separated, nothing else.'
      );

      const content = (result.content || '').trim();

      // 解析逗号分隔的术语，清洗（去编号、去多余空格、去空项）
      const terms = content
        .split(/[,，\n]/)
        .map(t => t.replace(/^\s*\d+[\.\)]\s*/, '').trim()) // 去掉 "1. " 类前缀
        .filter(t => t.length > 0 && t.length <= 100)
        .slice(0, 3);

      if (terms.length === 0) {
        // AI 没返回有效术语，降级提示
        return NextResponse.json({
          terms: [],
          translated: false,
          degraded: true,
          message: '无法翻译该查询，请尝试直接输入英文术语',
        });
      }

      return NextResponse.json({ terms, translated: true });
    } catch (aiError) {
      console.warn('[Translate Query] AI failed:', aiError);
      return NextResponse.json({
        terms: [],
        translated: false,
        degraded: true,
        message: '翻译服务暂时不可用，请稍后重试或直接输入英文术语',
      }, { status: 503 });
    }
  } catch (error) {
    console.error('Translate query error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to translate query' },
      { status: 500 }
    );
  }
}

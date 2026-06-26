import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAIManager } from '@/lib/ai';

const translateSchema = z.object({
  text: z.string().min(1).max(5000, '文本过长，请选择更短的段落（上限 5000 字符）'),
  target_language: z.enum(['zh', 'en']).default('zh'),
});

// POST - Translate text
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = translateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { text } = validation.data;

    // Use AI Manager for translation with fallback support.
    // MVP spec requires BOTH a translation AND a simple explanation of the
    // paragraph, so we ask for a JSON object with both fields.
    try {
      const aiManager = getAIManager();

      const prompt = `请处理以下学术文本，返回中文翻译和简单解释。

原文：
${text}

严格按以下 JSON 格式输出，只返回 JSON 对象，不要任何额外文字或 markdown 代码块：
{
  "translation": "准确的中文翻译，保持学术术语准确性和学术写作风格",
  "explanation": "用通俗易懂的中文对这段内容的简单解释，帮助读者理解其含义，2-4句话"
}

只返回 JSON 对象。`;

      // chatWithPaper(question, title, context) - reuse it as a generic
      // single-turn completion. The "context" here is an instruction.
      const result = await aiManager.chatWithPaper(
        prompt,
        'Academic Translation and Explanation',
        'You are a professional academic translator and explainer for Chinese students.'
      );

      const aiContent = result.content || '';

      // Parse JSON: try ```json block first, then bare {...}
      const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) ||
                        aiContent.match(/\{[\s\S]*\}/);

      let translation = '';
      let explanation = '';

      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          translation = String(parsed.translation || '').trim();
          explanation = String(parsed.explanation || '').trim();
        } catch (parseError) {
          console.error('[Translate] JSON parse failed, falling back to raw content:', parseError);
          // If JSON parse fails, treat the whole AI output as the translation
          translation = aiContent.trim();
        }
      } else {
        // No JSON structure at all - use raw content as translation
        translation = aiContent.trim();
      }

      // Guard against empty results
      if (!translation) {
        translation = '[翻译结果为空，请重试]';
      }
      if (!explanation) {
        explanation = '暂无解释';
      }

      return NextResponse.json({
        translation,
        explanation,
        original_text: text,
        usage: result.usage,
        provider: result.provider,
      });
    } catch (aiError) {
      // AI translation failed. Return a degraded marker so the UI can show
      // an honest "translation unavailable" message instead of passing off
      // the original text as a translation.
      console.warn('[Translate] AI provider failed:', aiError);
      return NextResponse.json({
        translation: '',
        explanation: '',
        original_text: text,
        provider: 'fallback',
        degraded: true,
        message: '翻译服务暂时不可用，请稍后重试。',
        error: 'Translation service unavailable',
      }, { status: 503 });
    }
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Translation failed' },
      { status: 500 }
    );
  }
}

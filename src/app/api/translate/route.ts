import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAIManager } from '@/lib/ai';

const translateSchema = z.object({
  text: z.string().min(1),
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

    const { text, target_language } = validation.data;

    const targetLangName = target_language === 'zh' ? '中文' : 'English';
    const direction = target_language === 'zh' ? '英译中' : '中译英';

    // Use AI Manager for translation with fallback support
    try {
      const aiManager = getAIManager();

      // Build translation prompt
      const systemMessage = `You are a professional academic translator. Your task is to translate ${direction} while preserving the technical accuracy and academic tone.

Guidelines:
- Maintain technical terminology accuracy
- Preserve the academic writing style
- Keep citations and references unchanged
- Ensure natural and readable translation`;

      const userMessage = `Please translate the following text to ${targetLangName}:

${text}

Provide only the translation, no explanations.`;

      // Use chatWithPaper for translation (it supports multiple providers)
      const result = await aiManager.chatWithPaper(
        userMessage,
        'Translation Task',
        systemMessage
      );

      return NextResponse.json({
        translation: result.content,
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

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { literature } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAIManager } from '@/lib/ai';
import { z } from 'zod';

// Validation schema
const chatSchema = z.object({
  question: z.string().min(1),
  chat_history: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string(),
  })).optional(),
});

// POST - Chat with paper
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const literatureId = parseInt(params.id);
    if (isNaN(literatureId)) {
      return NextResponse.json(
        { error: 'Invalid literature ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = chatSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { question, chat_history } = validation.data;

    // Get literature details
    const litList = await db
      .select()
      .from(literature)
      .where(eq(literature.id, literatureId));

    if (litList.length === 0) {
      return NextResponse.json(
        { error: 'Literature not found' },
        { status: 404 }
      );
    }

    const lit = litList[0];

    if (!lit.abstract) {
      return NextResponse.json(
        { error: 'Cannot chat: literature has no abstract' },
        { status: 400 }
      );
    }

    // Chat with paper using AI manager (supports OpenAI and DeepSeek with fallback)
    const aiManager = getAIManager();
    const result = await aiManager.chatWithPaper(
      question,
      lit.title,
      lit.abstract,
      chat_history
    );

    return NextResponse.json({
      answer: result.content,
      usage: result.usage,
      provider: result.provider,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to chat' },
      { status: 500 }
    );
  }
}

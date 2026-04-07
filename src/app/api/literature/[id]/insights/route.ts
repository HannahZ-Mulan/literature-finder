import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { literature } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAIManager } from '@/lib/ai';

// GET - Extract insights from paper
export async function GET(
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
        { error: 'Cannot extract insights: literature has no abstract' },
        { status: 400 }
      );
    }

    // Extract insights using AI manager (supports OpenAI and DeepSeek with fallback)
    const aiManager = getAIManager();
    const result = await aiManager.extractInsights(lit.title, lit.abstract);

    return NextResponse.json({
      insights: result.insights,
      usage: result.usage,
      provider: result.provider,
    });
  } catch (error) {
    console.error('Extract insights error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to extract insights' },
      { status: 500 }
    );
  }
}

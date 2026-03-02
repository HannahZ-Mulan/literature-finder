import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { literature, summaries } from '@/db/schema';
import { verifyAuth } from '@/middleware';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { getAIManager } from '@/lib/ai';

// Validation schema
const generateSummarySchema = z.object({
  length_level: z.enum(['short', 'medium', 'detailed']).default('medium'),
});

// GET - Retrieve existing summary
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 测试模式：跳过认证检查

    const literatureId = parseInt(params.id);
    if (isNaN(literatureId)) {
      return NextResponse.json(
        { error: 'Invalid literature ID' },
        { status: 400 }
      );
    }

    // Get length_level from query params
    const { searchParams } = new URL(request.url);
    const lengthLevel = searchParams.get('length_level') || 'medium';

    // Look for existing summary
    const existingSummaries = await db
      .select()
      .from(summaries)
      .where(
        and(
          eq(summaries.literature_id, literatureId),
          eq(summaries.length_level, lengthLevel)
        )
      )
      .orderBy(desc(summaries.created_at))
      .limit(1);

    if (existingSummaries.length > 0) {
      return NextResponse.json({
        summary: existingSummaries[0].content,
        length_level: existingSummaries[0].length_level,
        created_at: existingSummaries[0].created_at,
        cached: true,
      });
    }

    return NextResponse.json(
      {
        error: 'No summary found. Please generate a new summary.',
      },
      { status: 404 }
    );
  } catch (error) {
    console.error('Get summary error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Generate new summary
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 测试模式：跳过认证检查

    const literatureId = parseInt(params.id);
    if (isNaN(literatureId)) {
      return NextResponse.json(
        { error: 'Invalid literature ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = generateSummarySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { length_level } = validation.data;

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
        { error: 'Cannot generate summary: literature has no abstract' },
        { status: 400 }
      );
    }

    // Check for existing summary with same length level
    const existingSummaries = await db
      .select()
      .from(summaries)
      .where(
        and(
          eq(summaries.literature_id, literatureId),
          eq(summaries.length_level, length_level)
        )
      )
      .orderBy(desc(summaries.created_at))
      .limit(1);

    if (existingSummaries.length > 0) {
      return NextResponse.json({
        summary: existingSummaries[0].content,
        length_level: existingSummaries[0].length_level,
        created_at: existingSummaries[0].created_at,
        cached: true,
      });
    }

    // Generate new summary using AI manager
    const aiManager = getAIManager();
    const response = await aiManager.generateSummary(
      lit.title,
      lit.abstract,
      length_level
    );

    // Save summary to database
    const newSummary = await db
      .insert(summaries)
      .values({
        literature_id: literatureId,
        length_level,
        content: response.content,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    return NextResponse.json(
      {
        message: 'Summary generated',
        summary: newSummary[0].content,
        length_level: newSummary[0].length_level,
        created_at: newSummary[0].created_at,
        cached: false,
        usage: response.usage,
        provider: response.provider,
        estimatedCost: response.estimatedCost,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Generate summary error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

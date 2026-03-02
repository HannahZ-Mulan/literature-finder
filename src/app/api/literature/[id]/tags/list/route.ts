import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { literature, literatureTags, tags } from '@/db/schema';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';

// GET - Retrieve literature tags
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = 1; // 测试用户ID
    const literatureId = parseInt(params.id);

    if (isNaN(literatureId)) {
      return NextResponse.json(
        { error: 'Invalid literature ID' },
        { status: 400 }
      );
    }

    // Verify literature exists
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

    // Get literature tags
    const litTags = await db
      .select({
        id: tags.id,
        name: tags.name,
        color: tags.color,
      })
      .from(literatureTags)
      .innerJoin(tags, eq(literatureTags.tag_id, tags.id))
      .where(eq(literatureTags.literature_id, literatureId));

    return NextResponse.json({
      tags: litTags,
    });
  } catch (error) {
    console.error('Get literature tags error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

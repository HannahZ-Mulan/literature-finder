import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { literature, literatureTags, tags } from '@/db/schema';
import { verifyAuth } from '@/middleware';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';

// Validation schema
const addTagSchema = z.object({
  tag_id: z.number().int().positive('Tag ID is required'),
});

// POST - Add tag to literature
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 测试模式：使用固定用户ID
    const userId = 1; // 测试用户ID

    const literatureId = parseInt(params.id);
    if (isNaN(literatureId)) {
      return NextResponse.json(
        { error: 'Invalid literature ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = addTagSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { tag_id } = validation.data;

    // Verify tag belongs to user
    const tagList = await db
      .select()
      .from(tags)
      .where(and(eq(tags.id, tag_id), eq(tags.user_id, userId)));

    if (tagList.length === 0) {
      return NextResponse.json(
        { error: 'Tag not found or access denied' },
        { status: 404 }
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

    // Check if already tagged
    const existing = await db
      .select()
      .from(literatureTags)
      .where(
        and(
          eq(literatureTags.literature_id, literatureId),
          eq(literatureTags.tag_id, tag_id)
        )
      );

    if (existing.length > 0) {
      return NextResponse.json({
        message: 'Literature already has this tag',
      });
    }

    // Add tag
    await db.insert(literatureTags).values({
      literature_id: literatureId,
      tag_id,
      created_at: new Date(),
    });

    return NextResponse.json({
      message: 'Tag added to literature',
    });
  } catch (error) {
    console.error('Add tag to literature error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove tag from literature
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 测试模式：使用固定用户ID
    const userId = 1; // 测试用户ID

    const literatureId = parseInt(params.id);
    if (isNaN(literatureId)) {
      return NextResponse.json(
        { error: 'Invalid literature ID' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get('tag_id');

    if (!tagId) {
      return NextResponse.json(
        { error: 'tag_id query parameter is required' },
        { status: 400 }
      );
    }

    const tagIdNum = parseInt(tagId);
    if (isNaN(tagIdNum)) {
      return NextResponse.json(
        { error: 'Invalid tag ID' },
        { status: 400 }
      );
    }

    // Verify tag belongs to user
    const tagList = await db
      .select()
      .from(tags)
      .where(and(eq(tags.id, tagIdNum), eq(tags.user_id, userId)));

    if (tagList.length === 0) {
      return NextResponse.json(
        { error: 'Tag not found or access denied' },
        { status: 404 }
      );
    }

    // Remove tag
    await db
      .delete(literatureTags)
      .where(
        and(
          eq(literatureTags.literature_id, literatureId),
          eq(literatureTags.tag_id, tagIdNum)
        )
      );

    return NextResponse.json({
      message: 'Tag removed from literature',
    });
  } catch (error) {
    console.error('Remove tag from literature error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

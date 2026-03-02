import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tags, literatureTags } from '@/db/schema';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';

// Validation schema
const updateTagSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long').optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
});

// GET - Retrieve single tag
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = 1; // 测试用户ID
    const tagId = parseInt(params.id);

    if (isNaN(tagId)) {
      return NextResponse.json(
        { error: 'Invalid tag ID' },
        { status: 400 }
      );
    }

    const tagList = await db
      .select()
      .from(tags)
      .where(and(eq(tags.id, tagId), eq(tags.user_id, userId)));

    if (tagList.length === 0) {
      return NextResponse.json(
        { error: 'Tag not found' },
        { status: 404 }
      );
    }

    // Get tag usage count
    const usageCount = await db
      .select()
      .from(literatureTags)
      .where(eq(literatureTags.tag_id, tagId));

    return NextResponse.json({
      tag: {
        ...tagList[0],
        usage_count: usageCount.length,
      },
    });
  } catch (error) {
    console.error('Get tag error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update tag
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = 1; // 测试用户ID
    const tagId = parseInt(params.id);

    if (isNaN(tagId)) {
      return NextResponse.json(
        { error: 'Invalid tag ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = updateTagSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    // Verify tag belongs to user
    const tagList = await db
      .select()
      .from(tags)
      .where(and(eq(tags.id, tagId), eq(tags.user_id, userId)));

    if (tagList.length === 0) {
      return NextResponse.json(
        { error: 'Tag not found or access denied' },
        { status: 404 }
      );
    }

    // Update tag
    const updated = await db
      .update(tags)
      .set({
        ...validation.data,
        updated_at: new Date(),
      })
      .where(eq(tags.id, tagId))
      .returning();

    return NextResponse.json({
      message: 'Tag updated',
      tag: updated[0],
    });
  } catch (error) {
    console.error('Update tag error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete tag
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = 1; // 测试用户ID
    const tagId = parseInt(params.id);

    if (isNaN(tagId)) {
      return NextResponse.json(
        { error: 'Invalid tag ID' },
        { status: 400 }
      );
    }

    // Verify tag belongs to user
    const tagList = await db
      .select()
      .from(tags)
      .where(and(eq(tags.id, tagId), eq(tags.user_id, userId)));

    if (tagList.length === 0) {
      return NextResponse.json(
        { error: 'Tag not found or access denied' },
        { status: 404 }
      );
    }

    // Delete tag associations first
    await db
      .delete(literatureTags)
      .where(eq(literatureTags.tag_id, tagId));

    // Delete tag
    await db.delete(tags).where(eq(tags.id, tagId));

    return NextResponse.json({
      message: 'Tag deleted',
    });
  } catch (error) {
    console.error('Delete tag error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

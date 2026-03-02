import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tags } from '@/db/schema';
import { verifyAuth } from '@/middleware';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

// Validation schema
const createTagSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
});

// GET - Retrieve user tags
export async function GET(request: NextRequest) {
  try {
    // 测试模式：使用固定用户ID
    const userId = 1; // 测试用户ID

    // Get user's tags
    const userTags = await db
      .select()
      .from(tags)
      .where(eq(tags.user_id, userId))
      .orderBy(tags.id);

    return NextResponse.json({
      tags: userTags,
    });
  } catch (error) {
    console.error('Get tags error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create tag
export async function POST(request: NextRequest) {
  try {
    // 测试模式：使用固定用户ID
    const userId = 1; // 测试用户ID

    const body = await request.json();

    // Validate request body
    const validation = createTagSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { name, color = '#3B82F6' } = validation.data;

    // Create tag
    const newTag = await db
      .insert(tags)
      .values({
        user_id: userId,
        name,
        color,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    return NextResponse.json(
      {
        message: 'Tag created',
        tag: newTag[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create tag error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

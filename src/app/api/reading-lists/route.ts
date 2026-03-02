import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { readingLists } from '@/db/schema';
import { verifyAuth } from '@/middleware';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

// Validation schema
const createReadingListSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  description: z.string().optional(),
});

// GET - Retrieve user reading lists
export async function GET(request: NextRequest) {
  try {
    // 测试模式：使用固定用户ID
    const userId = 1; // 测试用户ID

    // Get user's reading lists
    const userReadingLists = await db
      .select()
      .from(readingLists)
      .where(eq(readingLists.user_id, userId))
      .orderBy(readingLists.id);

    return NextResponse.json({
      reading_lists: userReadingLists,
    });
  } catch (error) {
    console.error('Get reading lists error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create reading list
export async function POST(request: NextRequest) {
  try {
    // 测试模式：使用固定用户ID
    const userId = 1; // 测试用户ID

    const body = await request.json();

    // Validate request body
    const validation = createReadingListSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { name, description } = validation.data;

    // Create reading list
    const newReadingList = await db
      .insert(readingLists)
      .values({
        user_id: userId,
        name,
        description: description || null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    return NextResponse.json(
      {
        message: 'Reading list created',
        reading_list: newReadingList[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create reading list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

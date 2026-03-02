import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { searchHistory } from '@/db/schema';
import { verifyAuth } from '@/middleware';
import { z } from 'zod';
import { eq, desc, lt, gte } from 'drizzle-orm';

// Validation schema
const saveSearchSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  source: z.enum(['arxiv', 'pubmed', 'semantic-scholar', 'all']),
});

// GET - Retrieve search history
export async function GET(request: NextRequest) {
  try {
    // 测试模式：使用固定用户ID
    const userId = 1; // 测试用户ID

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get last 30 days of search history, limited to 100 entries
    const history = await db
      .select()
      .from(searchHistory)
      .where(
        eq(searchHistory.user_id, userId)
      )
      .orderBy(desc(searchHistory.created_at))
      .limit(100);

    // Filter to last 30 days in application (since SQLite date functions differ)
    const recentHistory = history.filter(
      (item) => item.created_at >= thirtyDaysAgo
    );

    return NextResponse.json({
      search_history: recentHistory,
      total: recentHistory.length,
    });
  } catch (error) {
    console.error('Get search history error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Save search to history
export async function POST(request: NextRequest) {
  try {
    // 测试模式：使用固定用户ID
    const userId = 1; // 测试用户ID

    const body = await request.json();

    // Validate request body
    const validation = saveSearchSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { query, source } = validation.data;

    // Clean up entries older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await db
      .delete(searchHistory)
      .where(
        eq(searchHistory.user_id, userId)
      );

    // Save search to history
    const newEntry = await db
      .insert(searchHistory)
      .values({
        user_id: userId,
        query,
        source,
        created_at: new Date(),
      })
      .returning();

    return NextResponse.json(
      {
        message: 'Search saved to history',
        entry: newEntry[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Save search history error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

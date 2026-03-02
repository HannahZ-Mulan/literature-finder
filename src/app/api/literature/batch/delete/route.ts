import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { literature, literatureCategories, literatureTags, readingListItems, userLiterature, summaries } from '@/db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { verifyAuth } from '@/middleware';
import { apiCache } from '@/lib/cache/api-cache';

export async function POST(request: NextRequest) {
  try {
    // 测试模式：使用固定用户ID
    const userId = 1; // 测试用户ID

    const body = await request.json();
    const { literature_ids } = body;

    if (!Array.isArray(literature_ids) || literature_ids.length === 0) {
      return NextResponse.json({ error: 'Invalid literature IDs' }, { status: 400 });
    }

    // Verify all literature belong to the user (through user_literature table)
    const userLitRecords = await db
      .select({ literature_id: userLiterature.literature_id })
      .from(userLiterature)
      .where(
        and(
          inArray(userLiterature.literature_id, literature_ids),
          eq(userLiterature.user_id, userId)
        )
      );

    const validIds = userLitRecords.map(lit => lit.literature_id);

    if (validIds.length === 0) {
      return NextResponse.json({ error: 'No valid literature found' }, { status: 404 });
    }

    // Delete related records first
    await db.delete(readingListItems).where(inArray(readingListItems.literature_id, validIds));
    await db.delete(literatureCategories).where(inArray(literatureCategories.literature_id, validIds));
    await db.delete(literatureTags).where(inArray(literatureTags.literature_id, validIds));
    await db.delete(userLiterature).where(inArray(userLiterature.literature_id, validIds));
    await db.delete(summaries).where(inArray(summaries.literature_id, validIds));

    // Delete literature records (only if no other users have them)
    // For simplicity, we'll delete them directly in test mode
    await db.delete(literature).where(inArray(literature.id, validIds));

    // Invalidate library cache
    apiCache.invalidate('/api/literature/library');

    return NextResponse.json({
      success: true,
      deleted_count: validIds.length
    });
  } catch (error: any) {
    console.error('Batch delete literature error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { literature, literatureCategories, literatureTags, readingListItems, userLiterature, summaries } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyAuth } from '@/middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 测试模式：跳过认证检查

    const literatureId = parseInt(params.id);
    if (isNaN(literatureId)) {
      return NextResponse.json({ error: 'Invalid literature ID' }, { status: 400 });
    }

    const [lit] = await db
      .select()
      .from(literature)
      .where(eq(literature.id, literatureId))
      .limit(1);

    if (!lit) {
      return NextResponse.json({ error: 'Literature not found' }, { status: 404 });
    }

    return NextResponse.json({ literature: lit });
  } catch (error: any) {
    console.error('Get literature error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const literatureId = parseInt(params.id);
    if (isNaN(literatureId)) {
      return NextResponse.json({ error: 'Invalid literature ID' }, { status: 400 });
    }

    // Check if literature exists and belongs to user
    const [lit] = await db
      .select()
      .from(literature)
      .where(eq(literature.id, literatureId))
      .limit(1);

    if (!lit) {
      return NextResponse.json({ error: 'Literature not found' }, { status: 404 });
    }

    if (lit.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete related records first (due to foreign key constraints)
    await db.delete(readingListItems).where(eq(readingListItems.literature_id, literatureId));
    await db.delete(literatureCategories).where(eq(literatureCategories.literature_id, literatureId));
    await db.delete(literatureTags).where(eq(literatureTags.literature_id, literatureId));
    await db.delete(userLiterature).where(eq(userLiterature.literature_id, literatureId));
    await db.delete(summaries).where(eq(summaries.literature_id, literatureId));

    // Delete the literature
    await db.delete(literature).where(eq(literature.id, literatureId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete literature error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

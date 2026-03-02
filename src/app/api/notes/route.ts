import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userLiterature } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * POST /api/notes - Update note or toggle mark
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, literatureId, note, is_favorite, is_liked, is_to_read, reading_progress } = body;

    if (!userId || !literatureId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user_literature entry exists
    const existing = await db
      .select()
      .from(userLiterature)
      .where(
        and(
          eq(userLiterature.user_id, parseInt(userId)),
          eq(userLiterature.literature_id, parseInt(literatureId))
        )
      )
      .limit(1);

    let result;
    const updateData: any = {
      updated_at: new Date(),
    };

    if (note !== undefined) updateData.notes = note;
    if (is_favorite !== undefined) updateData.is_favorite = is_favorite ? 1 : 0;
    if (is_liked !== undefined) updateData.is_liked = is_liked ? 1 : 0;
    if (is_to_read !== undefined) updateData.is_to_read = is_to_read ? 1 : 0;
    if (reading_progress !== undefined) updateData.reading_progress = reading_progress;

    if (existing.length > 0) {
      // Update existing
      result = await db
        .update(userLiterature)
        .set(updateData)
        .where(eq(userLiterature.id, existing[0].id));
    } else {
      // Create new
      result = await db
        .insert(userLiterature)
        .values({
          user_id: parseInt(userId),
          literature_id: parseInt(literatureId),
          ...updateData,
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving note:', error);
    return NextResponse.json(
      { error: 'Failed to save note', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notes?userId=&literatureId= - Get note for a literature
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || '1';
    const literatureId = searchParams.get('literatureId');

    if (!literatureId) {
      return NextResponse.json(
        { error: 'Missing literatureId' },
        { status: 400 }
      );
    }

    const result = await db
      .select()
      .from(userLiterature)
      .where(
        and(
          eq(userLiterature.user_id, parseInt(userId)),
          eq(userLiterature.literature_id, parseInt(literatureId))
        )
      )
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({
        notes: '',
        is_favorite: false,
        is_liked: false,
        is_to_read: false,
        reading_progress: null,
      });
    }

    const item = result[0];
    return NextResponse.json({
      notes: item.notes || '',
      is_favorite: Boolean(item.is_favorite),
      is_liked: Boolean(item.is_liked),
      is_to_read: Boolean(item.is_to_read),
      reading_progress: item.reading_progress,
    });
  } catch (error) {
    console.error('Error fetching note:', error);
    return NextResponse.json(
      { error: 'Failed to fetch note' },
      { status: 500 }
    );
  }
}

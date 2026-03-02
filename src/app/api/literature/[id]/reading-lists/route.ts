import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { literature, readingListItems, readingLists } from '@/db/schema';
import { verifyAuth } from '@/middleware';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';

// Validation schema
const addToListSchema = z.object({
  reading_list_id: z.number().int().positive('Reading list ID is required'),
});

// POST - Add literature to reading list
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request);
    if (!auth.success || !auth.userId) {
      return NextResponse.json(
        { error: auth.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const literatureId = parseInt(params.id);
    if (isNaN(literatureId)) {
      return NextResponse.json(
        { error: 'Invalid literature ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = addToListSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { reading_list_id } = validation.data;
    const userId = auth.userId;

    // Verify reading list belongs to user
    const readingListList = await db
      .select()
      .from(readingLists)
      .where(and(eq(readingLists.id, reading_list_id), eq(readingLists.user_id, userId)));

    if (readingListList.length === 0) {
      return NextResponse.json(
        { error: 'Reading list not found or access denied' },
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

    // Check if already in reading list
    const existing = await db
      .select()
      .from(readingListItems)
      .where(
        and(
          eq(readingListItems.literature_id, literatureId),
          eq(readingListItems.reading_list_id, reading_list_id)
        )
      );

    if (existing.length > 0) {
      return NextResponse.json({
        message: 'Literature already in this reading list',
      });
    }

    // Add to reading list
    await db.insert(readingListItems).values({
      reading_list_id,
      literature_id: literatureId,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return NextResponse.json({
      message: 'Literature added to reading list',
    });
  } catch (error) {
    console.error('Add literature to reading list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove literature from reading list
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request);
    if (!auth.success || !auth.userId) {
      return NextResponse.json(
        { error: auth.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const literatureId = parseInt(params.id);
    if (isNaN(literatureId)) {
      return NextResponse.json(
        { error: 'Invalid literature ID' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const readingListId = searchParams.get('reading_list_id');

    if (!readingListId) {
      return NextResponse.json(
        { error: 'reading_list_id query parameter is required' },
        { status: 400 }
      );
    }

    const readingListIdNum = parseInt(readingListId);
    if (isNaN(readingListIdNum)) {
      return NextResponse.json(
        { error: 'Invalid reading list ID' },
        { status: 400 }
      );
    }

    // Verify reading list belongs to user
    const readingListList = await db
      .select()
      .from(readingLists)
      .where(and(eq(readingLists.id, readingListIdNum), eq(readingLists.user_id, auth.userId)));

    if (readingListList.length === 0) {
      return NextResponse.json(
        { error: 'Reading list not found or access denied' },
        { status: 404 }
      );
    }

    // Remove from reading list
    await db
      .delete(readingListItems)
      .where(
        and(
          eq(readingListItems.literature_id, literatureId),
          eq(readingListItems.reading_list_id, readingListIdNum)
        )
      );

    return NextResponse.json({
      message: 'Literature removed from reading list',
    });
  } catch (error) {
    console.error('Remove literature from reading list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

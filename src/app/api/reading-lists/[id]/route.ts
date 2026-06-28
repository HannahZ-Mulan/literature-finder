import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { readingLists, readingListItems, literature } from '@/db/schema';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';

const updateReadingListSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long').optional(),
  description: z.string().optional(),
});

// GET - Retrieve single reading list with items
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = 1; // 测试用户ID
    const listId = parseInt(params.id);

    if (isNaN(listId)) {
      return NextResponse.json(
        { error: 'Invalid reading list ID' },
        { status: 400 }
      );
    }

    // Get reading list
    const lists = await db
      .select()
      .from(readingLists)
      .where(and(eq(readingLists.id, listId), eq(readingLists.user_id, userId)));

    if (lists.length === 0) {
      return NextResponse.json(
        { error: 'Reading list not found' },
        { status: 404 }
      );
    }

    // Get items with joined literature details (title/abstract) so the
    // frontend can render list contents without a second round-trip.
    // Items are returned alongside item_count.
    const items = await db
      .select({
        id: readingListItems.id,
        literature_id: readingListItems.literature_id,
        sort_order: readingListItems.sort_order,
        reading_status: readingListItems.reading_status,
        due_date: readingListItems.due_date,
        priority: readingListItems.priority,
        estimated_reading_time: readingListItems.estimated_reading_time,
        actual_reading_time: readingListItems.actual_reading_time,
        created_at: readingListItems.created_at,
        updated_at: readingListItems.updated_at,
        // Joined fields from literature (works for both uploaded papers and
        // online literature — unified by SPEC-003).
        literature_title: literature.title,
        literature_source: literature.source,
        literature_abstract: literature.abstract,
        literature_pdf_url: literature.pdf_url,
      })
      .from(readingListItems)
      .leftJoin(literature, eq(literature.id, readingListItems.literature_id))
      .where(eq(readingListItems.reading_list_id, listId));

    return NextResponse.json({
      reading_list: {
        ...lists[0],
        item_count: items.length,
      },
      items,
    });
  } catch (error) {
    console.error('Get reading list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update reading list
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = 1; // 测试用户ID
    const listId = parseInt(params.id);

    if (isNaN(listId)) {
      return NextResponse.json(
        { error: 'Invalid reading list ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const validation = updateReadingListSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    // Verify ownership
    const lists = await db
      .select()
      .from(readingLists)
      .where(and(eq(readingLists.id, listId), eq(readingLists.user_id, userId)));

    if (lists.length === 0) {
      return NextResponse.json(
        { error: 'Reading list not found or access denied' },
        { status: 404 }
      );
    }

    // Update
    const updated = await db
      .update(readingLists)
      .set({
        ...validation.data,
        updated_at: new Date(),
      })
      .where(eq(readingLists.id, listId))
      .returning();

    return NextResponse.json({
      message: 'Reading list updated',
      reading_list: updated[0],
    });
  } catch (error) {
    console.error('Update reading list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete reading list
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = 1; // 测试用户ID
    const listId = parseInt(params.id);

    if (isNaN(listId)) {
      return NextResponse.json(
        { error: 'Invalid reading list ID' },
        { status: 400 }
      );
    }

    // Verify ownership
    const lists = await db
      .select()
      .from(readingLists)
      .where(and(eq(readingLists.id, listId), eq(readingLists.user_id, userId)));

    if (lists.length === 0) {
      return NextResponse.json(
        { error: 'Reading list not found or access denied' },
        { status: 404 }
      );
    }

    // Delete items first
    await db
      .delete(readingListItems)
      .where(eq(readingListItems.reading_list_id, listId));

    // Delete list
    await db.delete(readingLists).where(eq(readingLists.id, listId));

    return NextResponse.json({
      message: 'Reading list deleted',
    });
  } catch (error) {
    console.error('Delete reading list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

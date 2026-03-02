import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { readingListItems, readingLists } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for updating item
const updateItemSchema = z.object({
  reading_status: z.enum(['unread', 'reading', 'read']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  due_date: z.string().nullable().optional(),
  estimated_reading_time: z.number().int().positive().optional(),
  actual_reading_time: z.number().int().positive().optional(),
  sort_order: z.number().int().optional(),
});

// PATCH - Update reading list item
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const userId = 1; // 测试用户ID
    const listId = parseInt(params.id);
    const itemId = parseInt(params.itemId);

    if (isNaN(listId) || isNaN(itemId)) {
      return NextResponse.json(
        { error: 'Invalid ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = updateItemSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    // Verify reading list belongs to user
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

    // Prepare update data
    const updateData: any = {
      ...validation.data,
      updated_at: new Date(),
    };

    // Handle due_date specially (can be set to null)
    if (body.due_date === null || body.due_date === undefined) {
      updateData.due_date = null;
    } else if (validation.data.due_date) {
      updateData.due_date = new Date(validation.data.due_date);
    }

    // Update item
    const updated = await db
      .update(readingListItems)
      .set(updateData)
      .where(
        and(
          eq(readingListItems.id, itemId),
          eq(readingListItems.reading_list_id, listId)
        )
      )
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Item updated',
      item: updated[0],
    });
  } catch (error) {
    console.error('Update reading list item error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove item from reading list
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const userId = 1; // 测试用户ID
    const listId = parseInt(params.id);
    const itemId = parseInt(params.itemId);

    if (isNaN(listId) || isNaN(itemId)) {
      return NextResponse.json(
        { error: 'Invalid ID' },
        { status: 400 }
      );
    }

    // Verify reading list belongs to user
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

    // Delete item
    await db
      .delete(readingListItems)
      .where(
        and(
          eq(readingListItems.id, itemId),
          eq(readingListItems.reading_list_id, listId)
        )
      );

    return NextResponse.json({
      message: 'Item removed from reading list',
    });
  } catch (error) {
    console.error('Delete reading list item error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

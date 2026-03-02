import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { literature, readingListItems, readingLists } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for adding item to reading list
const addItemSchema = z.object({
  literature_id: z.number().int().positive(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  due_date: z.string().optional(), // ISO date string
  estimated_reading_time: z.number().int().positive().optional(), // minutes
});

// GET - Retrieve all items in a reading list
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = 1; // 测试用户ID
    const listId = parseInt(params.id);
    const searchParams = request.nextUrl.searchParams;
    const sortBy = searchParams.get('sort') || 'due_date'; // due_date, priority, created, title
    const sortOrder = searchParams.get('order') || 'asc'; // asc, desc

    if (isNaN(listId)) {
      return NextResponse.json(
        { error: 'Invalid reading list ID' },
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

    // Get all items in the reading list with literature details (without ordering)
    let items = await db
      .select({
        item_id: readingListItems.id,
        id: literature.id,
        title: literature.title,
        authors: literature.authors,
        abstract: literature.abstract,
        doi: literature.doi,
        publication_date: literature.publication_date,
        journal: literature.journal,
        citation_count: literature.citation_count,
        source: literature.source,
        keywords: literature.keywords,
        pdf_url: literature.pdf_url,
        reading_status: readingListItems.reading_status,
        priority: readingListItems.priority,
        due_date: readingListItems.due_date,
        estimated_reading_time: readingListItems.estimated_reading_time,
        actual_reading_time: readingListItems.actual_reading_time,
        sort_order: readingListItems.sort_order,
        added_at: readingListItems.created_at,
      })
      .from(readingListItems)
      .innerJoin(literature, eq(readingListItems.literature_id, literature.id))
      .where(eq(readingListItems.reading_list_id, listId));

    // Sort in JavaScript (more flexible for complex sorting logic)
    items.sort((a, b) => {
      let compareResult = 0;

      switch (sortBy) {
        case 'priority':
          // Priority order: urgent > high > medium > low
          const priorityOrder = { urgent: 1, high: 2, medium: 3, low: 4 };
          const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 5;
          const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 5;
          compareResult = aPriority - bPriority;
          break;
        case 'created':
          const aTime = new Date(a.added_at as any).getTime();
          const bTime = new Date(b.added_at as any).getTime();
          compareResult = aTime - bTime;
          break;
        case 'title':
          compareResult = (a.title || '').localeCompare(b.title || '');
          break;
        case 'due_date':
        default:
          // Items with due_date first, then by date
          const aDue = a.due_date ? new Date(a.due_date as any).getTime() : (sortOrder === 'asc' ? 9999999999999 : 0);
          const bDue = b.due_date ? new Date(b.due_date as any).getTime() : (sortOrder === 'asc' ? 9999999999999 : 0);
          compareResult = aDue - bDue;
          break;
      }

      return sortOrder === 'desc' ? -compareResult : compareResult;
    });

    // Parse JSON fields and check overdue status
    const now = Math.floor(Date.now() / 1000);
    const parsedItems = items.map((item) => {
      const dueDate = item.due_date ? new Date(item.due_date as any).getTime() / 1000 : null;
      return {
        ...item,
        authors: JSON.parse(item.authors as string),
        keywords: item.keywords ? JSON.parse(item.keywords as string) : null,
        is_overdue: dueDate && dueDate < now && item.reading_status !== 'read',
      };
    });

    return NextResponse.json({
      reading_list: lists[0],
      items: parsedItems,
    });
  } catch (error) {
    console.error('Get reading list items error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Add item to reading list
export async function POST(
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

    // Validate request body
    const validation = addItemSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { literature_id, priority, due_date, estimated_reading_time } = validation.data;

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

    // Check if item already exists in list
    const existing = await db
      .select()
      .from(readingListItems)
      .where(
        and(
          eq(readingListItems.reading_list_id, listId),
          eq(readingListItems.literature_id, literature_id)
        )
      );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Item already exists in reading list' },
        { status: 409 }
      );
    }

    // Get current max sort_order
    const maxOrder = await db
      .select({ sort_order: readingListItems.sort_order })
      .from(readingListItems)
      .where(eq(readingListItems.reading_list_id, listId))
      .orderBy(desc(readingListItems.sort_order))
      .limit(1);

    const nextSortOrder = (maxOrder[0]?.sort_order ?? -1) + 1;

    // Add item to reading list
    const newItem = await db
      .insert(readingListItems)
      .values({
        reading_list_id: listId,
        literature_id,
        reading_status: 'unread',
        priority,
        due_date: due_date ? new Date(due_date) : null,
        estimated_reading_time,
        sort_order: nextSortOrder,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    return NextResponse.json(
      {
        message: 'Item added to reading list',
        item: newItem[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Add reading list item error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

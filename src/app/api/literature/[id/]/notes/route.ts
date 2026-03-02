import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { literatureNotes } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { verifyAuth } from '@/lib/auth';

/**
 * GET /api/literature/[id]/notes - Get all notes for a literature
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notes = await db
      .select()
      .from(literatureNotes)
      .where(eq(literatureNotes.literature_id, parseInt(params.id)))
      .orderBy(desc(literatureNotes.created_at));

    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/literature/[id]/notes - Create a new note
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content, quote, page_number } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Note content is required' },
        { status: 400 }
      );
    }

    const result = await db
      .insert(literatureNotes)
      .values({
        user_id: user.id,
        literature_id: parseInt(params.id),
        content,
        quote: quote || null,
        page_number: page_number || null,
      })
      .returning();

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    );
  }
}

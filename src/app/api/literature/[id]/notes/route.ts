import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { literatureNotes } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { verifyAuth } from '@/middleware';

// Schema for creating note
const CreateNoteSchema = z.object({
  content: z.string().min(1),
  quote: z.string().nullable().optional(),
  page_number: z.number().int().min(1).nullable().optional(),
});

// Schema for updating note
const UpdateNoteSchema = z.object({
  content: z.string().min(1),
});

// GET - Fetch all notes for a literature
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.success || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const literatureId = parseInt(params.id);
    if (isNaN(literatureId)) {
      return NextResponse.json({ error: 'Invalid literature ID' }, { status: 400 });
    }

    const notes = await db
      .select()
      .from(literatureNotes)
      .where(
        and(
          eq(literatureNotes.literature_id, literatureId),
          eq(literatureNotes.user_id, auth.userId)
        )
      )
      .orderBy(desc(literatureNotes.created_at));

    return NextResponse.json({ notes });
  } catch (error: any) {
    console.error('Fetch notes error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new note
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.success || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const literatureId = parseInt(params.id);
    if (isNaN(literatureId)) {
      return NextResponse.json({ error: 'Invalid literature ID' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = CreateNoteSchema.parse(body);

    const note = await db
      .insert(literatureNotes)
      .values({
        user_id: auth.userId,
        literature_id: literatureId,
        content: validatedData.content,
        quote: validatedData.quote || null,
        page_number: validatedData.page_number || null,
      })
      .returning();

    return NextResponse.json({ note: note[0] }, { status: 201 });
  } catch (error: any) {
    // Safe error logging
    const errorMsg = error?.message || String(error);
    console.error('Create note error:', errorMsg);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}

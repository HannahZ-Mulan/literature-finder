import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { literatureNotes } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { verifyAuth } from '@/middleware';

// Schema for updating note
const UpdateNoteSchema = z.object({
  content: z.string().min(1),
});

/**
 * PATCH /api/literature/[id]/notes/[noteId] - Update a note
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; noteId: string } }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.success || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const noteId = parseInt(params.noteId);
    if (isNaN(noteId)) {
      return NextResponse.json({ error: 'Invalid note ID' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = UpdateNoteSchema.parse(body);

    // First check if note belongs to user
    const existingNotes = await db
      .select()
      .from(literatureNotes)
      .where(
        and(
          eq(literatureNotes.id, noteId),
          eq(literatureNotes.user_id, auth.userId)
        )
      )
      .limit(1);

    if (existingNotes.length === 0) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Update the note
    const updated = await db
      .update(literatureNotes)
      .set({
        content: validatedData.content,
        updated_at: new Date(),
      })
      .where(eq(literatureNotes.id, noteId))
      .returning();

    return NextResponse.json({ note: updated[0] });
  } catch (error: any) {
    console.error('Update note error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/literature/[id]/notes/[noteId] - Delete a note
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; noteId: string } }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.success || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const noteId = parseInt(params.noteId);
    if (isNaN(noteId)) {
      return NextResponse.json({ error: 'Invalid note ID' }, { status: 400 });
    }

    // First check if note belongs to user
    const existingNotes = await db
      .select()
      .from(literatureNotes)
      .where(
        and(
          eq(literatureNotes.id, noteId),
          eq(literatureNotes.user_id, auth.userId)
        )
      )
      .limit(1);

    if (existingNotes.length === 0) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Delete the note
    await db.delete(literatureNotes).where(eq(literatureNotes.id, noteId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete note error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

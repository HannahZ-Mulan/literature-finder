import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pdfAnnotations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { verifyAuth } from '@/middleware';

// Schema for updating annotation
const UpdateAnnotationSchema = z.object({
  content: z.string().min(1).optional(),
  note: z.string().optional(),
  color: z.string().optional(),
});

// PUT - Update an annotation
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; annotationId: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const annotationId = parseInt(params.annotationId);
    if (isNaN(annotationId)) {
      return NextResponse.json({ error: 'Invalid annotation ID' }, { status: 400 });
    }

    // Check if annotation belongs to user
    const existing = await db
      .select()
      .from(pdfAnnotations)
      .where(
        and(
          eq(pdfAnnotations.id, annotationId),
          eq(pdfAnnotations.user_id, user.id)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = UpdateAnnotationSchema.parse(body);

    const updated = await db
      .update(pdfAnnotations)
      .set({
        ...(validatedData.content !== undefined && { content: validatedData.content }),
        ...(validatedData.note !== undefined && { note: validatedData.note }),
        ...(validatedData.color !== undefined && { color: validatedData.color }),
        updated_at: new Date(),
      })
      .where(eq(pdfAnnotations.id, annotationId))
      .returning();

    return NextResponse.json({ annotation: updated[0] });
  } catch (error: any) {
    console.error('Update annotation error:', error);
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

// DELETE - Delete an annotation
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; annotationId: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const annotationId = parseInt(params.annotationId);
    if (isNaN(annotationId)) {
      return NextResponse.json({ error: 'Invalid annotation ID' }, { status: 400 });
    }

    // Check if annotation belongs to user
    const existing = await db
      .select()
      .from(pdfAnnotations)
      .where(
        and(
          eq(pdfAnnotations.id, annotationId),
          eq(pdfAnnotations.user_id, user.id)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 });
    }

    await db.delete(pdfAnnotations).where(eq(pdfAnnotations.id, annotationId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete annotation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

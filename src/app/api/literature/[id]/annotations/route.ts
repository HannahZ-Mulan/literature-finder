import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pdfAnnotations, readingActivity } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { verifyAuth } from '@/middleware';

// Schema for creating annotation
const CreateAnnotationSchema = z.object({
  page_number: z.number().int().min(1),
  annotation_type: z.enum(['highlight', 'note', 'underline']),
  content: z.string().min(1),
  note: z.string().optional(),
  position: z.string().optional(), // JSON string
  color: z.string().default('#ffff00'),
});

// GET - Fetch all annotations for a literature
export async function GET(
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

    const annotations = await db
      .select()
      .from(pdfAnnotations)
      .where(
        and(
          eq(pdfAnnotations.literature_id, literatureId),
          eq(pdfAnnotations.user_id, user.id)
        )
      )
      .orderBy(pdfAnnotations.page_number, pdfAnnotations.created_at);

    return NextResponse.json({ annotations });
  } catch (error: any) {
    console.error('Fetch annotations error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new annotation
export async function POST(
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

    const body = await request.json();
    const validatedData = CreateAnnotationSchema.parse(body);

    const annotation = await db
      .insert(pdfAnnotations)
      .values({
        user_id: user.id,
        literature_id: literatureId,
        page_number: validatedData.page_number,
        annotation_type: validatedData.annotation_type,
        content: validatedData.content,
        note: validatedData.note || null,
        position: validatedData.position || null,
        color: validatedData.color,
      })
      .returning();

    // Track reading activity
    await db.insert(readingActivity).values({
      user_id: user.id,
      literature_id: literatureId,
      action: 'annotated',
    });

    return NextResponse.json({ annotation: annotation[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Create annotation error:', error);
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

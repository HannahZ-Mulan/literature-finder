import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { literature } from '@/db/schema';
import { z } from 'zod';
import { inArray } from 'drizzle-orm';
import { formatBibliography } from '@/lib/citation/format-citation-js';

// Schema for batch export request
const BatchExportSchema = z.object({
  ids: z.array(z.number()).min(1).max(100), // Limit to 100 items at once
  format: z.enum(['apa', 'mla', 'chicago', 'harvard', 'vancouver']).default('apa'),
});

// POST - Export multiple literature citations
export async function POST(request: NextRequest) {
  try {
    // 测试模式：跳过认证检查

    const body = await request.json();
    const { ids, format } = BatchExportSchema.parse(body);

    // Get all literature items
    const litList = await db
      .select()
      .from(literature)
      .where(inArray(literature.id, ids));

    if (litList.length === 0) {
      return NextResponse.json(
        { error: 'No literature found' },
        { status: 404 }
      );
    }

    // Format all citations
    const citations = litList.map(lit => ({
      id: lit.id,
      title: lit.title,
      authors: JSON.parse(lit.authors),
      publication_date: lit.publication_date || undefined,
      journal: lit.journal || undefined,
      volume: lit.volume || undefined,
      issue: lit.issue || undefined,
      pages: lit.pages || undefined,
      doi: lit.doi || undefined,
    }));

    const formattedCitations = await formatBibliography(citations, format);

    // Return citations as plain text
    return new NextResponse(formattedCitations, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="citations-${format}-${Date.now()}.txt"`,
      },
    });
  } catch (error) {
    console.error('Batch export error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

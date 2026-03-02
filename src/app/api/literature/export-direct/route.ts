import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { formatCitation } from '@/lib/citation/format-citation-js';

// Validation schema for direct export
const directExportSchema = z.object({
  title: z.string(),
  authors: z.array(z.object({
    name: z.string(),
    affiliation: z.string().optional(),
  })),
  abstract: z.string().optional(),
  publication_date: z.string().optional(),
  journal: z.string().optional(),
  volume: z.string().optional(),
  issue: z.string().optional(),
  pages: z.string().optional(),
  doi: z.string().optional(),
});

// GET /api/literature/export-direct - Export citation without saving
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'apa';

    // Get literature data from query params
    const dataParam = searchParams.get('data');
    if (!dataParam) {
      return NextResponse.json(
        { error: 'Missing literature data' },
        { status: 400 }
      );
    }

    const literatureData = JSON.parse(dataParam);

    // Validate
    const validation = directExportSchema.safeParse(literatureData);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid literature data', details: validation.error.errors },
        { status: 400 }
      );
    }

    // Format citation
    const citation = await formatCitation(validation.data, format as any);

    // Return as text
    return new NextResponse(citation, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error: any) {
    console.error('Direct export error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

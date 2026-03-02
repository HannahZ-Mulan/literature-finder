import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { literature } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const literatureId = parseInt(params.id);

    const litList = await db
      .select()
      .from(literature)
      .where(eq(literature.id, literatureId));

    if (litList.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const lit = litList[0];

    return NextResponse.json({
      id: lit.id,
      title: lit.title,
      authors: lit.authors,
      journal: lit.journal,
      volume: lit.volume,
      issue: lit.issue,
      pages: lit.pages,
      publication_date: lit.publication_date,
      doi: lit.doi,
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

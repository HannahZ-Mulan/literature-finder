import { NextResponse } from 'next/server';
import { dbPapers, papers } from '@/db/index-papers';
import { sql } from 'drizzle-orm';

// GET - List all papers
export async function GET() {
  try {
    const allPapers = await dbPapers
      .select()
      .from(papers)
      .orderBy(sql`${papers.createdAt} DESC`);

    return NextResponse.json({ papers: allPapers });
  } catch (error) {
    console.error('List papers error:', error);
    return NextResponse.json(
      { error: 'Failed to list papers' },
      { status: 500 }
    );
  }
}

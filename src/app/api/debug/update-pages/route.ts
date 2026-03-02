import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { literature } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Test: Update literature with page numbers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, pages } = body;

    if (!id || !pages) {
      return NextResponse.json({ error: 'Missing id or pages' }, { status: 400 });
    }

    await db
      .update(literature)
      .set({ pages })
      .where(eq(literature.id, id));

    return NextResponse.json({ success: true, message: 'Pages updated' });
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

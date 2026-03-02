import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { literature } from '@/db/schema';
import { desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // 获取最近保存的5篇文献
    const recentLiterature = await db
      .select({
        id: literature.id,
        title: literature.title,
        pdf_url: literature.pdf_url,
        source: literature.source,
      })
      .from(literature)
      .orderBy(desc(literature.created_at))
      .limit(5);

    return NextResponse.json({
      literature: recentLiterature,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

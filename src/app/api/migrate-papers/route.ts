import { NextRequest, NextResponse } from 'next/server';

/**
 * 确保paper_chats表存在
 */
export async function GET() {
  try {
    const { dbPapers } = await import('@/db/index-papers');
    const { paperChats } = await import('@/db/index-papers');

    // 尝试查询表，如果失败则创建
    try {
      await dbPapers.select().from(paperChats).limit(1);
      return NextResponse.json({
        success: true,
        message: 'paper_chats table exists',
      });
    } catch (error) {
      // 表不存在，创建表
      console.log('[Migrate] Creating paper_chats table...');

      await dbPapers.run(`
        CREATE TABLE IF NOT EXISTS paper_chats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          paper_id INTEGER NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
      `);

      return NextResponse.json({
        success: true,
        message: 'paper_chats table created successfully',
      });
    }
  } catch (error) {
    console.error('[Migrate] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Migration failed' },
      { status: 500 }
    );
  }
}

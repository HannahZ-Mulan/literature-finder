/**
 * 数据库迁移 API - 创建 paper_chats 表
 */

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { db } = await import('@/db');

    // 创建 paper_chats 表
    await db.run(`
      CREATE TABLE IF NOT EXISTS paper_chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        paper_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE
      )
    `);

    // 验证表是否创建成功
    const result = await db.all(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='paper_chats'
    `);

    const success = result.length > 0;

    return NextResponse.json({
      success,
      message: success ? 'paper_chats table created successfully' : 'Failed to create table',
      tables: result.map(r => r.name),
    });
  } catch (error) {
    console.error('[Migration] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Migration failed',
      },
      { status: 500 }
    );
  }
}

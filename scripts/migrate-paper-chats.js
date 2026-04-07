/**
 * 数据库迁移脚本 - 添加 paper_chats 表
 */

const fs = require('fs');
const path = require('path');

async function migrate() {
  const { drizzle } = require('drizzle-orm/libsql');
  const { migrate } = require('drizzle-orm/libsql/migrator');

  const db = drizzle({
    url: process.env.DATABASE_URL || 'file:./literature.db',
  });

  console.log('[Migration] Creating paper_chats table...');

  try {
    // 直接执行SQL创建表
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

    console.log('[Migration] ✅ paper_chats table created successfully');
    console.log('[Migration] Checking table...');

    // 验证表是否创建成功
    const tables = await db.all(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='paper_chats'
    `);

    if (tables.length > 0) {
      console.log('[Migration] ✅ Table verified in database');
    } else {
      console.log('[Migration] ❌ Table not found');
    }

    process.exit(0);
  } catch (error) {
    console.error('[Migration] Error:', error);
    process.exit(1);
  }
}

migrate();

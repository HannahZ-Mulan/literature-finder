import { db } from '../src/db';
import { sql } from 'drizzle-orm';

/**
 * Migration: Add quick notes fields to user_literature table
 */
async function migrate() {
  console.log('开始迁移 user_literature 表...');

  try {
    // Check if columns exist
    const tableInfo = await db.all(sql`
      PRAGMA table_info(user_literature)
    `);

    const columns: string[] = tableInfo.map((row: any) => row.name);

    // Add is_favorite column
    if (!columns.includes('is_favorite')) {
      await db.run(sql`
        ALTER TABLE user_literature ADD COLUMN is_favorite INTEGER DEFAULT 0
      `);
      console.log('✓ 添加 is_favorite 字段');
    } else {
      console.log('- is_favorite 字段已存在，跳过');
    }

    // Add is_liked column
    if (!columns.includes('is_liked')) {
      await db.run(sql`
        ALTER TABLE user_literature ADD COLUMN is_liked INTEGER DEFAULT 0
      `);
      console.log('✓ 添加 is_liked 字段');
    } else {
      console.log('- is_liked 字段已存在，跳过');
    }

    // Add is_to_read column
    if (!columns.includes('is_to_read')) {
      await db.run(sql`
        ALTER TABLE user_literature ADD COLUMN is_to_read INTEGER DEFAULT 0
      `);
      console.log('✓ 添加 is_to_read 字段');
    } else {
      console.log('- is_to_read 字段已存在，跳过');
    }

    // Add reading_progress column
    if (!columns.includes('reading_progress')) {
      await db.run(sql`
        ALTER TABLE user_literature ADD COLUMN reading_progress INTEGER
      `);
      console.log('✓ 添加 reading_progress 字段');
    } else {
      console.log('- reading_progress 字段已存在，跳过');
    }

    // Add updated_at column
    if (!columns.includes('updated_at')) {
      await db.run(sql`
        ALTER TABLE user_literature ADD COLUMN updated_at INTEGER
      `);
      // Set default value for existing rows
      await db.run(sql`
        UPDATE user_literature SET updated_at = (unixepoch()) WHERE updated_at IS NULL
      `);
      console.log('✓ 添加 updated_at 字段');
    } else {
      console.log('- updated_at 字段已存在，跳过');
    }

    console.log('\n✅ 迁移完成！');
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  }
}

migrate()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

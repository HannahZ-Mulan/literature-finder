import { db } from '../src/db';
import { readingListItems } from '../src/db/schema';
import { sql } from 'drizzle-orm';

/**
 * Migration: Add due_date, priority, and reading time fields to reading_list_items
 */
async function migrate() {
  console.log('开始迁移 reading_list_items 表...');

  try {
    // 检查字段是否已存在
    const tableInfo = await db.run(sql`
      PRAGMA table_info(reading_list_items)
    `);

    const columns = tableInfo.columns ? Object.keys(tableInfo) : [];

    // 添加 due_date 字段
    if (!columns.includes('due_date')) {
      await db.run(sql`
        ALTER TABLE reading_list_items ADD COLUMN due_date INTEGER
      `);
      console.log('✓ 添加 due_date 字段');
    } else {
      console.log('- due_date 字段已存在，跳过');
    }

    // 添加 priority 字段
    if (!columns.includes('priority')) {
      await db.run(sql`
        ALTER TABLE reading_list_items ADD COLUMN priority TEXT DEFAULT 'medium'
      `);
      console.log('✓ 添加 priority 字段');
    } else {
      console.log('- priority 字段已存在，跳过');
    }

    // 添加 estimated_reading_time 字段
    if (!columns.includes('estimated_reading_time')) {
      await db.run(sql`
        ALTER TABLE reading_list_items ADD COLUMN estimated_reading_time INTEGER
      `);
      console.log('✓ 添加 estimated_reading_time 字段');
    } else {
      console.log('- estimated_reading_time 字段已存在，跳过');
    }

    // 添加 actual_reading_time 字段
    if (!columns.includes('actual_reading_time')) {
      await db.run(sql`
        ALTER TABLE reading_list_items ADD COLUMN actual_reading_time INTEGER
      `);
      console.log('✓ 添加 actual_reading_time 字段');
    } else {
      console.log('- actual_reading_time 字段已存在，跳过');
    }

    // 创建索引
    try {
      await db.run(sql`
        CREATE INDEX IF NOT EXISTS reading_list_items_due_date_idx ON reading_list_items(due_date)
      `);
      console.log('✓ 创建 due_date 索引');
    } catch (e) {
      console.log('- due_date 索引可能已存在');
    }

    try {
      await db.run(sql`
        CREATE INDEX IF NOT EXISTS reading_list_items_priority_idx ON reading_list_items(priority)
      `);
      console.log('✓ 创建 priority 索引');
    } catch (e) {
      console.log('- priority 索引可能已存在');
    }

    try {
      await db.run(sql`
        CREATE INDEX IF NOT EXISTS reading_list_items_list_idx ON reading_list_items(reading_list_id)
      `);
      console.log('✓ 创建 reading_list_id 索引');
    } catch (e) {
      console.log('- reading_list_id 索引可能已存在');
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

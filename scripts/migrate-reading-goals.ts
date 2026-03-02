import { db } from '../src/db';
import { userSettings } from '../src/db/schema';
import { sql } from 'drizzle-orm';

/**
 * Migration: Add reading goals to user_settings
 */
async function migrate() {
  console.log('开始迁移 user_settings 表...');

  try {
    // Check if columns exist
    const tableInfo = await db.run(sql`
      PRAGMA table_info(user_settings)
    `);

    const columns = tableInfo.columns ? Object.keys(tableInfo) : [];

    // Add daily_reading_goal column
    if (!columns.includes('daily_reading_goal')) {
      await db.run(sql`
        ALTER TABLE user_settings ADD COLUMN daily_reading_goal INTEGER DEFAULT 3
      `);
      console.log('✓ 添加 daily_reading_goal 字段');
    } else {
      console.log('- daily_reading_goal 字段已存在，跳过');
    }

    // Add weekly_reading_goal column
    if (!columns.includes('weekly_reading_goal')) {
      await db.run(sql`
        ALTER TABLE user_settings ADD COLUMN weekly_reading_goal INTEGER DEFAULT 15
      `);
      console.log('✓ 添加 weekly_reading_goal 字段');
    } else {
      console.log('- weekly_reading_goal 字段已存在，跳过');
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

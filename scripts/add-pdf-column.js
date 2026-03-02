import { createClient } from '@libsql/client';

const db = createClient({
  url: 'file:sqlite.db'
});

async function migrate() {
  try {
    // 检查表结构
    const result = await db.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='literature'");
    const createSql = result.rows[0]?.sql;

    console.log('Current literature table schema:', createSql);

    // 检查 pdf_url 列是否存在
    if (createSql && createSql.includes('pdf_url')) {
      console.log('✓ pdf_url column already exists.');
    } else {
      console.log('Adding pdf_url column to literature table...');
      await db.execute('ALTER TABLE literature ADD COLUMN pdf_url text;');
      console.log('✓ Migration successful!');
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

migrate();

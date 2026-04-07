const { db } = require('./src/db/index');
const { sql } = require('drizzle-orm');

async function fixDatabase() {
  try {
    console.log('Fixing database schema...\n');

    // 添加缺失的列
    const columns = [
      { name: 'is_complete', sql: 'ALTER TABLE uploaded_papers ADD COLUMN is_complete INTEGER DEFAULT 0' },
      { name: 'total_pages', sql: 'ALTER TABLE uploaded_papers ADD COLUMN total_pages INTEGER' },
      { name: 'extracted_pages', sql: 'ALTER TABLE uploaded_papers ADD COLUMN extracted_pages INTEGER' },
      { name: 'extraction_method', sql: 'ALTER TABLE uploaded_papers ADD COLUMN extraction_method TEXT' }
    ];

    for (const column of columns) {
      try {
        await db.run(sql`${column.sql}`);
        console.log(`✅ ${column.name} column added`);
      } catch (err) {
        if (err.message.includes('duplicate column name')) {
          console.log(`ℹ️  ${column.name} column already exists`);
        } else {
          console.error(`❌ ${column.name} failed:`, err.message);
        }
      }
    }

    console.log('\n✅ Database schema fixed!');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

fixDatabase();

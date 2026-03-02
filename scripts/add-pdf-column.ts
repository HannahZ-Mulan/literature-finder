import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'sqlite.db');
const db = new Database(dbPath);

try {
  // 检查列是否已存在
  const columns = db.pragma("table_info(literature)") as any[];
  const hasPdfUrl = columns.some((col: any) => col.name === 'pdf_url');

  if (!hasPdfUrl) {
    console.log('Adding pdf_url column to literature table...');
    db.exec('ALTER TABLE literature ADD COLUMN pdf_url text;');
    console.log('✓ Migration successful!');
  } else {
    console.log('✓ pdf_url column already exists.');
  }
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}

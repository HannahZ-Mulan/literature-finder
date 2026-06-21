import { sql } from 'drizzle-orm';
import { db } from '@/db';

export async function up() {
  console.log('Creating paper_chunks table...');

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS paper_chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paper_id INTEGER NOT NULL,
      chunk_type TEXT NOT NULL,
      chunk_text TEXT NOT NULL,
      char_start INTEGER NOT NULL,
      char_end INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (paper_id) REFERENCES uploaded_papers(id) ON DELETE CASCADE
    )
  `);

  console.log('Creating indexes...');
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_chunks_paper_id ON paper_chunks(paper_id)`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_chunks_type ON paper_chunks(chunk_type)`);

  console.log('Creating cascade delete trigger...');
  await db.run(sql`
    CREATE TRIGGER IF NOT EXISTS delete_paper_chunks
    AFTER DELETE ON uploaded_papers
    BEGIN
      DELETE FROM paper_chunks WHERE paper_id = OLD.id;
    END
  `);

  console.log('✅ Migration complete');
}

export async function down() {
  console.log('Rolling back migration...');
  await db.run(sql`DROP TABLE IF EXISTS paper_chunks`);
  console.log('✅ Rollback complete');
}

// Run migration if executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'up') {
    up().catch(console.error);
  } else if (command === 'down') {
    down().catch(console.error);
  } else {
    console.log('Usage: npx tsx scripts/migrations/001-create-paper-chunks.ts [up|down]');
  }
}

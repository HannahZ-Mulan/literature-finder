import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { join } from 'path';

// Read .env.local file
const envPath = join(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');

// Parse DATABASE_URL
const dbUrl = envContent
  .split('\n')
  .find(line => line.startsWith('DATABASE_URL='))
  ?.split('=')[1]
  ?.trim() || 'file:./sqlite.db';

const client = createClient({
  url: dbUrl,
});

async function addMissingTables() {
  console.log('Adding missing database tables...');

  try {
    // Create literature_notes table if not exists
    await client.execute(`
      CREATE TABLE IF NOT EXISTS literature_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        literature_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        quote TEXT,
        page_number INTEGER,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (literature_id) REFERENCES literature(id)
      )
    `);
    console.log('✓ literature_notes table created');

    // Create summaries table if not exists
    await client.execute(`
      CREATE TABLE IF NOT EXISTS summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        literature_id INTEGER NOT NULL,
        length_level TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
        FOREIGN KEY (literature_id) REFERENCES literature(id)
      )
    `);
    console.log('✓ summaries table created');

    // Create indexes
    console.log('\nCreating indexes...');

    const indexes = [
      'CREATE INDEX IF NOT EXISTS literature_notes_user_idx ON literature_notes(user_id)',
      'CREATE INDEX IF NOT EXISTS literature_notes_literature_idx ON literature_notes(literature_id)',
      'CREATE INDEX IF NOT EXISTS literature_notes_created_idx ON literature_notes(created_at)',
    ];

    for (const indexSql of indexes) {
      try {
        await client.execute(indexSql);
      } catch (e: any) {
        if (!e.message.includes('already exists')) {
          console.error('Error creating index:', e.message);
        }
      }
    }

    console.log('✓ Indexes created');

    console.log('\n✅ All missing tables created successfully!');
    console.log('\nDatabase is now complete.');
  } catch (error: any) {
    console.error('Error creating tables:', error);
    process.exit(1);
  } finally {
    client.close();
  }
}

addMissingTables();

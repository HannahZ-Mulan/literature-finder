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

async function createMissingTables() {
  console.log('Creating missing tables...');

  try {
    // Create literature table if not exists
    await client.execute(`
      CREATE TABLE IF NOT EXISTS literature (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        authors TEXT NOT NULL,
        abstract TEXT,
        doi TEXT UNIQUE,
        publication_date TEXT,
        journal TEXT,
        volume TEXT,
        issue TEXT,
        pages TEXT,
        citation_count INTEGER NOT NULL DEFAULT 0,
        source TEXT NOT NULL,
        keywords TEXT,
        pdf_url TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
    console.log('✓ literature table created');

    // Create indexes for literature
    try {
      await client.execute('CREATE INDEX IF NOT EXISTS literature_title_idx ON literature(title)');
      await client.execute('CREATE INDEX IF NOT EXISTS literature_citation_count_idx ON literature(citation_count)');
      await client.execute('CREATE INDEX IF NOT EXISTS literature_publication_date_idx ON literature(publication_date)');
      await client.execute('CREATE INDEX IF NOT EXISTS literature_source_idx ON literature(source)');
      console.log('✓ literature indexes created');
    } catch (e: any) {
      if (!e.message.includes('already exists')) {
        console.error('Error creating indexes:', e.message);
      }
    }

    // Create search_history table if not exists
    await client.execute(`
      CREATE TABLE IF NOT EXISTS search_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        query TEXT NOT NULL,
        source TEXT NOT NULL,
        results_count INTEGER,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
    console.log('✓ search_history table created');

    // Create indexes for search_history
    try {
      await client.execute('CREATE INDEX IF NOT EXISTS search_history_user_idx ON search_history(user_id)');
      await client.execute('CREATE INDEX IF NOT EXISTS search_history_created_at_idx ON search_history(created_at)');
      console.log('✓ search_history indexes created');
    } catch (e: any) {
      if (!e.message.includes('already exists')) {
        console.error('Error creating indexes:', e.message);
      }
    }

    console.log('\n✅ All missing tables created successfully!');
  } catch (error: any) {
    console.error('Error creating tables:', error);
    process.exit(1);
  } finally {
    client.close();
  }
}

createMissingTables();

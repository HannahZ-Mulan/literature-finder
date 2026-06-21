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

async function createAllTables() {
  console.log('Creating all database tables...');

  try {
    // Create users table if not exists
    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        avatar_url TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
    console.log('✓ users table created');

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

    // Create user_literature table if not exists
    await client.execute(`
      CREATE TABLE IF NOT EXISTS user_literature (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        literature_id INTEGER NOT NULL,
        notes TEXT,
        is_favorite INTEGER NOT NULL DEFAULT 0,
        is_liked INTEGER NOT NULL DEFAULT 0,
        is_to_read INTEGER NOT NULL DEFAULT 0,
        reading_progress INTEGER,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (literature_id) REFERENCES literature(id)
      )
    `);
    console.log('✓ user_literature table created');

    // Create categories table if not exists
    await client.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    console.log('✓ categories table created');

    // Create literature_categories table if not exists
    await client.execute(`
      CREATE TABLE IF NOT EXISTS literature_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        literature_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        FOREIGN KEY (literature_id) REFERENCES literature(id),
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `);
    console.log('✓ literature_categories table created');

    // Create tags table if not exists
    await client.execute(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        color TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    console.log('✓ tags table created');

    // Create literature_tags table if not exists
    await client.execute(`
      CREATE TABLE IF NOT EXISTS literature_tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        literature_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        FOREIGN KEY (literature_id) REFERENCES literature(id),
        FOREIGN KEY (tag_id) REFERENCES tags(id)
      )
    `);
    console.log('✓ literature_tags table created');

    // Create reading_lists table if not exists
    await client.execute(`
      CREATE TABLE IF NOT EXISTS reading_lists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    console.log('✓ reading_lists table created');

    // Create reading_list_items table if not exists
    await client.execute(`
      CREATE TABLE IF NOT EXISTS reading_list_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reading_list_id INTEGER NOT NULL,
        literature_id INTEGER NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        reading_status TEXT NOT NULL DEFAULT 'unread',
        due_date INTEGER,
        priority TEXT NOT NULL DEFAULT 'medium',
        estimated_reading_time INTEGER,
        actual_reading_time INTEGER,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
        FOREIGN KEY (reading_list_id) REFERENCES reading_lists(id),
        FOREIGN KEY (literature_id) REFERENCES literature(id)
      )
    `);
    console.log('✓ reading_list_items table created');

    // Create search_history table if not exists
    await client.execute(`
      CREATE TABLE IF NOT EXISTS search_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        query TEXT NOT NULL,
        source TEXT NOT NULL,
        results_count INTEGER,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    console.log('✓ search_history table created');

    // Create uploaded_papers table if not exists
    await client.execute(`
      CREATE TABLE IF NOT EXISTS uploaded_papers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        file_name TEXT NOT NULL,
        extracted_text TEXT NOT NULL,
        is_complete INTEGER NOT NULL DEFAULT 0,
        total_pages INTEGER,
        extracted_pages INTEGER,
        extraction_method TEXT,
        summary TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
    console.log('✓ uploaded_papers table created');

    // Create paper_chats table if not exists
    await client.execute(`
      CREATE TABLE IF NOT EXISTS paper_chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        paper_id INTEGER NOT NULL,
        user_id INTEGER,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        FOREIGN KEY (paper_id) REFERENCES uploaded_papers(id)
      )
    `);
    console.log('✓ paper_chats table created');

    // Create indexes
    console.log('\nCreating indexes...');

    const indexes = [
      'CREATE INDEX IF NOT EXISTS literature_title_idx ON literature(title)',
      'CREATE INDEX IF NOT EXISTS literature_citation_count_idx ON literature(citation_count)',
      'CREATE INDEX IF NOT EXISTS literature_publication_date_idx ON literature(publication_date)',
      'CREATE INDEX IF NOT EXISTS literature_source_idx ON literature(source)',
      'CREATE INDEX IF NOT EXISTS user_literature_user_idx ON user_literature(user_id)',
      'CREATE INDEX IF NOT EXISTS user_literature_literature_idx ON user_literature(literature_id)',
      'CREATE INDEX IF NOT EXISTS user_literature_user_literature_idx ON user_literature(user_id, literature_id)',
      'CREATE INDEX IF NOT EXISTS user_literature_favorite_idx ON user_literature(is_favorite)',
      'CREATE INDEX IF NOT EXISTS user_literature_to_read_idx ON user_literature(is_to_read)',
      'CREATE INDEX IF NOT EXISTS user_literature_created_at_idx ON user_literature(created_at)',
      'CREATE INDEX IF NOT EXISTS literature_categories_literature_idx ON literature_categories(literature_id)',
      'CREATE INDEX IF NOT EXISTS literature_categories_category_idx ON literature_categories(category_id)',
      'CREATE INDEX IF NOT EXISTS literature_categories_literature_category_idx ON literature_categories(literature_id, category_id)',
      'CREATE INDEX IF NOT EXISTS literature_tags_literature_idx ON literature_tags(literature_id)',
      'CREATE INDEX IF NOT EXISTS literature_tags_tag_idx ON literature_tags(tag_id)',
      'CREATE INDEX IF NOT EXISTS literature_tags_literature_tag_idx ON literature_tags(literature_id, tag_id)',
      'CREATE INDEX IF NOT EXISTS reading_list_items_list_idx ON reading_list_items(reading_list_id)',
      'CREATE INDEX IF NOT EXISTS reading_list_items_literature_idx ON reading_list_items(literature_id)',
      'CREATE INDEX IF NOT EXISTS reading_list_items_due_date_idx ON reading_list_items(due_date)',
      'CREATE INDEX IF NOT EXISTS reading_list_items_priority_idx ON reading_list_items(priority)',
      'CREATE INDEX IF NOT EXISTS search_history_user_idx ON search_history(user_id)',
      'CREATE INDEX IF NOT EXISTS search_history_created_at_idx ON search_history(created_at)',
      'CREATE INDEX IF NOT EXISTS paper_chats_paper_id_idx ON paper_chats(paper_id)',
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

    // Create test user if not exists
    console.log('\nCreating test user...');
    try {
      await client.execute(`
        INSERT OR IGNORE INTO users (id, email, password_hash, name)
        VALUES (1, 'test@example.com', 'test', 'Test User')
      `);
      console.log('✓ Test user created');
    } catch (e: any) {
      console.log('- Test user already exists');
    }

    console.log('\n✅ All tables created successfully!');
    console.log('\nDatabase is now ready to use.');
  } catch (error: any) {
    console.error('Error creating tables:', error);
    process.exit(1);
  } finally {
    client.close();
  }
}

createAllTables();

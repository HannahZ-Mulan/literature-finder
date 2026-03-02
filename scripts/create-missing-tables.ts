import { createClient } from '@libsql/client';

async function createMissingTables() {
  const client = createClient({ url: 'file:./sqlite.db' });

  try {
    // Create tags table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS tags (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        user_id integer NOT NULL,
        name text NOT NULL,
        color text,
        created_at integer DEFAULT (unixepoch()) NOT NULL,
        updated_at integer DEFAULT (unixepoch()) NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action
      );
    `);
    console.log('✓ Created tags table');

    // Create reading_lists table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS reading_lists (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        user_id integer NOT NULL,
        name text NOT NULL,
        description text,
        created_at integer DEFAULT (unixepoch()) NOT NULL,
        updated_at integer DEFAULT (unixepoch()) NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action
      );
    `);
    console.log('✓ Created reading_lists table');

    // Create search_history table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS search_history (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        user_id integer NOT NULL,
        query text NOT NULL,
        source text NOT NULL,
        created_at integer DEFAULT (unixepoch()) NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action
      );
    `);
    console.log('✓ Created search_history table');

    // Create summaries table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS summaries (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        literature_id integer NOT NULL,
        length_level text NOT NULL,
        content text NOT NULL,
        created_at integer DEFAULT (unixepoch()) NOT NULL,
        updated_at integer DEFAULT (unixepoch()) NOT NULL,
        FOREIGN KEY (literature_id) REFERENCES literature(id) ON UPDATE no action ON DELETE no action
      );
    `);
    console.log('✓ Created summaries table');

    // Create user_settings table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        user_id integer NOT NULL UNIQUE,
        summary_length_level text NOT NULL DEFAULT 'medium',
        default_export_format text NOT NULL DEFAULT 'bibtex',
        notification_preferences text,
        created_at integer DEFAULT (unixepoch()) NOT NULL,
        updated_at integer DEFAULT (unixepoch()) NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action
      );
    `);
    console.log('✓ Created user_settings table');

    console.log('\n✅ All missing tables created successfully!');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  } finally {
    client.close();
  }
}

createMissingTables();

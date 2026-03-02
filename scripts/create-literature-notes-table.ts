import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function createLiteratureNotesTable() {
  console.log('Creating literature_notes table...');

  try {
    // Create the table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS literature_notes (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        user_id integer NOT NULL,
        literature_id integer NOT NULL,
        content text NOT NULL,
        quote text,
        page_number integer,
        created_at integer DEFAULT (unixepoch()) NOT NULL,
        updated_at integer DEFAULT (unixepoch()) NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (literature_id) REFERENCES literature(id) ON UPDATE no action ON DELETE no action
      )
    `);
    console.log('  [✓] Table created');

    // Create indexes
    await db.run(sql`
      CREATE INDEX IF NOT EXISTS literature_notes_user_idx ON literature_notes (user_id)
    `);
    console.log('  [✓] Index literature_notes_user_idx created');

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS literature_notes_literature_idx ON literature_notes (literature_id)
    `);
    console.log('  [✓] Index literature_notes_literature_idx created');

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS literature_notes_created_idx ON literature_notes (created_at)
    `);
    console.log('  [✓] Index literature_notes_created_idx created');

    console.log('\n✅ literature_notes table created successfully!');
  } catch (error) {
    console.error('❌ Error creating table:', error);
    process.exit(1);
  }
}

createLiteratureNotesTable()
  .then(() => {
    console.log('Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

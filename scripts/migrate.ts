import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:sqlite.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function runMigration() {
  try {
    const sql = readFileSync(join(process.cwd(), 'drizzle', '0009_glossy_justice.sql'), 'utf-8');

    // Split by statement breakpoint and execute each statement
    const statements = sql.split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      try {
        await client.execute(statement);
        console.log('✓ Executed statement');
      } catch (e: any) {
        // Skip if table already exists or duplicate
        if (e.message.includes('already exists') || e.message.includes('duplicate')) {
          console.log('- Skipped (already exists)');
        } else {
          console.error('Error:', e.message);
        }
      }
    }

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.close();
  }
}

runMigration();

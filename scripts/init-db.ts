import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { join } from 'path';

async function initDb() {
  const client = createClient({ url: 'file:./sqlite.db' });

  // Read and execute all migration files
  const migrationsDir = './drizzle';
  const migrationFiles = [
    '0000_aspiring_molly_hayes.sql',
    '0001_tired_star_brand.sql',
    '0002_remarkable_mysterio.sql',
    '0003_wonderful_prowler.sql',
    '0004_shocking_tigra.sql',
    '0005_steep_makkari.sql',
    '0006_slow_katie_power.sql',
  ];

  try {
    // Execute each migration
    for (const file of migrationFiles) {
      const migrationPath = join(migrationsDir, file);
      try {
        const sql = readFileSync(migrationPath, 'utf-8');
        await client.execute(sql);
        console.log(`✓ Executed: ${file}`);
      } catch (error: any) {
        // Ignore errors if table already exists
        if (!error.message.includes('already exists')) {
          console.log(`⚠ Skipped: ${file} (${error.message})`);
        } else {
          console.log(`⚠ Skipped: ${file} (table already exists)`);
        }
      }
    }

    console.log('\n✅ Database initialized successfully!');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    client.close();
  }
}

initDb();

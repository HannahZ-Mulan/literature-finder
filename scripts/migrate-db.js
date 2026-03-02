/**
 * Database Migration using Drizzle
 */

const { migrate } = require('drizzle-orm/better-sqlite3/migrator');
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'sqlite.db');
const sqlite = new Database(dbPath);

console.log('🔄 Running database migration...\n');

(async () => {
  try {
    // Check existing columns
    const columns = sqlite.prepare("PRAGMA table_info(literature)").all();
    const columnNames = columns.map(c => c.name);

    console.log('Current columns:', columnNames.join(', '));

    // Add missing columns
    const migrations = [
      { name: 'volume', sql: 'ALTER TABLE literature ADD COLUMN volume TEXT' },
      { name: 'issue', sql: 'ALTER TABLE literature ADD COLUMN issue TEXT' },
      { name: 'pages', sql: 'ALTER TABLE literature ADD COLUMN pages TEXT' },
    ];

    for (const migration of migrations) {
      if (!columnNames.includes(migration.name)) {
        console.log(`Adding column: ${migration.name}`);
        sqlite.exec(migration.sql);
        console.log(`✓ Added ${migration.name}`);
      } else {
        console.log(`⊘ Column ${migration.name} already exists, skipping`);
      }
    }

    console.log('\n✅ Migration completed successfully!');

    // Verify
    const newColumns = sqlite.prepare("PRAGMA table_info(literature)").all();
    console.log('\nUpdated columns:', newColumns.map(c => c.name).join(', '));

    sqlite.close();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    sqlite.close();
    process.exit(1);
  }
})();

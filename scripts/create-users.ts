import { createClient } from '@libsql/client';

const client = createClient({ url: 'file:./sqlite.db' });

async function createUsersTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar_url TEXT,
      created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
      updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email);
  `;

  try {
    await client.execute(sql);
    console.log('✅ users table created successfully!');

    // Verify
    const result = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    console.log('Tables:', result.rows.map(r => r.name));
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.close();
  }
}

createUsersTable();

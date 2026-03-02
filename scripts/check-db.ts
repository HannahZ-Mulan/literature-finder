import { createClient } from '@libsql/client';

const client = createClient({ url: 'file:./sqlite.db' });

async function checkDb() {
  try {
    const result = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('Tables in database:', result.rows);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.close();
  }
}

checkDb();

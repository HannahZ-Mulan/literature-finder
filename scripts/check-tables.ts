import { createClient } from '@libsql/client';

async function checkTables() {
  const client = createClient({ url: 'file:./sqlite.db' });

  try {
    const result = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
    );
    console.log('Tables in database:');
    result.rows.forEach((row: any) => {
      console.log('  -', row.name);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.close();
  }
}

checkTables();

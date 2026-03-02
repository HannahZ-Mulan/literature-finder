/**
 * Simple migration script using fetch to call API
 */

async function migrate() {
  console.log('🔄 Running database migration via API...\n');

  try {
    // Call an API endpoint that will run the migration
    const response = await fetch('http://localhost:3000/api/debug/migrate-db', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-mode': 'true',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Migration completed successfully!');
      console.log(data.message);
    } else {
      const error = await response.json();
      console.error('❌ Migration failed:', error.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure the dev server is running on http://localhost:3000');
  }
}

migrate();

const { createClient } = require('@libsql/client');

const db = createClient({
  url: 'file:sqlite.db'
});

async function checkPDFs() {
  try {
    const result = await db.execute(`
      SELECT id, title, pdf_url
      FROM literature
      WHERE pdf_url IS NOT NULL
      LIMIT 5
    `);

    console.log('Literature with PDF URLs:');
    console.log(JSON.stringify(result.rows, null, 2));

    const totalResult = await db.execute(`
      SELECT COUNT(*) as total, COUNT(pdf_url) as with_pdf
      FROM literature
    `);

    console.log('\nTotal statistics:');
    console.log(JSON.stringify(totalResult.rows[0], null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkPDFs();

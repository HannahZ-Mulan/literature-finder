import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/db';

// POST /api/debug/migrate-db - Add missing columns to literature table
export async function POST(request: NextRequest) {
  try {
    // Check if columns exist
    const columnsResult = await client.execute(`
      PRAGMA table_info(literature)
    `);
    const columnNames = columnsResult.rows.map((r: any) => r.name);

    const migrations = [
      { name: 'volume', sql: 'ALTER TABLE literature ADD COLUMN volume TEXT' },
      { name: 'issue', sql: 'ALTER TABLE literature ADD COLUMN issue TEXT' },
      { name: 'pages', sql: 'ALTER TABLE literature ADD COLUMN pages TEXT' },
    ];

    const executed = [];

    for (const migration of migrations) {
      if (!columnNames.includes(migration.name)) {
        await client.execute(migration.sql);
        executed.push(migration.name);
      }
    }

    // Verify the changes
    const newColumnsResult = await client.execute(`
      PRAGMA table_info(literature)
    `);
    const newColumnNames = newColumnsResult.rows.map((r: any) => r.name);

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      executed,
      allColumns: newColumnNames,
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

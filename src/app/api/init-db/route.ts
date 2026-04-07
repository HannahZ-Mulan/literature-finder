import { NextResponse } from 'next/server';
import { db } from '@/db/index';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Create uploaded_papers table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS uploaded_papers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        file_name TEXT NOT NULL,
        extracted_text TEXT NOT NULL,
        is_complete INTEGER DEFAULT 0,
        total_pages INTEGER,
        extracted_pages INTEGER,
        extraction_method TEXT,
        summary TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Add new columns if they don't exist (for existing databases)
    const columns = [
      { name: 'is_complete', sql: 'ALTER TABLE uploaded_papers ADD COLUMN is_complete INTEGER DEFAULT 0' },
      { name: 'total_pages', sql: 'ALTER TABLE uploaded_papers ADD COLUMN total_pages INTEGER' },
      { name: 'extracted_pages', sql: 'ALTER TABLE uploaded_papers ADD COLUMN extracted_pages INTEGER' },
      { name: 'extraction_method', sql: 'ALTER TABLE uploaded_papers ADD COLUMN extraction_method TEXT' },
    ];

    for (const column of columns) {
      try {
        await db.run(sql`${column.sql}`);
        console.log(`[InitDB] Added ${column.name} column to uploaded_papers`);
      } catch (err: any) {
        if (err.message.includes('duplicate column name')) {
          console.log(`[InitDB] ${column.name} column already exists`);
        } else {
          console.warn(`[InitDB] Could not add ${column.name} column:`, err.message);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
    });
  } catch (error) {
    console.error('Init database error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initialize database' },
      { status: 500 }
    );
  }
}

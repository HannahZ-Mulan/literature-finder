import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// 简化的论文表
export const papers = sqliteTable('papers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  fileName: text('file_name').notNull(),
  extractedText: text('extracted_text').notNull(),
  isComplete: integer('is_complete', { mode: 'boolean' }).notNull().default(false),
  // AI summary
  summary: text('summary'), // JSON string with structured summary
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

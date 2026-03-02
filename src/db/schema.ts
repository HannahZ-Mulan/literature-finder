import { sqliteTable, text, integer, index, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  name: text('name').notNull(),
  avatar_url: text('avatar_url'),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const literature = sqliteTable('literature', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  authors: text('authors').notNull(), // JSON array of author names
  abstract: text('abstract'),
  doi: text('doi').unique(),
  publication_date: text('publication_date'), // ISO date string
  journal: text('journal'),
  volume: text('volume'), // Journal volume
  issue: text('issue'), // Journal issue
  pages: text('pages'), // Page numbers (e.g., "1-10")
  citation_count: integer('citation_count').notNull().default(0),
  source: text('source').notNull(), // arxiv, pubmed, semantic-scholar
  keywords: text('keywords'), // JSON array of keywords
  pdf_url: text('pdf_url'), // URL to PDF file
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  titleIdx: index('literature_title_idx').on(table.title),
  citationCountIdx: index('literature_citation_count_idx').on(table.citation_count),
  publicationDateIdx: index('literature_publication_date_idx').on(table.publication_date),
  sourceIdx: index('literature_source_idx').on(table.source),
}));

export const userLiterature = sqliteTable('user_literature', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().references(() => users.id),
  literature_id: integer('literature_id').notNull().references(() => literature.id),
  notes: text('notes'), // User's personal notes
  is_favorite: integer('is_favorite', { mode: 'boolean' }).notNull().default(false), // ⭐ 收藏
  is_liked: integer('is_liked', { mode: 'boolean' }).notNull().default(false), // ❤️ 喜欢
  is_to_read: integer('is_to_read', { mode: 'boolean' }).notNull().default(false), // 📌 待细读
  reading_progress: integer('reading_progress'), // 📖 阅读进度（页码）
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  userIdx: index('user_literature_user_idx').on(table.user_id),
  literatureIdx: index('user_literature_literature_idx').on(table.literature_id),
  userLiteratureIdx: index('user_literature_user_literature_idx').on(table.user_id, table.literature_id),
  favoriteIdx: index('user_literature_favorite_idx').on(table.is_favorite),
  toReadIdx: index('user_literature_to_read_idx').on(table.is_to_read),
  createdAtIdx: index('user_literature_created_at_idx').on(table.created_at),
}));

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  sort_order: integer('sort_order').notNull().default(0),
  is_default: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const literatureCategories = sqliteTable('literature_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  literature_id: integer('literature_id').notNull().references(() => literature.id),
  category_id: integer('category_id').notNull().references(() => categories.id),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  literatureIdx: index('literature_categories_literature_idx').on(table.literature_id),
  categoryIdx: index('literature_categories_category_idx').on(table.category_id),
  literatureCategoryIdx: index('literature_categories_literature_category_idx').on(table.literature_id, table.category_id),
}));

export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  color: text('color'),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const literatureTags = sqliteTable('literature_tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  literature_id: integer('literature_id').notNull().references(() => literature.id),
  tag_id: integer('tag_id').notNull().references(() => tags.id),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  literatureIdx: index('literature_tags_literature_idx').on(table.literature_id),
  tagIdx: index('literature_tags_tag_idx').on(table.tag_id),
  literatureTagIdx: index('literature_tags_literature_tag_idx').on(table.literature_id, table.tag_id),
}));

export const readingLists = sqliteTable('reading_lists', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  description: text('description'),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const readingListItems = sqliteTable('reading_list_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  reading_list_id: integer('reading_list_id').notNull().references(() => readingLists.id),
  literature_id: integer('literature_id').notNull().references(() => literature.id),
  sort_order: integer('sort_order').notNull().default(0),
  reading_status: text('reading_status').notNull().default('unread'), // unread|reading|read
  due_date: integer('due_date', { mode: 'timestamp' }), // 截止日期
  priority: text('priority').notNull().default('medium'), // 优先级: low|medium|high|urgent
  estimated_reading_time: integer('estimated_reading_time'), // 预计阅读时间（分钟）
  actual_reading_time: integer('actual_reading_time'), // 实际阅读时间（分钟）
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  readingListIdx: index('reading_list_items_list_idx').on(table.reading_list_id),
  literatureIdx: index('reading_list_items_literature_idx').on(table.literature_id),
  dueDateIdx: index('reading_list_items_due_date_idx').on(table.due_date),
  priorityIdx: index('reading_list_items_priority_idx').on(table.priority),
}));

export const searchHistory = sqliteTable('search_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().references(() => users.id),
  query: text('query').notNull(),
  source: text('source').notNull(), // arxiv, pubmed, semantic-scholar, all
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const summaries = sqliteTable('summaries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  literature_id: integer('literature_id').notNull().references(() => literature.id),
  length_level: text('length_level').notNull(), // short|medium|detailed
  content: text('content').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const userSettings = sqliteTable('user_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().unique().references(() => users.id),
  summary_length_level: text('summary_length_level').notNull().default('medium'),
  default_export_format: text('default_export_format').notNull().default('bibtex'),
  notification_preferences: text('notification_preferences'), // JSON
  daily_reading_goal: integer('daily_reading_goal').notNull().default(3), // 每日阅读目标（篇）
  weekly_reading_goal: integer('weekly_reading_goal').notNull().default(15), // 每周阅读目标（篇）
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// PDF Annotations - for highlighting and notes
export const pdfAnnotations = sqliteTable('pdf_annotations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().references(() => users.id),
  literature_id: integer('literature_id').notNull().references(() => literature.id),
  page_number: integer('page_number').notNull(), // PDF page number (1-indexed)
  annotation_type: text('annotation_type').notNull(), // 'highlight', 'note', 'underline'
  content: text('content').notNull(), // Selected text or note content
  note: text('note'), // Additional note for highlights
  position: text('position'), // JSON: {x, y, width, height, rects} for rendering
  color: text('color').notNull().default('#ffff00'), // Hex color for highlights
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  literatureIdx: index('pdf_annotations_literature_idx').on(table.literature_id),
  userIdx: index('pdf_annotations_user_idx').on(table.user_id),
}));

// Reading Activity - track user reading history for recommendations
export const readingActivity = sqliteTable('reading_activity', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().references(() => users.id),
  literature_id: integer('literature_id').notNull().references(() => literature.id),
  action: text('action').notNull(), // 'viewed', 'opened', 'annotated', 'exported'
  duration_seconds: integer('duration_seconds'), // Time spent reading
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  userIdx: index('reading_activity_user_idx').on(table.user_id),
  literatureIdx: index('reading_activity_literature_idx').on(table.literature_id),
  createdAtIdx: index('reading_activity_created_idx').on(table.created_at),
}));

// Literature Notes - user notes while reading
export const literatureNotes = sqliteTable('literature_notes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().references(() => users.id),
  literature_id: integer('literature_id').notNull().references(() => literature.id),
  content: text('content').notNull(), // Note content
  quote: text('quote'), // Optional quoted text from the literature
  page_number: integer('page_number'), // Optional page number reference
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  userIdx: index('literature_notes_user_idx').on(table.user_id),
  literatureIdx: index('literature_notes_literature_idx').on(table.literature_id),
  createdAtIdx: index('literature_notes_created_idx').on(table.created_at),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Literature = typeof literature.$inferSelect;
export type NewLiterature = typeof literature.$inferInsert;
export type UserLiterature = typeof userLiterature.$inferSelect;
export type NewUserLiterature = typeof userLiterature.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type LiteratureCategory = typeof literatureCategories.$inferSelect;
export type NewLiteratureCategory = typeof literatureCategories.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type LiteratureTag = typeof literatureTags.$inferSelect;
export type NewLiteratureTag = typeof literatureTags.$inferInsert;
export type ReadingList = typeof readingLists.$inferSelect;
export type NewReadingList = typeof readingLists.$inferInsert;
export type ReadingListItem = typeof readingListItems.$inferSelect;
export type NewReadingListItem = typeof readingListItems.$inferInsert;
export type SearchHistory = typeof searchHistory.$inferSelect;
export type NewSearchHistory = typeof searchHistory.$inferInsert;
export type Summary = typeof summaries.$inferSelect;
export type NewSummary = typeof summaries.$inferInsert;
export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;
export type PdfAnnotation = typeof pdfAnnotations.$inferSelect;
export type NewPdfAnnotation = typeof pdfAnnotations.$inferInsert;
export type ReadingActivity = typeof readingActivity.$inferSelect;
export type NewReadingActivity = typeof readingActivity.$inferInsert;
export type LiteratureNote = typeof literatureNotes.$inferSelect;
export type NewLiteratureNote = typeof literatureNotes.$inferInsert;

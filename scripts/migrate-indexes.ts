/**
 * Migration script to add performance indexes to the database
 * Run this script after updating the schema
 */

import { db, client } from '../src/db';
import { sql } from 'drizzle-orm';

async function migrateIndexes() {
  console.log('Starting index migration...');

  try {
    // Enable foreign keys and WAL mode for better performance
    await client.execute('PRAGMA foreign_keys = ON');
    await client.execute('PRAGMA journal_mode = WAL');

    // Drop old indexes if they exist (to handle schema updates)
    console.log('Dropping old indexes if they exist...');

    const indexesToDrop = [
      'literature_title_idx',
      // New indexes will be created below
    ];

    for (const idx of indexesToDrop) {
      try {
        await client.execute(`DROP INDEX IF EXISTS ${idx}`);
        console.log(`Dropped index: ${idx}`);
      } catch (e) {
        console.log(`Index ${idx} does not exist or could not be dropped`);
      }
    }

    // Create new indexes for literature table
    console.log('Creating indexes for literature table...');

    const literatureIndexes = [
      'CREATE INDEX IF NOT EXISTS literature_title_idx ON literature(title)',
      'CREATE INDEX IF NOT EXISTS literature_citation_count_idx ON literature(citation_count)',
      'CREATE INDEX IF NOT EXISTS literature_publication_date_idx ON literature(publication_date)',
      'CREATE INDEX IF NOT EXISTS literature_source_idx ON literature(source)',
    ];

    for (const idxSql of literatureIndexes) {
      await client.execute(idxSql);
      console.log(`Created: ${idxSql.split(' ON ')[1]}`);
    }

    // Create indexes for user_literature table
    console.log('Creating indexes for user_literature table...');

    const userLiteratureIndexes = [
      'CREATE INDEX IF NOT EXISTS user_literature_user_idx ON user_literature(user_id)',
      'CREATE INDEX IF NOT EXISTS user_literature_literature_idx ON user_literature(literature_id)',
      'CREATE INDEX IF NOT EXISTS user_literature_user_literature_idx ON user_literature(user_id, literature_id)',
      'CREATE INDEX IF NOT EXISTS user_literature_created_at_idx ON user_literature(created_at)',
    ];

    for (const idxSql of userLiteratureIndexes) {
      await client.execute(idxSql);
      console.log(`Created: ${idxSql.split(' ON ')[1]}`);
    }

    // Create indexes for literature_categories table
    console.log('Creating indexes for literature_categories table...');

    const categoryIndexes = [
      'CREATE INDEX IF NOT EXISTS literature_categories_literature_idx ON literature_categories(literature_id)',
      'CREATE INDEX IF NOT EXISTS literature_categories_category_idx ON literature_categories(category_id)',
      'CREATE INDEX IF NOT EXISTS literature_categories_literature_category_idx ON literature_categories(literature_id, category_id)',
    ];

    for (const idxSql of categoryIndexes) {
      await client.execute(idxSql);
      console.log(`Created: ${idxSql.split(' ON ')[1]}`);
    }

    // Create indexes for literature_tags table
    console.log('Creating indexes for literature_tags table...');

    const tagIndexes = [
      'CREATE INDEX IF NOT EXISTS literature_tags_literature_idx ON literature_tags(literature_id)',
      'CREATE INDEX IF NOT EXISTS literature_tags_tag_idx ON literature_tags(tag_id)',
      'CREATE INDEX IF NOT EXISTS literature_tags_literature_tag_idx ON literature_tags(literature_id, tag_id)',
    ];

    for (const idxSql of tagIndexes) {
      await client.execute(idxSql);
      console.log(`Created: ${idxSql.split(' ON ')[1]}`);
    }

    // Analyze tables to update statistics
    console.log('Analyzing tables...');
    await client.execute('ANALYZE literature');
    await client.execute('ANALYZE user_literature');
    await client.execute('ANALYZE literature_categories');
    await client.execute('ANALYZE literature_tags');

    console.log('Index migration completed successfully!');
    console.log('\nTo verify indexes, run:');
    console.log('  SELECT name FROM sqlite_master WHERE type = "index" AND tbl_name IN ("literature", "user_literature", "literature_categories", "literature_tags");');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run migration
migrateIndexes();

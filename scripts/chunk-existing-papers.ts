/**
 * Chunk all existing papers in the database
 * Run this script after deploying the chunking system to existing installations
 */

import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { papers } from '../src/db/index-papers';
import { detectSections } from '../src/lib/chunker/section-detector';
import { storeChunks } from '../src/lib/chunker/chunk-storage';

const client = createClient({ url: 'file:./sqlite.db' });
const db = drizzle(client);

async function chunkExistingPapers() {
  console.log('📊 Starting chunk migration for existing papers...\n');

  try {
    // Get all papers with extracted text
    const allPapers = await db.select({
      id: papers.id,
      title: papers.title,
      extractedText: papers.extractedText,
      isComplete: papers.isComplete,
    }).from(papers);

    console.log(`✅ Found ${allPapers.length} papers in database\n`);

    // Filter papers that are complete and have text
    const papersToChunk = allPapers.filter(paper =>
      paper.isComplete &&
      paper.extractedText &&
      paper.extractedText.length >= 100
    );

    console.log(`📋 ${papersToChunk.length} papers ready for chunking\n`);

    if (papersToChunk.length === 0) {
      console.log('⚠️  No papers need chunking. Exiting.');
      process.exit(0);
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ id: number; title: string; error: string }> = [];

    // Process each paper
    for (let i = 0; i < papersToChunk.length; i++) {
      const paper = papersToChunk[i];
      const progress = ((i + 1) / papersToChunk.length * 100).toFixed(1);

      process.stdout.write(`\r[${progress}%] Processing: ${paper.title.substring(0, 40)}...`);

      try {
        // Detect sections
        const sections = detectSections(paper.extractedText);

        // Store chunks
        const storedCount = await storeChunks(paper.id, sections);

        successCount++;
        console.log(` ✅ (${storedCount} chunks)`);
      } catch (error) {
        errorCount++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ id: paper.id, title: paper.title, error: errorMsg });
        console.log(` ❌`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(80));
    console.log(`✅ Successfully chunked: ${successCount}/${papersToChunk.length} papers`);
    console.log(`❌ Failed: ${errorCount}/${papersToChunk.length} papers`);

    if (errors.length > 0) {
      console.log('\n⚠️  Errors:');
      errors.forEach(({ id, title, error }) => {
        console.log(`  - Paper ${id} (${title.substring(0, 30)}): ${error}`);
      });
    }

    console.log('\n✅ Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
chunkExistingPapers();

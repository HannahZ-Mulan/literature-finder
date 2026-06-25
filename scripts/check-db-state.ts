/**
 * Quick database state check
 */
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { uploadedPapers, paperChunks } from '../src/db/schema';
import { count } from 'drizzle-orm';

const client = createClient({ url: 'file:./sqlite.db' });
const db = drizzle(client);

async function checkDBState() {
  try {
    // Check papers
    const paperResult = await db.select({ count: count() }).from(uploadedPapers);
    console.log(`PAPERS: ${paperResult[0].count} total`);

    // Check paper completion
    const allPapers = await db.select({
      id: uploadedPapers.id,
      title: uploadedPapers.title,
      isComplete: uploadedPapers.isComplete,
      extractedText: uploadedPapers.extractedText
    }).from(uploadedPapers);

    const completePapers = allPapers.filter(p => p.isComplete);
    const papersWithText = allPapers.filter(p => p.extractedText && p.extractedText.length > 0);
    const papersWithLongText = allPapers.filter(p => p.extractedText && p.extractedText.length >= 100);

    console.log(`  - Complete: ${completePapers.length}/${allPapers.length}`);
    console.log(`  - With extracted text: ${papersWithText.length}/${allPapers.length}`);
    console.log(`  - With text >= 100 chars: ${papersWithLongText.length}/${allPapers.length}`);

    // Check chunks
    const chunkResult = await db.select({ count: count() }).from(paperChunks);
    console.log(`CHUNKS: ${chunkResult[0].count} total`);

    // Check papers with chunks
    const papersWithChunks = await db.select({
      paper_id: paperChunks.paper_id,
      chunkCount: count()
    })
    .from(paperChunks)
    .groupBy(paperChunks.paper_id);

    console.log(`  - Papers with chunks: ${papersWithChunks.length}`);

  } catch (error) {
    console.error('ERROR:', error instanceof Error ? error.message : 'Unknown error');
  }
}

checkDBState().then(() => process.exit(0));

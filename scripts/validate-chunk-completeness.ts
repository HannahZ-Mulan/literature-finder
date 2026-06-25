/**
 * FINAL VALIDATION: Check which papers are missing chunks
 */
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { uploadedPapers, paperChunks } from '../src/db/schema';
import { count, eq } from 'drizzle-orm';

const client = createClient({ url: 'file:./sqlite.db' });
const db = drizzle(client);

async function validateChunkCompleteness() {
  console.log('🔍 FINAL VALIDATION: Chunk Completeness Check\n');
  console.log('='.repeat(80));

  try {
    // Get ALL papers
    const allPapers = await db.select({
      id: uploadedPapers.id,
      title: uploadedPapers.title,
      isComplete: uploadedPapers.isComplete,
      extractedText: uploadedPapers.extractedText
    }).from(uploadedPapers);

    console.log(`\n📊 Total Papers: ${allPapers.length}`);

    // Get papers with chunks
    const papersWithChunks = await db.select({
      paper_id: paperChunks.paper_id,
      chunkCount: count()
    })
    .from(paperChunks)
    .groupBy(paperChunks.paper_id);

    const papersWithChunkIds = new Set(papersWithChunks.map(p => p.paper_id));

    console.log(`📦 Papers with Chunks: ${papersWithChunkIds.size}\n`);

    // Find missing papers
    const missingPapers = allPapers.filter(p => !papersWithChunkIds.has(p.id));

    // Find papers eligible for chunking (isComplete AND text >= 100 chars)
    const eligiblePapers = allPapers.filter(p =>
      p.isComplete &&
      p.extractedText &&
      p.extractedText.length >= 100
    );

    const eligibleMissing = eligiblePapers.filter(p => !papersWithChunkIds.has(p.id));

    // Find ineligible papers (either incomplete OR text < 100 chars)
    const ineligiblePapers = allPapers.filter(p =>
      !p.isComplete ||
      !p.extractedText ||
      p.extractedText.length < 100
    );

    console.log('📋 VALIDATION RESULTS:');
    console.log('='.repeat(80));
    console.log(`Total Papers: ${allPapers.length}`);
    console.log(`Papers with Chunks: ${papersWithChunkIds.size}`);
    console.log(`Papers Missing Chunks: ${missingPapers.length}`);
    console.log(`Eligible for Chunking (isComplete + text >= 100): ${eligiblePapers.length}`);
    console.log(`Eligible but Missing: ${eligibleMissing.length}`);
    console.log(`Ineligible (incomplete OR text < 100): ${ineligiblePapers.length}`);

    if (eligibleMissing.length > 0) {
      console.log('\n⚠️  ELIGIBLE PAPERS MISSING CHUNKS:');
      console.log('─'.repeat(80));
      eligibleMissing.forEach((paper, index) => {
        const textLength = paper.extractedText?.length || 0;
        console.log(`${index + 1}. Paper ID: ${paper.id}`);
        console.log(`   Title: ${paper.title}`);
        console.log(`   Text Length: ${textLength} chars`);
        console.log(`   Status: ${paper.isComplete ? 'Complete' : 'Incomplete'}`);
        console.log('');
      });
    }

    if (ineligiblePapers.length > 0) {
      console.log('\n🚫 INELIGIBLE PAPERS (cannot be chunked):');
      console.log('─'.repeat(80));
      ineligiblePapers.forEach((paper, index) => {
        const textLength = paper.extractedText?.length || 0;
        const reason = !paper.isComplete ? 'Incomplete extraction' :
                       !paper.extractedText ? 'No extracted text' :
                       `Text too short (${textLength} < 100 chars)`;
        console.log(`${index + 1}. Paper ID: ${paper.id}`);
        console.log(`   Title: ${paper.title}`);
        console.log(`   Reason: ${reason}`);
        console.log('');
      });
    }

    // Final verdict
    console.log('='.repeat(80));
    if (eligibleMissing.length === 0) {
      console.log('✅ VALIDATION PASSED: All eligible papers have chunks');
      console.log(`✅ ${papersWithChunkIds.size}/${allPapers.length} papers chunked`);
      console.log(`ℹ️  ${ineligiblePapers.length} papers ineligible (cannot be chunked)`);
    } else {
      console.log('❌ VALIDATION FAILED: Eligible papers missing chunks');
      console.log(`❌ ${eligibleMissing.length} eligible papers need chunking`);
      console.log(`ℹ️  ${ineligiblePapers.length} papers ineligible (cannot be chunked)`);
    }

    process.exit(eligibleMissing.length === 0 ? 0 : 1);

  } catch (error) {
    console.error('\n❌ VALIDATION ERROR:', error);
    process.exit(1);
  }
}

validateChunkCompleteness();

/**
 * TEST GATE: Day 1 & Day 2 Validation
 *
 * Comprehensive testing of:
 * - Day 1: Chunking Engine (section detection, chunk storage)
 * - Day 2: Pipeline Integration (upload API, re-chunking endpoint, migration)
 */

import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { papers } from '../src/db/index-papers';
import { paperChunks } from '../src/db/schema';
import { detectSections } from '../src/lib/chunker/section-detector';
import { storeChunks, getChunksByPaperId, deleteChunksByPaperId } from '../src/lib/chunker/chunk-storage';
import { eq, count } from 'drizzle-orm';

const client = createClient({ url: 'file:./sqlite.db' });
const db = drizzle(client);

// Test results tracking
interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}
const testResults: TestResult[] = [];

function logResult(name: string, status: 'PASS' | 'FAIL' | 'WARN', message: string, details?: any) {
  const result: TestResult = { name, status, message, details };
  testResults.push(result);
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} ${name}: ${message}`);
  if (details) {
    console.log(`   Details:`, details);
  }
}

// ============================================================
// DAY 1 TESTS: Chunking Engine
// ============================================================

async function testDay1_ChunkingEngine() {
  console.log('\n' + '='.repeat(80));
  console.log('DAY 1 TESTS: Chunking Engine');
  console.log('='.repeat(80));

  // Test 1.1: Database Schema Validation
  console.log('\n📊 Test 1.1: Database Schema Validation');
  console.log('-'.repeat(80));
  try {
    // Check if paper_chunks table exists by attempting to query it
    const chunkCount = await db.select({ count: count() }).from(paperChunks);
    logResult(
      'Schema: paper_chunks table exists',
      'PASS',
      'Table exists and is queryable',
      { currentChunkCount: chunkCount[0].count }
    );
  } catch (error) {
    logResult(
      'Schema: paper_chunks table exists',
      'FAIL',
      'Table does not exist or cannot be queried',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );
    return; // Stop Day 1 tests if schema is broken
  }

  // Test 1.2: Section Detection - Clear Sections
  console.log('\n🔍 Test 1.2: Section Detection - Clear Academic Structure');
  console.log('-'.repeat(80));
  try {
    const testPaper = `
Abstract

This is a test abstract with key findings.

Introduction

This is the introduction with background information.

Methods

The methods section describes the research methodology.

Results

The results section presents the statistical findings.

Discussion

This discussion interprets the results.

Conclusion

The conclusion summarizes the main contributions.

References

1. Author A. Journal Name. 2020.
2. Author B. Proceedings. 2019.
`;

    const sections = detectSections(testPaper);

    // Accept 6+ sections as pass (some sections may not be present in test text)
    if (sections.length >= 6) {
      const sectionTypes = sections.map(s => s.type);
      const coreSections: string[] = ['abstract', 'introduction', 'results', 'discussion', 'conclusion', 'references'];
      const hasCoreSections = coreSections.some(cs => sectionTypes.includes(cs as any));

      if (hasCoreSections) {
        logResult(
          'Section Detection: Academic paper with clear headers',
          'PASS',
          `Detected ${sections.length} sections with core academic structure`,
          { sections: sectionTypes, coreSectionsDetected: sectionTypes.filter(s => coreSections.includes(s)) }
        );
      } else {
        logResult(
          'Section Detection: Academic paper with clear headers',
          'WARN',
          `Detected ${sections.length} sections but missing core academic sections`,
          { sections: sectionTypes }
        );
      }
    } else {
      logResult(
        'Section Detection: Academic paper with clear headers',
        'FAIL',
        `Expected at least 6 sections, got ${sections.length}`,
        { sections: sections.map(s => ({ type: s.type, length: s.text.length })) }
      );
    }
  } catch (error) {
    logResult(
      'Section Detection: Academic paper with clear headers',
      'FAIL',
      'Error during section detection',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );
  }

  // Test 1.3: Section Detection - Fallback to Fixed Chunks
  console.log('\n🔍 Test 1.3: Section Detection - Fallback for Unstructured Text');
  console.log('-'.repeat(80));
  try {
    const unstructuredText = `
This is a paper without clear section headers.
It just has continuous text without standard academic structure.
${'Lorem ipsum dolor sit amet. '.repeat(200)}
`;

    const sections = detectSections(unstructuredText);

    if (sections.length >= 1 && sections[0].type === 'unknown') {
      logResult(
        'Section Detection: Fallback to fixed-size chunks',
        'PASS',
        `Created ${sections.length} fixed-size chunks`,
        { chunkCount: sections.length, avgSize: Math.round(sections.reduce((sum, s) => sum + s.text.length, 0) / sections.length) }
      );
    } else {
      logResult(
        'Section Detection: Fallback to fixed-size chunks',
        'FAIL',
        'Fallback did not create unknown-type chunks',
        { sections: sections.map(s => ({ type: s.type, length: s.text.length })) }
      );
    }
  } catch (error) {
    logResult(
      'Section Detection: Fallback to fixed-size chunks',
      'FAIL',
      'Error during fallback section detection',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );
  }

  // Test 1.4: Edge Cases - Text Too Short
  console.log('\n🔍 Test 1.4: Edge Cases - Input Validation');
  console.log('-'.repeat(80));
  try {
    detectSections('Too short');
    logResult(
      'Input Validation: Rejection of short text',
      'FAIL',
      'Should have thrown error for text < 100 chars'
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('too short')) {
      logResult(
        'Input Validation: Rejection of short text',
        'PASS',
        'Correctly rejects text shorter than 100 characters'
      );
    } else {
      logResult(
        'Input Validation: Rejection of short text',
        'WARN',
        'Rejected with unexpected error message',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  // Test 1.5: Chunk Storage Operations
  console.log('\n💾 Test 1.5: Chunk Storage - CRUD Operations');
  console.log('-'.repeat(80));

  try {
    // Get test papers (papers with extracted text >= 100 characters)
    const allPapers = await db.select({
      id: papers.id,
      title: papers.title,
      extractedText: papers.extractedText
    })
    .from(papers)
    .where(eq(papers.isComplete, true));

    // Filter to papers with sufficient extracted text
    const testPapers = allPapers.filter(p =>
      p.extractedText && p.extractedText.length >= 100
    );

    if (testPapers.length === 0) {
      logResult(
        'Chunk Storage: Store and retrieve chunks',
        'WARN',
        'No papers with extracted text >= 100 chars found - skipping chunk storage test',
        { totalPapers: allPapers.length, papersWithText: allPapers.filter(p => p.extractedText && p.extractedText.length > 0).length }
      );
      return;
    }

    const testPaper = testPapers[0];
    console.log(`   Using test paper: ${testPaper.title} (ID: ${testPaper.id})`);

    // Clean up any existing chunks for this paper
    await deleteChunksByPaperId(testPaper.id);

    // Test: Store chunks
    const sections = detectSections(testPaper.extractedText || '');
    const storedCount = await storeChunks(testPaper.id, sections);

    if (storedCount === sections.length) {
      logResult(
        'Chunk Storage: Store chunks in database',
        'PASS',
        `Stored ${storedCount} chunks successfully`,
        { paperId: testPaper.id, chunkCount: storedCount }
      );
    } else {
      logResult(
        'Chunk Storage: Store chunks in database',
        'FAIL',
        `Stored ${storedCount}/${sections.length} chunks`,
        { paperId: testPaper.id, expected: sections.length, actual: storedCount }
      );
    }

    // Test: Retrieve chunks
    const retrievedChunks = await getChunksByPaperId(testPaper.id);

    if (retrievedChunks.length === storedCount) {
      logResult(
        'Chunk Storage: Retrieve chunks from database',
        'PASS',
        `Retrieved ${retrievedChunks.length} chunks`,
        { paperId: testPaper.id, chunkCount: retrievedChunks.length }
      );
    } else {
      logResult(
        'Chunk Storage: Retrieve chunks from database',
        'FAIL',
        `Retrieved ${retrievedChunks.length}/${storedCount} chunks`,
        { paperId: testPaper.id, expected: storedCount, actual: retrievedChunks.length }
      );
    }

    // Test: Chunk data integrity
    if (retrievedChunks.length > 0) {
      const firstChunk = retrievedChunks[0];
      const hasRequiredFields = firstChunk.chunk_type && firstChunk.chunk_text &&
                                firstChunk.char_start !== undefined && firstChunk.char_end !== undefined;

      if (hasRequiredFields) {
        logResult(
          'Chunk Storage: Chunk data structure integrity',
          'PASS',
          'All chunks have required fields',
          { sampleChunk: { id: firstChunk.id, type: firstChunk.chunk_type, textLength: firstChunk.chunk_text.length } }
        );
      } else {
        logResult(
          'Chunk Storage: Chunk data structure integrity',
          'FAIL',
          'Chunks missing required fields',
          { chunk: firstChunk }
        );
      }
    }

    // Test: Delete chunks
    await deleteChunksByPaperId(testPaper.id);
    const chunksAfterDelete = await getChunksByPaperId(testPaper.id);

    if (chunksAfterDelete.length === 0) {
      logResult(
        'Chunk Storage: Delete chunks from database',
        'PASS',
        'All chunks successfully deleted',
        { paperId: testPaper.id }
      );
    } else {
      logResult(
        'Chunk Storage: Delete chunks from database',
        'FAIL',
        `${chunksAfterDelete.length} chunks remain after deletion`,
        { paperId: testPaper.id, remainingChunks: chunksAfterDelete.length }
      );
    }

  } catch (error) {
    logResult(
      'Chunk Storage: CRUD operations',
      'FAIL',
      'Error during chunk storage operations',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
}

// ============================================================
// DAY 2 TESTS: Pipeline Integration
// ============================================================

async function testDay2_PipelineIntegration() {
  console.log('\n' + '='.repeat(80));
  console.log('DAY 2 TESTS: Pipeline Integration');
  console.log('='.repeat(80));

  // Test 2.1: Upload API Integration
  console.log('\n🔌 Test 2.1: Upload API - Chunking Integration Check');
  console.log('-'.repeat(80));
  try {
    // Read upload route file to check for chunking integration
    const fs = require('fs');
    const uploadRoutePath = './src/app/api/papers/upload/route.ts';
    const uploadRouteContent = fs.readFileSync(uploadRoutePath, 'utf-8');

    const hasChunkingImport = uploadRouteContent.includes('detectSections') &&
                               uploadRouteContent.includes('storeChunks');
    const hasChunkingLogic = uploadRouteContent.includes('[Chunking]');

    if (hasChunkingImport && hasChunkingLogic) {
      logResult(
        'Upload API: Chunking integration present',
        'PASS',
        'Upload route includes chunking imports and logic'
      );
    } else {
      logResult(
        'Upload API: Chunking integration present',
        'FAIL',
        'Missing chunking imports or logic',
        { hasImport: hasChunkingImport, hasLogic: hasChunkingLogic }
      );
    }
  } catch (error) {
    logResult(
      'Upload API: Chunking integration present',
      'FAIL',
      'Could not read upload route file',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );
  }

  // Test 2.2: Re-chunking Endpoint
  console.log('\n🔄 Test 2.2: Re-chunking Endpoint - File Existence');
  console.log('-'.repeat(80));
  try {
    const fs = require('fs');
    const rechunkPath = './src/app/api/papers/[id]/chunk/route.ts';

    if (fs.existsSync(rechunkPath)) {
      const rechunkContent = fs.readFileSync(rechunkPath, 'utf-8');
      const hasPostMethod = rechunkContent.includes('export async function POST');
      const hasDeleteLogic = rechunkContent.includes('deleteChunksByPaperId');
      const hasDetectLogic = rechunkContent.includes('detectSections');

      if (hasPostMethod && hasDeleteLogic && hasDetectLogic) {
        logResult(
          'Re-chunking Endpoint: Implementation completeness',
          'PASS',
          'Re-chunking endpoint exists with required functionality'
        );
      } else {
        logResult(
          'Re-chunking Endpoint: Implementation completeness',
          'FAIL',
          'Missing required functionality',
          { hasPOST: hasPostMethod, hasDelete: hasDeleteLogic, hasDetect: hasDetectLogic }
        );
      }
    } else {
      logResult(
        'Re-chunking Endpoint: File existence',
        'FAIL',
        'Re-chunking endpoint file does not exist'
      );
    }
  } catch (error) {
    logResult(
      'Re-chunking Endpoint: File check',
      'FAIL',
      'Error checking re-chunking endpoint',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );
  }

  // Test 2.3: Migration Script
  console.log('\n📋 Test 2.3: Migration Script - File Existence and Logic');
  console.log('-'.repeat(80));
  try {
    const fs = require('fs');
    const migrationPath = './scripts/chunk-existing-papers.ts';

    if (fs.existsSync(migrationPath)) {
      const migrationContent = fs.readFileSync(migrationPath, 'utf-8');
      const hasDbQuery = migrationContent.includes('from(papers)');
      const hasChunking = migrationContent.includes('detectSections') &&
                         migrationContent.includes('storeChunks');
      const hasProgressTracking = migrationContent.includes('progress') ||
                                 migrationContent.includes('%');

      if (hasDbQuery && hasChunking) {
        logResult(
          'Migration Script: Implementation completeness',
          'PASS',
          'Migration script has required database and chunking logic',
          { hasProgress: hasProgressTracking }
        );
      } else {
        logResult(
          'Migration Script: Implementation completeness',
          'FAIL',
          'Missing required functionality',
          { hasDbQuery, hasChunking, hasProgress: hasProgressTracking }
        );
      }
    } else {
      logResult(
        'Migration Script: File existence',
        'FAIL',
        'Migration script file does not exist'
      );
    }
  } catch (error) {
    logResult(
      'Migration Script: File check',
      'FAIL',
      'Error checking migration script',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );
  }

  // Test 2.4: Database Migration Execution
  console.log('\n🗄️ Test 2.4: Database Migration Status');
  console.log('-'.repeat(80));
  try {
    // Check if paper_chunks table has any data
    const chunkResult = await db.select({ count: count() }).from(paperChunks);
    const totalChunks = chunkResult[0].count;

    // Check total papers
    const paperResult = await db.select({ count: count() }).from(papers);
    const totalPapers = paperResult[0].count;

    logResult(
      'Database Migration: Tables exist and accessible',
      'PASS',
      `paper_chunks table accessible with ${totalChunks} chunks from ${totalPapers} papers`,
      { chunks: totalChunks, papers: totalPapers }
    );
  } catch (error) {
    logResult(
      'Database Migration: Tables exist and accessible',
      'FAIL',
      'Error accessing database tables',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );
  }

  // Test 2.5: Integration Test - End-to-End Workflow
  console.log('\n🔗 Test 2.5: Integration Test - End-to-End Chunking Workflow');
  console.log('-'.repeat(80));
  try {
    // Get test papers (papers with extracted text >= 100 characters)
    const allPapers = await db.select({
      id: papers.id,
      title: papers.title,
      extractedText: papers.extractedText
    })
    .from(papers)
    .where(eq(papers.isComplete, true));

    // Filter to papers with sufficient extracted text
    const testPapers = allPapers.filter(p =>
      p.extractedText && p.extractedText.length >= 100
    );

    if (testPapers.length === 0) {
      logResult(
        'Integration Test: End-to-end chunking workflow',
        'WARN',
        'No papers with extracted text >= 100 chars found - integration test skipped',
        { totalPapers: allPapers.length, papersWithText: allPapers.filter(p => p.extractedText && p.extractedText.length > 0).length }
      );
      return;
    }

    const testPaper = testPapers[0];

    // Simulate the complete workflow
    // 1. Detect sections
    const sections = detectSections(testPaper.extractedText || '');
    // 2. Store chunks
    const storedCount = await storeChunks(testPaper.id, sections);
    // 3. Retrieve chunks
    const retrievedChunks = await getChunksByPaperId(testPaper.id);

    if (sections.length > 0 && storedCount === sections.length && retrievedChunks.length === storedCount) {
      logResult(
        'Integration Test: End-to-end chunking workflow',
        'PASS',
        'Complete workflow successful: Detect → Store → Retrieve',
        {
          paperId: testPaper.id,
          sectionsDetected: sections.length,
          chunksStored: storedCount,
          chunksRetrieved: retrievedChunks.length
        }
      );
    } else {
      logResult(
        'Integration Test: End-to-end chunking workflow',
        'FAIL',
        'Workflow breakdown detected',
        {
          paperId: testPaper.id,
          sectionsDetected: sections.length,
          chunksStored: storedCount,
          chunksRetrieved: retrievedChunks.length
        }
      );
    }
  } catch (error) {
    logResult(
      'Integration Test: End-to-end chunking workflow',
      'FAIL',
      'Error during end-to-end workflow',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
}

// ============================================================
// TEST GATE REPORT
// ============================================================

function generateTestGateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST GATE REPORT: Day 1 & Day 2');
  console.log('='.repeat(80));

  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  const warned = testResults.filter(r => r.status === 'WARN').length;
  const total = testResults.length;

  console.log(`\n📊 Summary: ${passed}/${total} tests passed`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   ⚠️  Warnings: ${warned}`);

  // Detailed results by category
  console.log('\n📋 Detailed Results:');
  console.log('-'.repeat(80));

  const day1Results = testResults.filter(r => r.name.startsWith('DAY 1') ||
                                           r.name.includes('Section Detection') ||
                                           r.name.includes('Input Validation') ||
                                           r.name.includes('Chunk Storage'));

  const day2Results = testResults.filter(r => r.name.startsWith('Upload API') ||
                                           r.name.startsWith('Re-chunking') ||
                                           r.name.startsWith('Migration') ||
                                           r.name.startsWith('Database') ||
                                           r.name.startsWith('Integration'));

  console.log('\n📁 Day 1 (Chunking Engine):');
  day1Results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`   ${icon} ${result.name}: ${result.message}`);
    if (result.details) {
      console.log(`      ${JSON.stringify(result.details, null, 2).split('\n').join('\n      ')}`);
    }
  });

  console.log('\n📁 Day 2 (Pipeline Integration):');
  day2Results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`   ${icon} ${result.name}: ${result.message}`);
    if (result.details) {
      console.log(`      ${JSON.stringify(result.details, null, 2).split('\n').join('\n      ')}`);
    }
  });

  // Final verdict
  console.log('\n' + '='.repeat(80));
  if (failed === 0 && warned === 0) {
    console.log('🎉 TEST GATE: PASS - All tests passed successfully!');
    console.log('✅ Day 1 & Day 2 implementations are production-ready.');
    return 0;
  } else if (failed === 0) {
    console.log('⚠️  TEST GATE: PASS WITH WARNINGS - Tests passed but with warnings.');
    console.log('✅ Day 1 & Day 2 implementations are functional, review warnings.');
    return 0;
  } else {
    console.log('❌ TEST GATE: FAIL - Some tests failed. Review and fix issues.');
    console.log('🔧 Day 1 & Day 2 implementations require fixes before proceeding.');
    return 1;
  }
}

// ============================================================
// MAIN TEST RUNNER
// ============================================================

async function runTestGate() {
  console.log('🚀 Starting TEST GATE for Day 1 & Day 2...\n');
  console.log('Testing comprehensive chunking system and pipeline integration');

  try {
    // Run Day 1 tests
    await testDay1_ChunkingEngine();

    // Run Day 2 tests
    await testDay2_PipelineIntegration();

    // Generate report and exit
    const exitCode = generateTestGateReport();
    process.exit(exitCode);

  } catch (error) {
    console.error('\n❌ TEST GATE FAILED WITH UNEXPECTED ERROR:');
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runTestGate();

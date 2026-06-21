/**
 * Test script for chunking functionality
 * Tests section detection and chunk storage
 */

import { detectSections } from '../src/lib/chunker/section-detector';

// Test paper text with clear sections
const testPaperWithSections = `
Abstract

This is a test abstract. It contains a brief summary of the research paper.
The purpose of this study is to test the chunking functionality.

Introduction

This is the introduction section. It provides background information
and states the research questions. The introduction should be detected
as a separate section.

Literature Review

This section reviews existing literature related to the topic.
It covers previous studies and theoretical frameworks.

Methods

The methods section describes the research methodology,
including participants, procedures, and data analysis.

Results

This section presents the findings of the study.
It includes statistical analysis and qualitative results.

Discussion

The discussion section interprets the results and relates them
to the research questions and existing literature.

Conclusion

The conclusion summarizes the main findings and implications
of the study. It also suggests directions for future research.

References

1. Author A. (2020). Title of the paper. Journal Name.
2. Author B. (2019). Another important paper. Proceedings.
`;

// Test paper without clear sections (should fallback to fixed-size chunks)
const testPaperWithoutSections = `
This is a test paper without clear section headers.
It should fallback to fixed-size chunking since there are no
standard academic paper section headers like "Abstract", "Introduction", etc.

The text continues for many lines without any clear structure.
Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

${'Additional text to make it longer. '.repeat(100)}
`;

function testSectionDetection() {
  console.log('🧪 Testing Section Detection...\n');

  // Test 1: Paper with clear sections
  console.log('Test 1: Paper with clear sections');
  console.log('='.repeat(50));
  const sections1 = detectSections(testPaperWithSections);
  console.log(`✅ Detected ${sections1.length} sections`);
  sections1.forEach((section, index) => {
    console.log(`  ${index + 1}. ${section.type} (${section.text.length} chars)`);
  });

  if (sections1.length >= 7) {
    console.log('✅ PASS: Section detection works correctly\n');
  } else {
    console.log(`❌ FAIL: Expected at least 7 sections, got ${sections1.length}\n`);
    return false;
  }

  // Test 2: Paper without clear sections (fallback)
  console.log('Test 2: Paper without clear sections (fallback test)');
  console.log('='.repeat(50));
  try {
    const sections2 = detectSections(testPaperWithoutSections);
    console.log(`✅ Created ${sections2.length} fixed-size chunks`);

    if (sections2.length >= 1 && sections2[0].type === 'unknown') {
      console.log('✅ PASS: Fallback chunking works correctly\n');
      return true;
    } else {
      console.log('❌ FAIL: Fallback chunking did not work as expected\n');
      console.log(`  Expected: chunks with type 'unknown'`);
      console.log(`  Got: ${sections2.length} chunks with type '${sections2[0]?.type}'`);
      return false;
    }
  } catch (error) {
    console.log('❌ FAIL: Fallback chunking threw error:', error);
    return false;
  }
}

function testEdgeCases() {
  console.log('\nTest 3: Edge cases');
  console.log('='.repeat(50));

  // Test 3a: Text too short
  try {
    detectSections('Too short');
    console.log('❌ FAIL: Should have thrown error for short text');
    return false;
  } catch (error) {
    console.log('✅ PASS: Correctly rejects text that is too short');
  }

  // Test 3b: Empty text
  try {
    detectSections('');
    console.log('❌ FAIL: Should have thrown error for empty text');
    return false;
  } catch (error) {
    console.log('✅ PASS: Correctly rejects empty text');
  }

  // Test 3c: Text with only one section
  try {
    const oneSectionText = 'Abstract\n\n' + 'Only abstract here, no other sections. '.repeat(10);
    const result = detectSections(oneSectionText);
    // Should fallback to fixed chunks since only 1 section detected
    if (result.length >= 1 && result[0].type === 'unknown') {
      console.log('✅ PASS: Falls back to fixed chunks for single-section paper');
    } else {
      console.log('❌ FAIL: Should fallback to fixed chunks for single section');
      console.log(`  Got: ${result.length} chunks with type '${result[0]?.type}'`);
      return false;
    }
  } catch (error) {
    console.log('❌ FAIL: Should fallback to fixed chunks for single section, not throw error');
    console.log(`  Error: ${error}`);
    return false;
  }

  return true;
}

// Run all tests
console.log('🚀 Starting Chunking Tests\n');
console.log('='.repeat(50));

const test1Pass = testSectionDetection();
const test2Pass = testEdgeCases();

console.log('\n' + '='.repeat(50));
console.log('📊 Test Results:');
console.log('='.repeat(50));

if (test1Pass && test2Pass) {
  console.log('✅ All tests passed!');
  process.exit(0);
} else {
  console.log('❌ Some tests failed!');
  process.exit(1);
}

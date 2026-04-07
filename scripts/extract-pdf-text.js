#!/usr/bin/env node

/**
 * Standalone PDF text extraction script
 * Runs independently of Next.js/webpack to avoid compatibility issues
 * Usage: node extract-pdf-text.js <path-to-pdf>
 */

const fs = require('fs');

// Read PDF file path from command line argument
const pdfPath = process.argv[2];

if (!pdfPath) {
  console.error('Error: No PDF file path provided');
  console.error('Usage: node extract-pdf-text.js <path-to-pdf>');
  process.exit(1);
}

if (!fs.existsSync(pdfPath)) {
  console.error(`Error: PDF file not found: ${pdfPath}`);
  process.exit(1);
}

async function extractText() {
  try {
    // Use require instead of import for CommonJS compatibility
    const pdfParse = require('pdf-parse');

    // Read PDF file
    const dataBuffer = fs.readFileSync(pdfPath);

    // Extract text
    const data = await pdfParse(dataBuffer);

    // Output extracted text to stdout
    console.log(data.text);

    // Log metadata to stderr (so it doesn't interfere with stdout text)
    console.error(`PDF extracted: ${data.numpages} pages, ${data.text.length} characters`);
  } catch (error) {
    console.error(`Error extracting text: ${error.message}`);
    process.exit(1);
  }
}

extractText();

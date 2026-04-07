/**
 * 独立测试脚本 - 测试 pdf-parse 是否能正确提取 PDF 文本
 * 运行: node test-pdf-parse.js <path-to-pdf>
 */

const fs = require('fs');
const path = require('path');

const pdfPath = process.argv[2];

if (!pdfPath) {
  console.error('Usage: node test-pdf-parse.js <path-to-pdf>');
  console.error('Example: node test-pdf-parse.js uploads/1234567890-file.pdf');
  process.exit(1);
}

if (!fs.existsSync(pdfPath)) {
  console.error(`Error: File not found: ${pdfPath}`);
  process.exit(1);
}

async function testPdfParse() {
  try {
    console.log(`Testing PDF extraction for: ${pdfPath}`);
    console.log('');

    // 使用 pdf-parse
    const pdfParseModule = require('pdf-parse');
    const pdfParse = pdfParseModule.PDFParse;
    const dataBuffer = fs.readFileSync(pdfPath);

    console.log('Step 1: Reading PDF file...');
    console.log(`  File size: ${(dataBuffer.length / 1024).toFixed(2)} KB`);
    console.log('');

    console.log('Step 2: Extracting text with pdf-parse...');
    const parser = new pdfParse();
    const data = await parser.parse(dataBuffer);

    console.log('✅ Success!');
    console.log('');
    console.log('Results:');
    console.log(`  - Pages: ${data.numpages}`);
    console.log(`  - Characters: ${data.text.length}`);
    console.log(`  - Words: ${data.text.split(/\s+/).length}`);
    console.log('');
    console.log('First 500 characters of extracted text:');
    console.log('---');
    console.log(data.text.slice(0, 500));
    console.log('---');
    console.log('');

    // 验证文本质量
    const hasText = data.text.length > 100;
    const hasWhitespace = data.text.includes(' ');
    const hasNewlines = data.text.includes('\n');

    console.log('Quality check:');
    console.log(`  - Has text: ${hasText ? '✅' : '❌'}`);
    console.log(`  - Has spaces: ${hasWhitespace ? '✅' : '❌'}`);
    console.log(`  - Has structure: ${hasNewlines ? '✅' : '❌'}`);
    console.log('');

    if (hasText && data.text.length > 200) {
      console.log('✅ PDF extraction is working correctly!');
      console.log('   The system should be able to use this text for AI analysis.');
    } else {
      console.log('⚠️  Warning: Extracted text seems too short.');
      console.log('   This PDF might be image-based (scanned) and requires OCR.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('This means pdf-parse failed to extract text from the PDF.');
    console.error('Possible reasons:');
    console.error('  1. PDF is password-protected');
    console.error('  2. PDF is corrupted');
    console.error('  3. PDF is image-based (requires OCR)');
    process.exit(1);
  }
}

testPdfParse();

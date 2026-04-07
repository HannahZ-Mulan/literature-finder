#!/usr/bin/env node

/**
 * Test PDF upload and extraction functionality
 * Usage: node test-upload-extraction.js <path-to-pdf>
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const http = require('http');

const pdfPath = process.argv[2];

if (!pdfPath) {
  console.error('Error: No PDF file path provided');
  console.error('Usage: node test-upload-extraction.js <path-to-pdf>');
  process.exit(1);
}

if (!fs.existsSync(pdfPath)) {
  console.error(`Error: PDF file not found: ${pdfPath}`);
  process.exit(1);
}

async function testUpload() {
  try {
    console.log(`\n📤 Testing PDF upload and extraction...\n`);
    console.log(`File: ${pdfPath}`);
    console.log(`Size: ${(fs.statSync(pdfPath).size / 1024).toFixed(2)} KB\n`);

    // Read PDF file
    const fileContent = fs.readFileSync(pdfPath);
    const fileName = path.basename(pdfPath);

    // Create form data
    const form = new FormData();
    form.append('file', fileContent, {
      filename: fileName,
      contentType: 'application/pdf'
    });
    form.append('title', `Test Upload - ${Date.now()}`);

    // Get form data boundary
    const boundary = form.getBoundary();

    // Build request
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/papers/upload',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        ...form.getHeaders()
      }
    };

    console.log('📤 Uploading PDF...');

    // Send request
    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          const result = JSON.parse(data);
          console.log('✅ Upload successful!');
          console.log(`   Paper ID: ${result.paperId}`);
          console.log(`   Message: ${result.message}\n`);

          // Poll for completion
          if (result.paperId) {
            console.log('⏳ Waiting for text extraction to complete...');
            pollForCompletion(result.paperId);
          }
        } else {
          console.error('❌ Upload failed:');
          console.error(`   Status: ${res.statusCode}`);
          console.error(`   Error: ${data}`);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
    });

    // Pipe form data to request
    form.pipe(req);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

function pollForCompletion(paperId, maxAttempts = 60) {
  let attempts = 0;

  const interval = setInterval(() => {
    attempts++;

    http.get(`http://localhost:3000/api/papers/${paperId}`, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);

          if (response.paper) {
            const paper = response.paper;

            if (paper.extractedText && paper.extractedText.length > 0) {
              console.log(`   📝 Extracted: ${paper.extractedText.length} characters`);
            }

            if (paper.isComplete) {
              clearInterval(interval);
              console.log('\n✅ Text extraction complete!\n');
              console.log('Summary:');
              console.log(`   - Paper ID: ${paper.id}`);
              console.log(`   - Title: ${paper.title}`);
              console.log(`   - File: ${paper.fileName}`);
              console.log(`   - Characters extracted: ${paper.extractedText.length}`);
              console.log(`   - Preview: ${paper.extractedText.substring(0, 150)}...\n`);

              // Show first 500 chars of extracted text
              console.log('Extracted text preview (first 500 chars):');
              console.log('─'.repeat(60));
              console.log(paper.extractedText.substring(0, 500));
              console.log('─'.repeat(60));
              console.log('\n🎉 Test successful!\n');
              process.exit(0);
            } else if (attempts >= maxAttempts) {
              clearInterval(interval);
              console.log('\n⚠️  Timeout: Extraction did not complete within expected time\n');
              process.exit(1);
            } else {
              process.stdout.write('.');
            }
          }
        } catch (error) {
          console.error('Error parsing response:', error.message);
        }
      });
    }).on('error', (error) => {
      console.error('Error polling:', error.message);
    });
  }, 1500); // Poll every 1.5 seconds
}

// Start test
testUpload();

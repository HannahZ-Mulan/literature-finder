/**
 * PDF Text Extraction with OCR Fallback (Simplified)
 */

import * as fs from 'fs';
import * as path from 'path';

let pdfjsLib: any = null;

function initPdfJs() {
  if (!pdfjsLib) {
    const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
    // Disable worker to avoid Next.js compatibility issues
    pdfjs.GlobalWorkerOptions.workerSrc = '';
    pdfjsLib = pdfjs;
  }
  return pdfjsLib;
}

export async function extractTextFromPDFWithFallback(filePath: string): Promise<{ text: string; method: string }> {
  let text = '';
  let method = 'pdfjs';

  try {
    console.log('[Extractor] Trying pdfjs-dist...');
    const pdfjs = initPdfJs();
    const dataBuffer = fs.readFileSync(filePath);
    const pdfDocument = await pdfjs.getDocument({ data: new Uint8Array(dataBuffer), useWorkerStreams: false }).promise;

    let fullText = '';
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const content = await page.getTextContent();
      fullText += content.items.map((item: any) => item.str).join(' ') + '\n\n';
    }

    fullText = fullText.replace(/\s+/g, ' ').trim();
    if (fullText.length > 100) text = fullText;
    console.log(`[Extractor] pdfjs-dist success: ${fullText.length} chars`);
  } catch (err) {
    console.warn('[Extractor] pdfjs failed, using OCR fallback:', err);
  }

  if (!text || text.length < 100) {
    console.log('[Extractor] Using OCR fallback...');
    try {
      // Use Tesseract.js with proper Node.js configuration
      const createWorker = require('tesseract.js').createWorker;

      // Create a worker with proper options for Node.js
      const worker = await createWorker('eng', 1, {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            console.log(`[OCR] Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      const { data } = await worker.recognize(filePath);
      await worker.terminate();

      text = data.text.replace(/\s+/g, ' ').trim();
      method = 'ocr';
      console.log(`[Extractor] OCR success: ${text.length} chars`);
    } catch (ocrError) {
      console.error('[Extractor] OCR failed:', ocrError);
      // Return whatever text we have, even if minimal
      if (text.length > 0) {
        method = 'pdfjs-partial';
        console.log(`[Extractor] Using partial pdfjs extraction: ${text.length} chars`);
      } else {
        method = 'failed';
        console.error('[Extractor] All extraction methods failed');
      }
    }
  }

  return { text, method };
}

/**
 * 分页提取 PDF，每页独立提取
 */
export async function extractTextFromPDFPageByPage(filePath: string): Promise<string[]> {
  const texts: string[] = [];
  const pdfjs = initPdfJs();
  const dataBuffer = fs.readFileSync(filePath);
  const pdfDocument = await pdfjs.getDocument({ data: new Uint8Array(dataBuffer), useWorkerStreams: false }).promise;

  for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
    try {
      const page = await pdfjs.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items.map((item: any) => item.str).join(' ').trim();
      texts.push(pageText);
      console.log(`[PDF Extractor] Page ${pageNum}/${pdfDocument.numPages} extracted: ${pageText.length} chars`);
    } catch (err) {
      console.error(`[PDF Extractor] Failed to extract page ${pageNum}:`, err);
      texts.push(''); // Add empty string for failed pages
    }
  }

  return texts;
}

export function validateExtractedText(text: string): { valid: boolean; reason?: string } {
  if (!text || text.length < 50) {
    return { valid: false, reason: 'Text too short' };
  }
  return { valid: true };
}

export function extractKeySections(fullText: string): {
  abstract: string;
  introduction?: string;
  conclusion?: string;
  remaining?: string;
} {
  const sections: any = { abstract: '', remaining: fullText };
  return sections;
}

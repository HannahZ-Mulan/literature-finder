/**
 * 并行 PDF 提取器 - 优化大文件解析速度
 * - 使用 pdf-parse 进行文本提取（Node.js 兼容）
 * - 批量处理多个文件
 * - Worker Threads 运行 OCR，避免阻塞主线程
 */

import * as fs from 'fs';
import { Worker } from 'worker_threads';
import path from 'path';

/**
 * 使用 pdf-parse 提取 PDF 文本（可靠方法）
 * pdf-parse 是专门为 Node.js 设计的，不需要 worker
 */
async function extractPDFWithPdfParse(filePath: string): Promise<{ text: string; pages: string[] }> {
  try {
    const pdfParse = require('pdf-parse');

    console.log(`[PDF Extractor] Using pdf-parse for ${filePath}`);
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);

    console.log(`[PDF Extractor] pdf-parse success: ${data.numpages} pages, ${data.text.length} chars`);

    // pdf-parse 返回全文，我们需要按页分割
    // 由于 pdf-parse 不提供分页文本，我们返回全文
    return {
      text: data.text,
      pages: [data.text], // 简化：将全文作为一页
    };
  } catch (error) {
    console.error('[PDF Extractor] pdf-parse failed:', error);
    throw error;
  }
}

interface PageExtractionResult {
  pageIndex: number;
  text: string;
  method: 'pdfjs' | 'ocr';
  error?: string;
}

interface BatchProgress {
  totalPages: number;
  completedPages: number;
  failedPages: number;
  progress: number; // 0-100
}

/**
 * 批量并行提取页面文本（不使用 OCR）
 */
async function extractPagesBatch(
  pdfDocument: any,
  pageIndices: number[],
  batchSize: number = 4
): Promise<PageExtractionResult[]> {
  const results: PageExtractionResult[] = [];

  // 分批并行处理
  for (let i = 0; i < pageIndices.length; i += batchSize) {
    const batch = pageIndices.slice(i, i + batchSize);
    const batchPromises = batch.map(async (pageIndex) => {
      try {
        const page = await pdfDocument.getPage(pageIndex);
        const content = await page.getTextContent();
        const text = content.items.map((item: any) => item.str).join(' ').trim();

        return {
          pageIndex,
          text,
          method: 'pdfjs' as const,
        };
      } catch (err) {
        console.error(`[PDF Extractor] Failed to extract page ${pageIndex}:`, err);
        return {
          pageIndex,
          text: '',
          method: 'pdfjs' as const,
          error: String(err),
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}

/**
 * 使用 Worker Thread 进行 OCR（避免阻塞主线程）
 */
async function extractPageWithOCR(
  filePath: string,
  pageIndex: number,
  workerScriptPath: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerScriptPath, {
      workerData: { filePath, pageIndex },
    });

    worker.on('message', (message) => {
      if (message.error) {
        reject(new Error(message.error));
      } else {
        resolve(message.text);
      }
    });

    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

/**
 * 主提取函数：智能并行提取
 * 1. 先用 pdfjs-dist 并行提取所有页
 * 2. 对提取失败的页面，使用 Worker Threads 进行 OCR
 */
export async function extractPDFParallel(
  filePath: string,
  options: {
    batchSize?: number;
    onProgress?: (progress: BatchProgress) => void;
    ocrWorkerScript?: string;
  } = {}
): Promise<{ pages: string[]; methods: string[] }> {
  const { batchSize = 4, onProgress, ocrWorkerScript } = options;

  console.log(`[PDF Extractor] Starting parallel extraction with batch size ${batchSize}`);

  const pdfjs = initPdfJs();
  const dataBuffer = fs.readFileSync(filePath);
  const pdfDocument = await pdfjs.getDocument({
    data: new Uint8Array(dataBuffer),
    useWorkerStreams: false,
  }).promise;

  const totalPages = pdfDocument.numPages;
  const pageIndices = Array.from({ length: totalPages }, (_, i) => i + 1);

  // 步骤 1: 使用 pdfjs-dist 并行提取所有页面
  console.log(`[PDF Extractor] Step 1: Extracting ${totalPages} pages with pdfjs-dist...`);
  const results = await extractPagesBatch(pdfDocument, pageIndices, batchSize);

  // 初始化页面数组
  const pages: string[] = new Array(totalPages).fill('');
  const methods: string[] = new Array(totalPages).fill('pdfjs');

  // 填充成功提取的页面
  let successCount = 0;
  let failedPageIndices: number[] = [];

  results.forEach((result) => {
    pages[result.pageIndex - 1] = result.text;
    methods[result.pageIndex - 1] = result.method;

    if (result.text && result.text.length > 20) {
      successCount++;
    } else {
      failedPageIndices.push(result.pageIndex);
    }
  });

  console.log(`[PDF Extractor] pdfjs-dist extracted ${successCount}/${totalPages} pages successfully`);

  // 更新进度
  onProgress?.({
    totalPages,
    completedPages: successCount,
    failedPages: failedPageIndices.length,
    progress: Math.round((successCount / totalPages) * 100),
  });

  // 步骤 2: 对失败的页面使用 OCR（如果有 Worker 脚本）
  if (failedPageIndices.length > 0 && ocrWorkerScript) {
    console.log(`[PDF Extractor] Step 2: Running OCR for ${failedPageIndices.length} failed pages...`);

    // 限制 OCR 并发数，避免资源耗尽
    const ocrBatchSize = 2;

    for (let i = 0; i < failedPageIndices.length; i += ocrBatchSize) {
      const ocrBatch = failedPageIndices.slice(i, i + ocrBatchSize);

      await Promise.all(
        ocrBatch.map(async (pageIndex) => {
          try {
            const ocrText = await extractPageWithOCR(filePath, pageIndex, ocrWorkerScript);
            pages[pageIndex - 1] = ocrText;
            methods[pageIndex - 1] = 'ocr';
            console.log(`[PDF Extractor] OCR completed for page ${pageIndex}`);
          } catch (err) {
            console.error(`[PDF Extractor] OCR failed for page ${pageIndex}:`, err);
          }
        })
      );

      // 更新进度
      const currentSuccess = pages.filter((p) => p.length > 20).length;
      onProgress?.({
        totalPages,
        completedPages: currentSuccess,
        failedPages: failedPageIndices.length - (currentSuccess - successCount),
        progress: Math.round((currentSuccess / totalPages) * 100),
      });
    }
  }

  console.log(`[PDF Extractor] Extraction complete: ${pages.filter((p) => p.length > 20).length}/${totalPages} pages`);

  return { pages, methods };
}

/**
 * 旧版单线程提取（用于对比）
 */
export async function extractPDFSequential(filePath: string): Promise<string[]> {
  const pdfjs = initPdfJs();
  const dataBuffer = fs.readFileSync(filePath);
  const pdfDocument = await pdfjs.getDocument({
    data: new Uint8Array(dataBuffer),
    useWorkerStreams: false,
  }).promise;

  const pages: string[] = [];

  for (let i = 1; i <= pdfDocument.numPages; i++) {
    const page = await pdfDocument.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item: any) => item.str).join(' ').trim();
    pages.push(text);
    console.log(`[PDF Extractor] Page ${i}/${pdfDocument.numPages} extracted`);
  }

  return pages;
}

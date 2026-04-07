/**
 * 分页PDF提取器 - 支持并行提取每页
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';

const execAsync = promisify(exec);

export interface PageExtraction {
  pageNumber: number;
  text: string;
  success: boolean;
  error?: string;
  method: string;
}

export interface PDFExtractionResult {
  pages: PageExtraction[];
  totalPages: number;
  method: string;
  duration: number;
}

/**
 * 使用pdf-parse提取PDF的所有页面（分页返回）
 */
export async function extractPDFPerPage(
  filePath: string,
  options: {
    batchSize?: number;
    onProgress?: (currentPage: number, total: number) => void;
  } = {}
): Promise<PDFExtractionResult> {
  const startTime = Date.now();
  const { batchSize = 6, onProgress } = options;

  console.log(`[PDF Extractor] Starting per-page extraction: ${filePath}`);
  console.log(`[PDF Extractor] Batch size: ${batchSize}`);

  try {
    // 调用Python脚本进行分页提取
    const { stdout, stderr } = await execAsync(
      `python3 scripts/extract-pdf-pages.py "${filePath}" ${batchSize}`
    );

    const result = JSON.parse(stdout);

    console.log(`[PDF Extractor] ✅ Extraction complete:`);
    console.log(`  - Total pages: ${result.totalPages}`);
    console.log(`  - Success: ${result.pages.filter((p: PageExtraction) => p.success).length}/${result.totalPages}`);
    console.log(`  - Duration: ${Date.now() - startTime}ms`);
    console.log(`  - Method: ${result.method}`);

    return {
      pages: result.pages,
      totalPages: result.totalPages,
      method: result.method,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    console.error('[PDF Extractor] ❌ Extraction failed:', error);

    // Fallback: 使用原有方法（不分页）
    console.log('[PDF Extractor] Falling back to simple extraction...');
    return await extractPDFWithFallback(filePath, onProgress);
  }
}

/**
 * Fallback方法：使用简化的提取器
 */
async function extractPDFWithFallback(
  filePath: string,
  onProgress?: (currentPage: number, total: number) => void
): Promise<PDFExtractionResult> {
  const { stdout } = await execAsync(`node scripts/extract-pdf-text.js "${filePath}"`);

  // 将文本按页面分割（简单实现，假设每页之间有一定规律）
  const text = stdout.trim();
  const pages = text.split('\n\n--- Page Break ---\n\n');

  const pageExtractions: PageExtraction[] = pages.map((pageText, idx) => ({
    pageNumber: idx + 1,
    text: pageText,
    success: true,
    method: 'pdf-parse-simple',
  }));

  onProgress?.(pages.length, pages.length);

  return {
    pages: pageExtractions,
    totalPages: pages.length,
    method: 'pdf-parse-simple',
    duration: 0,
  };
}

/**
 * 并行提取多个页面（用于加速）
 */
export async function extractPagesInParallel(
  filePath: string,
  pageNumbers: number[],
  concurrency = 3
): Promise<PageExtraction[]> {
  console.log(`[PDF Extractor] Extracting ${pageNumbers.length} pages with concurrency ${concurrency}`);

  const results: PageExtraction[] = [];

  for (let i = 0; i < pageNumbers.length; i += concurrency) {
    const batch = pageNumbers.slice(i, i + concurrency);
    const batchPromises = batch.map(pageNumber =>
      extractSinglePage(filePath, pageNumber)
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    console.log(`[PDF Extractor] Extracted batch ${Math.floor(i / concurrency) + 1}: ${batch.length} pages`);
  }

  return results;
}

/**
 * 提取单个页面
 */
async function extractSinglePage(
  filePath: string,
  pageNumber: number
): Promise<PageExtraction> {
  try {
    const { stdout } = await execAsync(
      `node scripts/extract-pdf-page.js "${filePath}" ${pageNumber}`
    );

    return {
      pageNumber,
      text: stdout.trim(),
      success: true,
      method: 'pdf-parse',
    };
  } catch (error) {
    return {
      pageNumber,
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      method: 'pdf-parse',
    };
  }
}

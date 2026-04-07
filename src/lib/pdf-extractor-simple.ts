/**
 * 简化可靠的 PDF 提取器
 * 使用独立的 extract-pdf-text.js 脚本
 */

import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function extractPDFSimple(filePath: string): Promise<{
  text: string;
  numPages: number;
  method: string;
}> {
  try {
    console.log(`[PDF Extractor] Starting extraction for: ${filePath}`);

    // 使用独立的 extract-pdf-text.js 脚本
    // 该脚本使用 pdf-parse 1.1.1，在 Node.js 环境下完全正常工作
    const { stdout, stderr } = await execAsync(`node scripts/extract-pdf-text.js "${filePath}"`);

    // stderr 包含元数据（页数、字符数），stdout 包含文本
    const text = stdout.trim();
    const meta = stderr.trim();

    // 从元数据中提取页数
    const pagesMatch = meta.match(/(\d+)\s+pages/);
    const numPages = pagesMatch ? parseInt(pagesMatch[1]) : 1;

    console.log(`[PDF Extractor] ✅ Success:`);
    console.log(`  - Pages: ${numPages}`);
    console.log(`  - Characters: ${text.length}`);
    console.log(`  - Method: pdf-parse (via child process)`);

    return {
      text,
      numPages,
      method: 'pdf-parse',
    };
  } catch (error) {
    console.error('[PDF Extractor] ❌ Failed:', error);
    throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 验证提取的文本质量
 */
export function validateExtractedText(text: string): {
  valid: boolean;
  reason?: string;
  quality: 'good' | 'acceptable' | 'poor';
} {
  if (!text || text.length < 50) {
    return { valid: false, reason: 'Text too short', quality: 'poor' };
  }

  // 检查文本质量
  if (text.length > 1000) {
    return { valid: true, quality: 'good' };
  } else if (text.length > 500) {
    return { valid: true, quality: 'acceptable' };
  } else {
    return { valid: true, quality: 'poor' };
  }
}

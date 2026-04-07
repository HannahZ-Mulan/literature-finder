/**
 * OCR Worker Thread
 * 在独立线程中运行 Tesseract.js，避免阻塞主线程
 * 用法: new Worker('./ocr-worker.js', { workerData: { filePath, pageIndex } })
 */

const { parentPort, workerData } = require('worker_threads');
const path = require('path');

async function performOCR(filePath, pageIndex) {
  try {
    // 动态加载 Tesseract.js
    const Tesseract = require('tesseract.js');

    console.log(`[OCR Worker ${pageIndex}] Starting OCR for page ${pageIndex}...`);

    // 创建 worker
    const worker = await Tesseract.createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const progress = Math.round(m.progress * 100);
          console.log(`[OCR Worker ${pageIndex}] Progress: ${progress}%`);
        }
      },
    });

    // 执行 OCR
    const { data } = await worker.recognize(filePath);
    const text = data.text.replace(/\s+/g, ' ').trim();

    // 终止 worker
    await worker.terminate();

    console.log(`[OCR Worker ${pageIndex}] Complete: ${text.length} chars`);

    return text;
  } catch (error) {
    console.error(`[OCR Worker ${pageIndex}] Error:`, error);
    throw error;
  }
}

// 主线程通信
parentPort.on('message', async () => {
  try {
    const { filePath, pageIndex } = workerData;
    const text = await performOCR(filePath, pageIndex);
    parentPort.postMessage({ text });
  } catch (error) {
    parentPort.postMessage({ error: error.message });
  }
});

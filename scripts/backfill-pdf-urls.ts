/**
 * 为现有 arXiv 文献填充 PDF URL
 * 运行: npx tsx scripts/backfill-pdf-urls.ts
 */

import { db } from '../src/db';
import { literature } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function backfillPDFUrls() {
  console.log('开始为 arXiv 文献填充 PDF URL...');

  // 获取所有 arXiv 文献（没有 PDF URL 的）
  const allLiterature = await db
    .select()
    .from(literature)
    .where(eq(literature.source, 'arxiv'));

  console.log(`找到 ${allLiterature.length} 篇 arXiv 文献`);

  let updatedCount = 0;
  let errorCount = 0;

  for (const lit of allLiterature) {
    try {
      // 如果已有 pdf_url，跳过
      if (lit.pdf_url) {
        console.log(`  [跳过] ID ${lit.id}: 已有 PDF URL`);
        continue;
      }

      // 从 DOI 或 ID 生成 PDF URL
      let pdfUrl = null;

      // 方法1: 从 arXiv ID 生成（如果 ID 存储在 sourceUrl 或可以从 DOI 提取）
      if (lit.doi) {
        // arXiv DOI 格式: 10.1234/arXiv.ID
        const arxivIdMatch = lit.doi.match(/arxiv\.(\d+\.\d+)/);
        if (arxivIdMatch) {
          pdfUrl = `https://arxiv.org/pdf/${arxivIdMatch[1]}.pdf`;
        }
      }

      // 方法2: 尝试从数据库的其他字段提取 arXiv ID
      if (!pdfUrl) {
        // 检查是否有 source_url 字段存储原始 arXiv ID
        const title = lit.title.toLowerCase();
        if (title.includes('arxiv') || lit.source === 'arxiv') {
          // 尝试构建 arXiv PDF URL
          // 注意：这需要准确的 arXiv ID，如果没有则无法生成
          console.log(`  [警告] ID ${lit.id}: 无法提取 arXiv ID，需要手动检查`);
        }
      }

      if (pdfUrl) {
        await db
          .update(literature)
          .set({ pdf_url: pdfUrl })
          .where(eq(literature.id, lit.id));

        console.log(`  [更新] ID ${lit.id}: ${pdfUrl}`);
        updatedCount++;
      }
    } catch (error) {
      console.error(`  [错误] ID ${lit.id}:`, error);
      errorCount++;
    }
  }

  console.log(`\n完成！`);
  console.log(`  更新: ${updatedCount} 篇`);
  console.log(`  跳过: ${allLiterature.length - updatedCount} 篇`);
  console.log(`  错误: ${errorCount} 篇`);
}

// 运行
backfillPDFUrls()
  .then(() => {
    console.log('脚本执行完毕');
    process.exit(0);
  })
  .catch((error) => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { extractPDFSimple } from '@/lib/pdf-extractor-simple';
import { dbPapers, papers } from '@/db/index-papers';
import { sql, eq } from 'drizzle-orm';
import { detectSections } from '@/lib/chunker/section-detector';
import { storeChunks } from '@/lib/chunker/chunk-storage';

// 创建 uploads 文件夹
const uploadsDir = join(process.cwd(), 'uploads');
if (!existsSync(uploadsDir)) await mkdir(uploadsDir, { recursive: true });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const title = (formData.get('title') as string) || file?.name || 'Untitled';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log(`[Upload] Starting upload: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

    // 保存文件
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name}`;
    const filePath = join(uploadsDir, fileName);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));
    console.log(`[Upload] File saved: ${filePath}`);

    // 插入数据库，暂时不包含新字段（避免数据库错误）
    const paper = await dbPapers.insert(papers).values({
      title,
      fileName,
      extractedText: '',
    }).returning();

    const paperId = paper[0].id;

    // 立即返回响应
    const response = NextResponse.json({
      success: true,
      message: 'File uploaded successfully. Text extraction running in background.',
      paperId,
      fileName,
    });

    // 异步解析（不阻塞响应）
    setImmediate(async () => {
      try {
        console.log(`[AsyncParse] Starting extraction for ID=${paperId}`);

        // 使用简化的 PDF 提取器
        const { text, numPages, method } = await extractPDFSimple(filePath);

        // 验证提取的文本不为空
        if (!text || text.trim().length < 10) {
          throw new Error('Extracted text is too short or empty');
        }

        // 提取摘要（前500字符作为摘要）
        const abstract = text.substring(0, 500);

        // 调用 Google Scholar 搜索 API
        let googleScholarUrl = null;
        try {
          console.log(`[GoogleScholar] Searching for paper: ${title}`);
          const scholarResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/google-scholar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, abstract }),
          });

          if (scholarResponse.ok) {
            const scholarData = await scholarResponse.json();
            googleScholarUrl = scholarData.searchUrl;
            console.log(`[GoogleScholar] ✅ Found: ${googleScholarUrl}`);
          } else {
            console.log(`[GoogleScholar] ⚠️ Search failed with status: ${scholarResponse.status}`);
          }
        } catch (scholarError) {
          console.error(`[GoogleScholar] ❌ Error:`, scholarError);
        }

        // 更新数据库 - 标记为完成，包含 Google Scholar 链接和摘要
        await dbPapers.update(papers)
          .set({
            extractedText: text,
            isComplete: true,
            abstract,
            googleScholarUrl,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          })
          .where(eq(papers.id, paperId));

        console.log(`[AsyncParse] ✅ Complete for ID=${paperId}:`);

        // Chunk the extracted text
        try {
          console.log(`[Chunking] Starting chunking for paper ID=${paperId}`);
          const sections = detectSections(text);
          const storedCount = await storeChunks(paperId, sections);
          console.log(`[Chunking] ✅ Stored ${storedCount} chunks for paper ID=${paperId}`);
        } catch (chunkError) {
          console.error(`[Chunking] ❌ Failed for paper ID=${paperId}:`, chunkError);
          // Don't fail the upload process if chunking fails
        }

        console.log(`  - Pages: ${numPages}`);
        console.log(`  - Characters: ${text.length}`);
        console.log(`  - Method: ${method}`);
        if (googleScholarUrl) {
          console.log(`  - Google Scholar: ${googleScholarUrl}`);
        }
      } catch (err) {
        console.error(`[AsyncParse] ❌ Failed for ID=${paperId}:`, err);

        // 标记为失败，保留错误信息
        await dbPapers.update(papers)
          .set({
            isComplete: false, // 标记为未完成
            updatedAt: sql`CURRENT_TIMESTAMP`,
          })
          .where(eq(papers.id, paperId));

        console.error(`[AsyncParse] Paper ID=${paperId} marked as incomplete due to extraction failure`);
      }
    });

    return response;
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

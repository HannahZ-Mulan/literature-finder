import { NextRequest, NextResponse } from 'next/server';
import { dbPapers } from '@/db/index-papers';
import { papers } from '@/db/index-papers';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getAIManager } from '@/lib/ai';
import { retrieveRelevantChunks } from '@/lib/search/chunk-retriever';
import { getChunksByPaperId } from '@/lib/chunker/chunk-storage';

const chatSchema = z.object({
  question: z.string().min(1).max(2000, '问题过长（上限 2000 字符）'),
  chat_history: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string().max(10000),
  })).max(20, '历史记录过多').optional(),
});

// POST - Chat with paper
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paperId = parseInt(params.id);
    if (isNaN(paperId)) {
      return NextResponse.json({ error: 'Invalid paper ID' }, { status: 400 });
    }

    const body = await request.json();
    const validation = chatSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { question, chat_history } = validation.data;

    // Get paper
    const paperList = await dbPapers
      .select()
      .from(papers)
      .where(eq(papers.id, paperId))
      .limit(1);

    if (paperList.length === 0) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 });
    }

    const paper = paperList[0];

    // Check if paper has content
    if (!paper.extractedText || paper.extractedText.trim().length < 50) {
      return NextResponse.json({
        answer: `⚠️ **无法进行AI对话：论文内容为空**

论文《${paper.title}》尚未提取文本内容，或者提取失败。

**可能的原因：**
1. PDF上传后文本提取正在进行中
2. PDF是扫描版（图片格式），无法提取文本
3. PDF文件损坏或格式不支持

**建议操作：**
- 刷新页面稍后重试
- 如果是扫描版PDF，请使用"粘贴文本"功能手动输入论文内容
- 重新上传PDF文件

**当前状态：**
- 论文ID: ${paper.id}
- 文件名: ${paper.fileName}
- 文本长度: ${paper.extractedText?.length || 0} 字符`,
        provider: 'error',
        error: 'Paper content is empty',
      });
    }

    // Build context for the AI. Prefer RAG (retrieve the most relevant
    // chunks for this question) over stuffing the whole text; fall back
    // gracefully so there is always something to answer from.
    const buildContext = async (): Promise<{ context: string; usedRAG: boolean }> => {
      // 1) RAG: retrieve top-K chunks by keyword relevance
      const retrieved = await retrieveRelevantChunks(question, paperId, 5);
      if (retrieved.length > 0) {
        return {
          context: retrieved
            .map(c => `[来源: ${c.chunkType}]\n${c.chunkText}`)
            .join('\n\n'),
          usedRAG: true
        };
      }

      // 2) Fallback A: no keyword matches, but chunks exist -> use the
      //    opening sections (Abstract / Introduction) which usually cover
      //    overview-style questions
      const allChunks = await getChunksByPaperId(paperId);
      if (allChunks.length > 0) {
        const head = allChunks.slice(0, 2);
        return {
          context: head
            .map(c => `[来源: ${c.chunk_type}]\n${c.chunk_text}`)
            .join('\n\n'),
          usedRAG: false
        };
      }

      // 3) Fallback B: paper has no chunks at all -> truncate full text
      //    (legacy behavior, kept as last resort)
      const fullText = paper.extractedText;
      const maxLength = 12000;
      if (fullText.length <= maxLength) {
        return { context: fullText, usedRAG: false };
      }
      const beginning = fullText.substring(0, Math.floor(maxLength * 0.7));
      const ending = fullText.substring(fullText.length - Math.floor(maxLength * 0.3));
      return {
        context: beginning + '\n\n...[论文中间部分省略]...\n\n' + ending,
        usedRAG: false
      };
    };

    const { context: paperContext, usedRAG } = await buildContext();

    // Try to use AI Manager for intelligent responses
    try {
      const aiManager = getAIManager();
      const result = await aiManager.chatWithPaper(
        question,
        paper.title,
        paperContext,
        chat_history
      );

      return NextResponse.json({
        answer: result.content,
        provider: result.provider,
        usage: result.usage,
        rag: usedRAG,
      });
    } catch (aiError) {
      // AI provider unavailable. Return an honest degraded response rather
      // than a long fabricated "answer" that buries the failure.
      console.warn('[Chat] AI provider failed:', aiError);
      return NextResponse.json({
        answer: '⚠️ AI 对话服务暂时不可用，无法回答您的问题。请稍后重试，或检查 AI 服务配置。',
        provider: 'fallback',
        rag: usedRAG,
        degraded: true,
        error: 'AI provider not available - please configure API keys',
      }, { status: 503 });
    }
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to chat' },
      { status: 500 }
    );
  }
}

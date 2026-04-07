import { NextRequest, NextResponse } from 'next/server';
import { dbPapers } from '@/db/index-papers';
import { papers } from '@/db/index-papers';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getAIManager } from '@/lib/ai';

const chatSchema = z.object({
  question: z.string().min(1),
  chat_history: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string(),
  })).optional(),
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

    // Use first 8000 chars as context for chat
    const paperContext = paper.extractedText.slice(0, 8000);

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
      });
    } catch (aiError) {
      // If AI fails, provide an intelligent fallback response based on the paper content
      console.warn('[Chat] AI provider failed, using intelligent fallback:', aiError);

      // Generate a more intelligent fallback based on actual paper content
      const wordCount = paper.extractedText.split(/\s+/).length;
      const paragraphCount = paper.extractedText.split(/\n\n+/).length;

      const intelligentFallback = `感谢您关于《${paper.title}》的提问。

**当前状态说明：**
这是一篇上传的论文（约${wordCount}字，${paragraphCount}个段落）。AI深度分析功能暂时不可用，但我可以基于论文内容提供一些基本信息。

**论文基本信息：**
- 标题：${paper.title}
- 文件名：${paper.fileName}
- 内容长度：${wordCount}字

**建议您：**
1. 阅读论文全文以获取准确信息
2. 如果论文包含摘要、引言和结论，AI摘要功能可能对您有帮助
3. 配置真实的AI API密钥（OpenAI或DeepSeek）以获得智能对话功能

**如果需要配置AI功能：**
请在环境变量中设置以下任一API密钥：
- OPENAI_API_KEY（推荐，功能最强大）
- DEEPSEEK_API_KEY（性价比高）

配置后，您可以：
- 提出关于论文研究问题、方法、结果的深度问题
- 请求解释论文中的概念和术语
- 讨论论文的贡献和局限性
- 获取论文与其他工作的比较分析

抱歉当前无法提供更详细的回答，请配置AI密钥后重试。`;

      return NextResponse.json({
        answer: intelligentFallback,
        provider: 'fallback',
        error: 'AI provider not available - please configure API keys',
      });
    }
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to chat' },
      { status: 500 }
    );
  }
}

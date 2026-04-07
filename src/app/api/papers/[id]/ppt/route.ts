import { NextRequest, NextResponse } from 'next/server';
import { dbPapers, papers } from '@/db/index-papers';
import { eq } from 'drizzle-orm';
import { getAIManager } from '@/lib/ai';

interface SlideContent {
  title: string;
  bullets: string[];
}

interface PPTResponse {
  title: string;
  slides: {
    slide1: SlideContent;
    slide2: SlideContent;
    slide3: SlideContent;
    slide4: SlideContent;
    slide5: SlideContent;
  };
  markdown: string;
}

// Generate fallback PPT content when AI is unavailable
function generateFallbackPPT(title: string) {
  return {
    slide1: {
      title: '研究背景',
      bullets: [
        '研究领域背景介绍',
        '现有研究现状',
        '研究问题的提出',
        '研究意义和价值',
      ],
    },
    slide2: {
      title: '研究问题',
      bullets: [
        '核心研究问题',
        '研究假设',
        '研究目标',
        '预期成果',
      ],
    },
    slide3: {
      title: '研究方法',
      bullets: [
        '方法论概述',
        '实验设计',
        '数据来源',
        '分析方法',
      ],
    },
    slide4: {
      title: '研究发现',
      bullets: [
        '主要发现',
        '数据分析结果',
        '实验结果',
        '关键指标',
      ],
    },
    slide5: {
      title: '结论',
      bullets: [
        '研究结论',
        '主要贡献',
        '局限性',
        '未来研究方向',
      ],
    },
  };
}

// POST - Generate PPT content (Markdown format)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paperId = parseInt(params.id);
    if (isNaN(paperId)) {
      return NextResponse.json({ error: 'Invalid paper ID' }, { status: 400 });
    }

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

    // Generate PPT content using AI Manager with fallback
    const textContext = paper.extractedText.slice(0, 10000);

    const prompt = `你是一个专业的学术演示文稿制作专家。请基于以下学术论文，生成一个 5 页的 PPT 内容。

论文标题: ${paper.title}

论文内容:
${textContext}

请生成一个 JSON 格式的回答，包含以下 5 页幻灯片的内容:

1. "slide1" - Background (研究背景)
   - title: 幻灯片标题
   - bullets: 3-5 个要点列表

2. "slide2" - Research Question (研究问题)
   - title: 幻灯片标题
   - bullets: 3-5 个要点列表

3. "slide3" - Method (方法)
   - title: 幻灯片标题
   - bullets: 3-5 个要点列表

4. "slide4" - Findings (发现)
   - title: 幻灯片标题
   - bullets: 3-5 个要点列表

5. "slide5" - Conclusion (结论)
   - title: 幻灯片标题
   - bullets: 3-5 个要点列表

每页内容应该:
- 简洁明了
- 使用中文
- 适合演示文稿展示
- 每个 bullet 点不超过 20 个字

返回格式:
{
  "slide1": { "title": "...", "bullets": ["...", "..."] },
  "slide2": { "title": "...", "bullets": ["...", "..."] },
  ...
}`;

    let pptContent: any;
    let usage: any;
    let provider: string;

    try {
      const aiManager = getAIManager();

      // Use chatWithPaper for PPT generation
      const systemPrompt = '你是一个专业的学术演示文稿制作专家，擅长将学术论文转化为清晰简洁的 PPT 内容。请务必以JSON格式返回结果。';
      const result = await aiManager.chatWithPaper(
        prompt,
        paper.title,
        systemPrompt
      );

      // Parse JSON from AI response
      try {
        // Try to extract JSON from the response
        const jsonMatch = result.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          pptContent = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.warn('[PPT] Failed to parse JSON, generating fallback PPT');
        pptContent = generateFallbackPPT(paper.title);
      }

      usage = result.usage;
      provider = result.provider;
    } catch (aiError) {
      console.warn('[PPT] AI provider failed, using fallback:', aiError);
      pptContent = generateFallbackPPT(paper.title);
      usage = null;
      provider = 'fallback';
    }

    // Generate Markdown
    let markdown = `# ${paper.title}\n\nAI Generated Presentation\n\n---\n\n`;

    const slides = ['slide1', 'slide2', 'slide3', 'slide4', 'slide5'];
    const slideNumber = ['1', '2', '3', '4', '5'];

    slides.forEach((slideKey, index) => {
      const content = pptContent[slideKey];
      if (!content) return;

      markdown += `# Slide ${slideNumber[index]}\n${content.title}\n\n`;
      content.bullets.forEach((bullet: string) => {
        markdown += `- ${bullet}\n`;
      });
      markdown += '\n---\n\n';
    });

    return NextResponse.json({
      title: paper.title,
      slides: pptContent,
      markdown,
      usage,
      provider,
    });
  } catch (error) {
    console.error('Generate PPT error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate PPT' },
      { status: 500 }
    );
  }
}

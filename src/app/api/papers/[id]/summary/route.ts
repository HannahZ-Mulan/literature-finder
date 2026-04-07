import { NextRequest, NextResponse } from 'next/server';
import { dbPapers } from '@/db/index-papers';
import { papers } from '@/db/index-papers';
import { eq } from 'drizzle-orm';
import { getAIManager } from '@/lib/ai';

// GET - Retrieve existing summary
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paperId = parseInt(params.id);
    if (isNaN(paperId)) {
      return NextResponse.json({ error: 'Invalid paper ID' }, { status: 400 });
    }

    const paperList = await dbPapers
      .select()
      .from(papers)
      .where(eq(papers.id, paperId))
      .limit(1);

    if (paperList.length === 0) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 });
    }

    const paper = paperList[0];

    if (!paper.summary) {
      return NextResponse.json({ error: 'No summary found' }, { status: 404 });
    }

    return NextResponse.json({
      summary: JSON.parse(paper.summary),
      cached: true,
    });
  } catch (error) {
    console.error('Get summary error:', error);
    return NextResponse.json({ error: 'Failed to get summary' }, { status: 500 });
  }
}

// POST - Generate new summary
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paperId = parseInt(params.id);
    if (isNaN(paperId)) {
      return NextResponse.json({ error: 'Invalid paper ID' }, { status: 400 });
    }

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
        error: '论文内容为空，无法生成摘要',
        details: `论文《${paper.title}》尚未提取文本内容，或者提取失败。文本长度：${paper.extractedText?.length || 0} 字符`,
      }, { status: 400 });
    }

    // Check if summary already exists
    if (paper.summary) {
      return NextResponse.json({
        summary: JSON.parse(paper.summary),
        cached: true,
      });
    }

    // Generate AI summary using AI Manager
    const aiManager = getAIManager();

    const title = paper.title;
    const content = paper.extractedText.slice(0, 8000); // First 8000 chars for context

    // Generate summary using AI with fallback support
    const result = await aiManager.generateSummary(title, content, 'medium');

    // Improved parsing logic for structured summary
    const parseSummaryContent = (content: string) => {
      const sections = {
        one_sentence: '',
        research_question: '',
        method: '',
        key_findings: '',
        contribution: '',
        limitations: ''
      };

      // Remove markdown formatting
      let cleanContent = content
        .replace(/^#+\s*/gm, '') // Remove headers
        .replace(/^\*\s*/gm, '')  // Remove bullets
        .replace(/^\-\s*/gm, ''); // Remove dashes

      // Split into sections based on common patterns
      const sectionPatterns = [
        { key: 'one_sentence', patterns: ['一句话总结', 'One Sentence', 'Summary', '总结'], index: 0 },
        { key: 'research_question', patterns: ['研究问题', 'Research Question', '问题'] },
        { key: 'method', patterns: ['方法', 'Method', 'Methodology', '核心方法', '研究方法'] },
        { key: 'key_findings', patterns: ['关键发现', 'Key Findings', '主要结果', 'Main Results', '发现'] },
        { key: 'contribution', patterns: ['贡献', 'Contribution', '主要贡献', 'Contributions'] },
        { key: 'limitations', patterns: ['局限性', 'Limitations', '局限', 'Limitation'] }
      ];

      // Split content by lines and group by sections
      const lines = cleanContent.split('\n').map(l => l.trim()).filter(l => l);
      let currentSection = 'one_sentence';
      let currentContent: string[] = [];

      const finalizeSection = () => {
        if (currentContent.length > 0) {
          sections[currentSection as keyof typeof sections] = currentContent.join('\n').trim();
          currentContent = [];
        }
      };

      for (const line of lines) {
        // Check if this line is a section header
        let foundSection = false;
        for (const section of sectionPatterns) {
          for (const pattern of section.patterns) {
            if (line.toLowerCase().includes(pattern.toLowerCase()) && line.length < 100) {
              finalizeSection();
              currentSection = section.key;
              foundSection = true;
              break;
            }
          }
          if (foundSection) break;
        }

        // If not a header, add to current section content
        if (!foundSection && line.length > 0) {
          // Skip common header-only lines
          if (!line.match(/^[\s\-*#]+$/) && line.length > 3) {
            currentContent.push(line);
          }
        }
      }

      // Don't forget the last section
      finalizeSection();

      return sections;
    };

    const structuredSummary = parseSummaryContent(result.content);

    // Save summary to database
    await dbPapers
      .update(papers)
      .set({ summary: JSON.stringify(structuredSummary) })
      .where(eq(papers.id, paperId));

    return NextResponse.json({
      summary: structuredSummary,
      cached: false,
      provider: result.provider,
      usage: result.usage,
    });
  } catch (error) {
    console.error('Generate summary error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate summary' },
      { status: 500 }
    );
  }
}

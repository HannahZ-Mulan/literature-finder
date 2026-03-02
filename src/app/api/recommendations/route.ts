import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { literature, readingActivity, userLiterature } from '@/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { verifyAuth } from '@/middleware';

interface RecommendationScore {
  literatureId: number;
  score: number;
  reasons: string[];
}

// GET - Get personalized recommendations
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.success || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');

    // Fetch user's saved literature
    const userLit = await db
      .select({ literature_id: userLiterature.literature_id })
      .from(userLiterature)
      .where(eq(userLiterature.user_id, auth.userId));

    const userLiteratureIds = new Set(userLit.map((l) => l.literature_id));

    // If no user literature, return trending
    if (userLiteratureIds.size === 0) {
      const trending = await db
        .select()
        .from(literature)
        .orderBy(desc(literature.citation_count))
        .limit(limit);

      return NextResponse.json({
        recommendations: trending.map((lit) => ({
          ...lit,
          authors: JSON.parse(lit.authors),
          keywords: lit.keywords ? JSON.parse(lit.keywords) : null,
          reason: '高引用量文献',
        })),
      });
    }

    // Get detailed info about saved literature
    const interactedIds = Array.from(userLiteratureIds);
    const savedLiterature = await db
      .select()
      .from(literature)
      .where(inArray(literature.id, interactedIds));

    if (!savedLiterature || savedLiterature.length === 0) {
      const trending = await db
        .select()
        .from(literature)
        .orderBy(desc(literature.citation_count))
        .limit(limit);

      return NextResponse.json({
        recommendations: trending.map((lit) => ({
          ...lit,
          authors: JSON.parse(lit.authors),
          keywords: lit.keywords ? JSON.parse(lit.keywords) : null,
          reason: '高引用量文献',
        })),
      });
    }

    // Calculate keyword and journal frequency
    const keywordFrequency: Record<string, number> = {};
    const journalFrequency: Record<string, number> = {};

    for (const lit of savedLiterature) {
      if (lit.keywords) {
        const keywords = JSON.parse(lit.keywords) as string[];
        for (const keyword of keywords) {
          const lower = keyword.toLowerCase();
          keywordFrequency[lower] = (keywordFrequency[lower] || 0) + 1;
        }
      }
      if (lit.journal) {
        journalFrequency[lit.journal] = (journalFrequency[lit.journal] || 0) + 1;
      }
    }

    // Get candidates not saved by user
    const allLit = await db.select({ id: literature.id }).from(literature);
    const candidateIds = allLit
      .map((c) => c.id)
      .filter((id) => !userLiteratureIds.has(id))
      .sort(() => Math.random() - 0.5) // 随机打乱顺序
      .slice(0, 200);

    if (candidateIds.length === 0) {
      return NextResponse.json({ recommendations: [] });
    }

    const candidates = await db
      .select()
      .from(literature)
      .where(inArray(literature.id, candidateIds));

    // Score candidates
    const scores: RecommendationScore[] = [];

    for (const candidate of candidates) {
      let score = 0;
      const reasons: string[] = [];

      // Keyword matching
      if (candidate.keywords) {
        const keywords = JSON.parse(candidate.keywords) as string[];
        for (const keyword of keywords) {
          const lower = keyword.toLowerCase();
          if (keywordFrequency[lower]) {
            score += keywordFrequency[lower] * 5;
            if (reasons.length < 3) {
              reasons.push(`包含相关关键词 "${keyword}"`);
            }
          }
        }
      }

      // Journal matching
      if (candidate.journal && journalFrequency[candidate.journal]) {
        score += journalFrequency[candidate.journal] * 3;
        if (!reasons.includes('来自您常阅读的期刊')) {
          reasons.push('来自您常阅读的期刊');
        }
      }

      // Author overlap
      if (candidate.authors) {
        // Safe JSON parsing with fallback
        let candidateAuthors: Array<{ name: string }> = [];
        try {
          candidateAuthors = JSON.parse(candidate.authors || '[]');
        } catch {
          candidateAuthors = [];
        }

        const candidateAuthorNames = new Set(
          candidateAuthors.map((a) => a.name?.toLowerCase() || '')
        );

        for (const lit of savedLiterature) {
          // Safe JSON parsing with fallback
          let litAuthors: Array<{ name: string }> = [];
          try {
            litAuthors = JSON.parse(lit.authors || '[]');
          } catch {
            litAuthors = [];
          }

          const litAuthorNames = new Set(litAuthors.map((a) => a.name?.toLowerCase() || ''));

          for (const author of candidateAuthorNames) {
            if (litAuthorNames.has(author)) {
              score += 8;
              if (!reasons.includes('作者与您阅读过的文献重合')) {
                reasons.push('作者与您阅读过的文献重合');
              }
              break;
            }
          }
        }
      }

      // Citation boost
      if (candidate.citation_count > 50) {
        score += Math.min(candidate.citation_count / 20, 10);
        if (!reasons.includes('高引用量')) {
          reasons.push('高引用量');
        }
      }

      // Recency boost
      if (candidate.publication_date) {
        const pubYear = new Date(candidate.publication_date).getFullYear();
        const currentYear = new Date().getFullYear();
        if (pubYear >= currentYear - 2) {
          score += 5;
          if (!reasons.includes('近期发表')) {
            reasons.push('近期发表');
          }
        }
      }

      if (score > 0 && reasons.length > 0) {
        scores.push({
          literatureId: candidate.id,
          score,
          reasons: reasons.slice(0, 3),
        });
      }
    }

    scores.sort((a, b) => b.score - a.score);
    const topScores = scores.slice(0, limit);

    if (topScores.length === 0) {
      return NextResponse.json({ recommendations: [] });
    }

    const recommendedIds = topScores.map((s) => s.literatureId);
    const recommendations = await db
      .select()
      .from(literature)
      .where(inArray(literature.id, recommendedIds));

    const scoreMap = new Map(topScores.map((s) => [s.literatureId, s]));

    const result = recommendations
      .map((lit) => {
        const scoreInfo = scoreMap.get(lit.id);
        if (!scoreInfo) return null;
        return {
          id: lit.id,
          title: lit.title,
          authors: JSON.parse(lit.authors),
          abstract: lit.abstract,
          publication_date: lit.publication_date,
          journal: lit.journal,
          citation_count: lit.citation_count,
          source: lit.source,
          keywords: lit.keywords ? JSON.parse(lit.keywords) : null,
          pdf_url: lit.pdf_url,
          reason: scoreInfo.reasons.join(' · '),
          score: scoreInfo.score,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    result.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // 同分数时随机排序
      return Math.random() - 0.5;
    });

    return NextResponse.json({ recommendations: result });
  } catch (error: any) {
    console.error('Recommendations error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

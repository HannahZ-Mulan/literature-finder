import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { literature, readingActivity, userLiterature } from '@/db/schema';
import { eq, desc, inArray, and, gte, lt } from 'drizzle-orm';
import { verifyAuth } from '@/middleware';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface RecommendationScore {
  literatureId: number;
  score: number;
  reasons: string[];
}

// 阅读活动权重配置
const ACTION_WEIGHTS: Record<string, number> = {
  'annotated': 10,   // 注释权重最高
  'exported': 8,     // 导出表示深度兴趣
  'opened': 5,       // 打开查看
  'viewed': 2,       // 简单浏览
};

// 用户偏好权重配置
const PREFERENCE_WEIGHTS = {
  is_favorite: 15,   // 收藏
  is_liked: 10,      // 喜欢
  is_to_read: 7,     // 待读
  normal: 1,         // 普通保存
};

// 时间衰减配置（天数）
const TIME_DECAY_DAYS = 30; // 30天内的活动权重更高
const TIME_DECAY_FACTOR = 0.1; // 每天衰减的权重

// GET - Get personalized recommendations
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.success || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');

    // 获取用户保存的文献（包含偏好信息）
    const userLitDetails = await db
      .select()
      .from(userLiterature)
      .where(eq(userLiterature.user_id, auth.userId));

    const userLiteratureIds = new Set(userLitDetails.map((l) => l.literature_id));

    // 如果没有用户文献，返回高引用量文献
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

    // 计算当前时间，用于时间衰减
    const now = new Date();
    const timeDecayThreshold = new Date(now.getTime() - TIME_DECAY_DAYS * 24 * 60 * 60 * 1000);

    // 获取阅读活动数据（用于深度加权和时间衰减）
    const recentActivities = await db
      .select()
      .from(readingActivity)
      .where(
        and(
          eq(readingActivity.user_id, auth.userId),
          inArray(readingActivity.literature_id, interactedIds),
          gte(readingActivity.created_at, timeDecayThreshold)
        )
      );

    // 构建文献ID到用户偏好权重的映射
    const litPreferenceWeight: Record<number, number> = {};
    for (const ul of userLitDetails) {
      let weight = PREFERENCE_WEIGHTS.normal;
      if (ul.is_favorite) weight = PREFERENCE_WEIGHTS.is_favorite;
      else if (ul.is_liked) weight = PREFERENCE_WEIGHTS.is_liked;
      else if (ul.is_to_read) weight = PREFERENCE_WEIGHTS.is_to_read;
      litPreferenceWeight[ul.literature_id] = weight;
    }

    // 构建文献ID到阅读活动权重的映射（带时间衰减）
    const litActivityWeight: Record<number, number> = {};
    for (const activity of recentActivities) {
      const actionWeight = ACTION_WEIGHTS[activity.action] || 1;
      // 计算时间衰减：越近期的活动权重越高
      const daysSinceActivity = Math.floor((now.getTime() - activity.created_at.getTime()) / (24 * 60 * 60 * 1000));
      const timeDecay = Math.max(0, 1 - (daysSinceActivity * TIME_DECAY_FACTOR));

      // 基础权重 * 时间衰减
      const totalWeight = actionWeight * timeDecay;
      litActivityWeight[activity.literature_id] = (litActivityWeight[activity.literature_id] || 0) + totalWeight;
    }

    // Calculate weighted keyword and journal frequency
    const keywordFrequency: Record<string, number> = {};
    const journalFrequency: Record<string, number> = {};
    const authorFrequency: Record<string, number> = {};

    for (const lit of savedLiterature) {
      // 计算文献的综合权重（偏好权重 + 活动权重）
      const prefWeight = litPreferenceWeight[lit.id] || PREFERENCE_WEIGHTS.normal;
      const actWeight = litActivityWeight[lit.id] || 0;
      const totalWeight = prefWeight + actWeight;

      // 加权关键词频率
      if (lit.keywords) {
        const keywords = JSON.parse(lit.keywords) as string[];
        for (const keyword of keywords) {
          const lower = keyword.toLowerCase();
          keywordFrequency[lower] = (keywordFrequency[lower] || 0) + totalWeight;
        }
      }

      // 加权期刊频率
      if (lit.journal) {
        journalFrequency[lit.journal] = (journalFrequency[lit.journal] || 0) + totalWeight;
      }

      // 加权作者频率
      if (lit.authors) {
        let authors: Array<{ name: string }> = [];
        try {
          authors = JSON.parse(lit.authors || '[]');
        } catch {
          authors = [];
        }
        for (const author of authors) {
          const name = author.name?.toLowerCase();
          if (name) {
            authorFrequency[name] = (authorFrequency[name] || 0) + totalWeight;
          }
        }
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

      // Keyword matching (使用加权频率)
      if (candidate.keywords) {
        const keywords = JSON.parse(candidate.keywords) as string[];
        for (const keyword of keywords) {
          const lower = keyword.toLowerCase();
          if (keywordFrequency[lower]) {
            // 加权频率不再乘以额外系数，直接使用累积权重
            score += keywordFrequency[lower];
            if (reasons.length < 3) {
              reasons.push(`包含相关关键词 "${keyword}"`);
            }
          }
        }
      }

      // Journal matching (使用加权频率)
      if (candidate.journal && journalFrequency[candidate.journal]) {
        // 加权期刊频率
        score += journalFrequency[candidate.journal];
        if (!reasons.includes('来自您常阅读的期刊')) {
          reasons.push('来自您常阅读的期刊');
        }
      }

      // Author overlap (使用加权频率)
      if (candidate.authors) {
        let candidateAuthors: Array<{ name: string }> = [];
        try {
          candidateAuthors = JSON.parse(candidate.authors || '[]');
        } catch {
          candidateAuthors = [];
        }

        const candidateAuthorNames = new Set(
          candidateAuthors.map((a) => a.name?.toLowerCase() || '')
        );

        // 检查候选文献的作者是否在用户的作者频率表中
        let authorMatchScore = 0;
        for (const authorName of candidateAuthorNames) {
          if (authorFrequency[authorName]) {
            authorMatchScore += authorFrequency[authorName];
          }
        }

        if (authorMatchScore > 0) {
          score += authorMatchScore;
          if (!reasons.includes('作者与您阅读过的文献重合')) {
            reasons.push('作者与您阅读过的文献重合');
          }
        }
      }

      // Citation boost (保持原有逻辑)
      if (candidate.citation_count > 50) {
        score += Math.min(candidate.citation_count / 20, 10);
        if (!reasons.includes('高引用量')) {
          reasons.push('高引用量');
        }
      }

      // Recency boost (近期发表的文献获得额外加分)
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

      // 多样性控制：避免推荐过多相同关键词的内容
      // 如果候选文献与已推荐的内容相似度过高，降低分数
      // （这里简单实现：如果分数过高，适当降低）
      if (score > 50) {
        score = score * 0.9; // 10% 的惩罚
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

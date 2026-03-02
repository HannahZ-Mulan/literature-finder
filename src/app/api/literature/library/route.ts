import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { literature, userLiterature, literatureCategories, literatureTags } from '@/db/schema';
import { eq, and, desc, sql, or, like, isNull, count } from 'drizzle-orm';
import { verifyAuth } from '@/middleware';
import { z } from 'zod';
import { apiCache } from '@/lib/cache/api-cache';

// Query schema
const libraryQuerySchema = z.object({
  category_id: z.coerce.number().optional(),
  tag_id: z.coerce.number().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z.enum(['date', 'title', 'citation']).default('date'),
});

// Helper to safely get search params
function getSearchParams(searchParams: URLSearchParams) {
  return {
    category_id: searchParams.get('category_id') || undefined,
    tag_id: searchParams.get('tag_id') || undefined,
    search: searchParams.get('search') || undefined,
    page: searchParams.get('page') || undefined,
    limit: searchParams.get('limit') || undefined,
    sort: searchParams.get('sort') || undefined,
  };
}

/**
 * Get total count for pagination
 */
async function getTotalCount(conditions: any[], category_id?: number | null, tag_id?: number | null) {
  // Build count query
  let countQuery = db
    .select({ count: count() })
    .from(literature)
    .innerJoin(userLiterature, eq(literature.id, userLiterature.literature_id));

  // Add category join if filtering by category
  if (category_id !== undefined && category_id !== null) {
    countQuery = countQuery.innerJoin(
      literatureCategories,
      eq(literature.id, literatureCategories.literature_id)
    );
  }

  // Add tag join if filtering by tag
  if (tag_id !== undefined && tag_id !== null) {
    countQuery = countQuery.innerJoin(
      literatureTags,
      eq(literature.id, literatureTags.literature_id)
    );
  }

  const result = await countQuery.where(and(...conditions));
  return result[0]?.count || 0;
}

export async function GET(request: NextRequest) {
  try {
    // 测试模式：使用固定用户ID
    const userId = 1; // 测试用户ID

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const params = getSearchParams(searchParams);
    const queryValidation = libraryQuerySchema.safeParse(params);

    if (!queryValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: queryValidation.error.errors,
        },
        { status: 400 }
      );
    }

    const { category_id, tag_id, search, page, limit, sort } = queryValidation.data;

    // Check cache first
    const cacheKey = `/api/literature/library`;
    const cached = apiCache.get(cacheKey, params);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Build conditions
    const conditions = [eq(userLiterature.user_id, userId)];

    // Apply category filter
    if (category_id !== undefined && category_id !== null) {
      conditions.push(eq(literatureCategories.category_id, category_id));
    }

    // Apply tag filter
    if (tag_id !== undefined && tag_id !== null) {
      conditions.push(eq(literatureTags.tag_id, tag_id));
    }

    // Apply search filter
    if (search) {
      conditions.push(
        or(
          like(literature.title, `%${search}%`),
          like(literature.abstract, `%${search}%`),
          like(literature.authors, `%${search}%`)
        ) as any
      );
    }

    // Apply sorting
    const sortColumn =
      sort === 'date'
        ? userLiterature.created_at
        : sort === 'title'
        ? literature.title
        : literature.citation_count;

    // Get total count for pagination
    const total = await getTotalCount(conditions, category_id, tag_id);
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    // Build main query with proper pagination at database level
    let query = db
      .select({
        id: literature.id,
        literature_id: literature.id, // Add literature_id for navigation
        title: literature.title,
        authors: literature.authors,
        abstract: literature.abstract,
        doi: literature.doi,
        publication_date: literature.publication_date,
        journal: literature.journal,
        citation_count: literature.citation_count,
        source: literature.source,
        keywords: literature.keywords,
        pdf_url: literature.pdf_url,
        notes: userLiterature.notes,
        is_favorite: userLiterature.is_favorite,
        is_liked: userLiterature.is_liked,
        is_to_read: userLiterature.is_to_read,
        reading_progress: userLiterature.reading_progress,
        created_at: userLiterature.created_at,
      })
      .from(literature)
      .innerJoin(userLiterature, eq(literature.id, userLiterature.literature_id));

    // Add category join only if filtering by category
    if (category_id !== undefined && category_id !== null) {
      query = query.innerJoin(
        literatureCategories,
        eq(literature.id, literatureCategories.literature_id)
      );
    }

    // Add tag join only if filtering by tag
    if (tag_id !== undefined && tag_id !== null) {
      query = query.innerJoin(
        literatureTags,
        eq(literature.id, literatureTags.literature_id)
      );
    }

    // Apply pagination at database level using limit and offset
    const results = await query
      .where(and(...conditions))
      .orderBy(desc(sortColumn))
      .limit(limit)
      .offset(offset);

    // Parse JSON fields safely
    const parsedResults = results.map((item) => {
      let parsedAuthors = [];
      try {
        parsedAuthors = item.authors ? JSON.parse(item.authors) : [];
      } catch (e) {
        console.error('Failed to parse authors:', item.authors, e);
        parsedAuthors = [];
      }

      let parsedKeywords = null;
      try {
        parsedKeywords = item.keywords ? JSON.parse(item.keywords) : null;
      } catch (e) {
        console.error('Failed to parse keywords:', item.keywords, e);
        parsedKeywords = null;
      }

      return {
        ...item,
        authors: parsedAuthors,
        keywords: parsedKeywords,
      };
    });

    const responseData = {
      literature: parsedResults,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };

    // Cache the response with shorter TTL for library data (2 minutes)
    apiCache.set(cacheKey, responseData, params, 2 * 60 * 1000);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Get library error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { literature, readingListItems, readingActivity, literatureCategories, categories, literatureTags, tags, searchHistory, userSettings } from '@/db/schema';
import { eq, desc, count, sql, gte, and, lt } from 'drizzle-orm';


/**
 * GET /api/statistics
 * Get comprehensive literature statistics and analytics
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || '1'; // Test mode default

    // 1. Overview Statistics
    const totalLiterature = await db
      .select({ count: count() })
      .from(literature);

    const readingStatusStats = await db
      .select({
        status: readingListItems.reading_status,
        count: count()
      })
      .from(readingListItems)
      .groupBy(readingListItems.reading_status);

    // 2. Priority Distribution
    const priorityStats = await db
      .select({
        priority: readingListItems.priority,
        count: count()
      })
      .from(readingListItems)
      .groupBy(readingListItems.priority);

    // 3. Overdue Items (NEW)
    const now = new Date();
    const nowTimestamp = Math.floor(now.getTime() / 1000);
    const overdueItems = await db
      .select({
        item_id: readingListItems.id,
        literature_id: readingListItems.literature_id,
        title: literature.title,
        authors: literature.authors,
        due_date: readingListItems.due_date,
        priority: readingListItems.priority,
        reading_list_id: readingListItems.reading_list_id,
      })
      .from(readingListItems)
      .innerJoin(literature, eq(readingListItems.literature_id, literature.id))
      .where(
        and(
          sql`${readingListItems.due_date} IS NOT NULL`,
          sql`${readingListItems.due_date} < ${now}`,
          sql`${readingListItems.reading_status} != 'read'`
        )
      )
      .orderBy(readingListItems.due_date)
      .limit(10);

    // 4. Today's Tasks (due today or urgent)
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const todayTasks = await db
      .select({
        item_id: readingListItems.id,
        literature_id: readingListItems.literature_id,
        title: literature.title,
        authors: literature.authors,
        due_date: readingListItems.due_date,
        priority: readingListItems.priority,
        reading_status: readingListItems.reading_status,
      })
      .from(readingListItems)
      .innerJoin(literature, eq(readingListItems.literature_id, literature.id))
      .where(
        and(
          sql`${readingListItems.reading_status} != 'read'`,
          sql`(
            ${readingListItems.due_date} <= ${today}
            OR ${readingListItems.priority} = 'urgent'
          )`
        )
      )
      .orderBy(readingListItems.due_date)
      .limit(5);

    // 5. This Week's Tasks
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const weekTasks = await db
      .select({
        count: count()
      })
      .from(readingListItems)
      .where(
        and(
          sql`${readingListItems.reading_status} != 'read'`,
          sql`${readingListItems.due_date} <= ${weekFromNow}`
        )
      );

    // 6. Reading Time Statistics (NEW)
    const readingTimeStats = await db
      .select({
        total_estimated: sql<number>`SUM(CASE WHEN ${readingListItems.estimated_reading_time} IS NOT NULL THEN ${readingListItems.estimated_reading_time} ELSE 0 END)`,
        total_actual: sql<number>`SUM(CASE WHEN ${readingListItems.actual_reading_time} IS NOT NULL THEN ${readingListItems.actual_reading_time} ELSE 0 END)`,
        count_with_time: sql<number>`COUNT(CASE WHEN ${readingListItems.actual_reading_time} IS NOT NULL THEN 1 END)`,
      })
      .from(readingListItems);

    // 7. Neglected Items (added but not opened in 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const neglectedItems = await db
      .select({
        item_id: readingListItems.id,
        literature_id: readingListItems.literature_id,
        title: literature.title,
        authors: literature.authors,
        added_at: readingListItems.created_at,
        reading_status: readingListItems.reading_status,
        days_since_added: sql<number>`CAST((${nowTimestamp} - ${readingListItems.created_at}) / 86400 AS INTEGER)`,
      })
      .from(readingListItems)
      .innerJoin(literature, eq(readingListItems.literature_id, literature.id))
      .where(
        and(
          sql`${readingListItems.reading_status} = 'unread'`,
          sql`${readingListItems.created_at} < ${thirtyDaysAgo}`
        )
      )
      .orderBy(desc(readingListItems.created_at))
      .limit(10);

    // 8. Publication Trends (by year)
    const publicationByYear = await db
      .select({
        year: sql<string>`substr(${literature.publication_date}, 1, 4)`,
        count: count()
      })
      .from(literature)
      .where(sql`${literature.publication_date} IS NOT NULL AND ${literature.publication_date} != ''`)
      .groupBy(sql`substr(${literature.publication_date}, 1, 4)`)
      .orderBy(sql`substr(${literature.publication_date}, 1, 4)`);

    // 9. Keyword Distribution
    const allLiterature = await db
      .select({
        keywords: literature.keywords
      })
      .from(literature);

    const keywordMap = new Map<string, number>();
    allLiterature.forEach(item => {
      if (item.keywords) {
        try {
          const keywords = JSON.parse(item.keywords) as string[];
          keywords.forEach(keyword => {
            const normalizedKeyword = keyword.trim().toLowerCase();
            if (normalizedKeyword) {
              keywordMap.set(normalizedKeyword, (keywordMap.get(normalizedKeyword) || 0) + 1);
            }
          });
        } catch {
          // Skip invalid JSON
        }
      }
    });

    const topKeywords = Array.from(keywordMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([keyword, count]) => ({ keyword, count }));

    // 10. Author Analysis
    const allAuthors = await db
      .select({
        authors: literature.authors
      })
      .from(literature);

    const authorMap = new Map<string, number>();
    allAuthors.forEach(item => {
      if (item.authors) {
        try {
          const authors = JSON.parse(item.authors) as string[];
          authors.forEach(author => {
            const normalizedAuthor = author.trim();
            if (normalizedAuthor) {
              authorMap.set(normalizedAuthor, (authorMap.get(normalizedAuthor) || 0) + 1);
            }
          });
        } catch {
          // Skip invalid JSON
        }
      }
    });

    const topAuthors = Array.from(authorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([author, count]) => ({ author, count }));

    // 11. Journal/Conference Distribution
    const journalData = await db
      .select({
        journal: literature.journal,
        count: count()
      })
      .from(literature)
      .where(sql`${literature.journal} IS NOT NULL AND ${literature.journal} != ''`)
      .groupBy(literature.journal)
      .orderBy(desc(count()))
      .limit(15);

    // 12. Source Distribution (arXiv, PubMed, etc.)
    const sourceStats = await db
      .select({
        source: literature.source,
        count: count()
      })
      .from(literature)
      .groupBy(literature.source)
      .orderBy(desc(count()));

    // 13. Reading Activity Trends (last 30 days)
    const recentActivity = await db
      .select({
        date: sql<string>`date(${readingActivity.created_at}, 'unixepoch')`,
        action: readingActivity.action,
        count: count()
      })
      .from(readingActivity)
      .where(
        and(
          eq(readingActivity.user_id, parseInt(userId)),
          gte(readingActivity.created_at, thirtyDaysAgo)
        )
      )
      .groupBy(sql`date(${readingActivity.created_at}, 'unixepoch')`, readingActivity.action)
      .orderBy(sql`date(${readingActivity.created_at}, 'unixepoch')`);

    // 14. Category Distribution
    const categoryStats = await db
      .select({
        categoryName: categories.name,
        count: count()
      })
      .from(literatureCategories)
      .innerJoin(categories, eq(literatureCategories.category_id, categories.id))
      .groupBy(categories.name)
      .orderBy(desc(count()));

    // 15. Search History (top search queries)
    const topSearches = await db
      .select({
        query: searchHistory.query,
        count: count()
      })
      .from(searchHistory)
      .where(eq(searchHistory.user_id, parseInt(userId)))
      .groupBy(searchHistory.query)
      .orderBy(desc(count()))
      .limit(10);

    // 16. Citation Count Distribution
    const citationStats = await db
      .select({
        title: literature.title,
        citationCount: literature.citation_count,
        authors: literature.authors
      })
      .from(literature)
      .where(sql`${literature.citation_count} IS NOT NULL`)
      .orderBy(desc(literature.citation_count))
      .limit(10);

    // Calculate completion rate
    const statusMap = new Map(readingStatusStats.map(s => [s.status, s.count]));
    const unread = statusMap.get('unread') || 0;
    const reading = statusMap.get('reading') || 0;
    const read = statusMap.get('read') || 0;
    const totalWithStatus = unread + reading + read;
    const completionRate = totalWithStatus > 0 ? (read / totalWithStatus) * 100 : 0;

    // Get user settings (reading goals)
    const userSettingsData = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.user_id, parseInt(userId)))
      .limit(1);

    const settings = userSettingsData[0] || {
      daily_reading_goal: 3,
      weekly_reading_goal: 15
    };

    // Calculate today's reading progress
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayReadCount = await db
      .select({ count: count() })
      .from(readingListItems)
      .where(
        and(
          eq(readingListItems.reading_status, 'read'),
          gte(readingListItems.updated_at, todayStart)
        )
      );

    // Calculate this week's reading progress
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Get Monday
    weekStart.setHours(0, 0, 0, 0);

    const weekReadCount = await db
      .select({ count: count() })
      .from(readingListItems)
      .where(
        and(
          eq(readingListItems.reading_status, 'read'),
          gte(readingListItems.updated_at, weekStart)
        )
      );

    // Calculate priority distribution
    const priorityMap = new Map(priorityStats.map(s => [s.priority, s.count]));
    const urgentCount = priorityMap.get('urgent') || 0;
    const highCount = priorityMap.get('high') || 0;
    const mediumCount = priorityMap.get('medium') || 0;
    const lowCount = priorityMap.get('low') || 0;

    // Parse JSON for overdue and today's tasks
    const parsedOverdueItems = overdueItems.map(item => ({
      ...item,
      authors: JSON.parse(item.authors as string),
    }));

    const parsedTodayTasks = todayTasks.map(item => ({
      ...item,
      authors: JSON.parse(item.authors as string),
    }));

    const parsedNeglectedItems = neglectedItems.map(item => ({
      ...item,
      authors: JSON.parse(item.authors as string),
    }));

    const statistics = {
      overview: {
        totalLiterature: totalLiterature[0]?.count || 0,
        readingStatus: {
          unread: unread,
          reading: reading,
          read: read
        },
        completionRate: Math.round(completionRate * 10) / 10
      },
      insights: {
        // NEW: Practical insights
        overdue: {
          count: parsedOverdueItems.length,
          items: parsedOverdueItems
        },
        todayTasks: {
          count: parsedTodayTasks.length,
          items: parsedTodayTasks
        },
        weekTasks: weekTasks[0]?.count || 0,
        neglected: {
          count: parsedNeglectedItems.length,
          items: parsedNeglectedItems
        },
        priorityDistribution: {
          urgent: urgentCount,
          high: highCount,
          medium: mediumCount,
          low: lowCount
        },
        readingTime: {
          totalEstimatedMinutes: readingTimeStats[0]?.total_estimated || 0,
          totalActualMinutes: readingTimeStats[0]?.total_actual || 0,
          totalEstimatedHours: Math.round((readingTimeStats[0]?.total_estimated || 0) / 60),
          totalActualHours: Math.round((readingTimeStats[0]?.total_actual || 0) / 60),
          itemsTracked: readingTimeStats[0]?.count_with_time || 0,
        },
        goals: {
          daily: {
            goal: settings.daily_reading_goal,
            completed: todayReadCount[0]?.count || 0,
            remaining: Math.max(0, settings.daily_reading_goal - (todayReadCount[0]?.count || 0)),
            percentage: Math.round(((todayReadCount[0]?.count || 0) / settings.daily_reading_goal) * 100),
          },
          weekly: {
            goal: settings.weekly_reading_goal,
            completed: weekReadCount[0]?.count || 0,
            remaining: Math.max(0, settings.weekly_reading_goal - (weekReadCount[0]?.count || 0)),
            percentage: Math.round(((weekReadCount[0]?.count || 0) / settings.weekly_reading_goal) * 100),
          }
        }
      },
      publicationTrends: {
        byYear: publicationByYear.map(p => ({
          year: p.year,
          count: p.count
        }))
      },
      keywords: {
        top: topKeywords
      },
      authors: {
        top: topAuthors
      },
      journals: {
        top: journalData
      },
      sources: sourceStats,
      readingActivity: {
        last30Days: recentActivity.map(a => ({
          date: a.date,
          action: a.action,
          count: a.count
        }))
      },
      categories: categoryStats,
      topSearches: topSearches,
      mostCited: citationStats
    };

    return NextResponse.json(statistics);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

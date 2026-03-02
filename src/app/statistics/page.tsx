'use client';

import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, BookOpen, Users, Trophy, Lightbulb } from 'lucide-react';
import {
  OverviewCards,
  ReadingStatusChart,
  PublicationTrendsChart,
  KeywordsChart,
  AuthorsChart,
  JournalsChart,
  SourcesChart,
  MostCitedTable,
  InsightsDashboard
} from '@/components/statistics';
import { StatisticsCharts } from '@/components/statistics/StatisticsCharts';

interface Statistics {
  overview: {
    totalLiterature: number;
    readingStatus: {
      unread: number;
      reading: number;
      read: number;
    };
    completionRate: number;
  };
  insights: {
    overdue: {
      count: number;
      items: any[];
    };
    todayTasks: {
      count: number;
      items: any[];
    };
    weekTasks: number;
    neglected: {
      count: number;
      items: any[];
    };
    priorityDistribution: {
      urgent: number;
      high: number;
      medium: number;
      low: number;
    };
    readingTime: {
      totalEstimatedHours: number;
      totalActualHours: number;
      itemsTracked: number;
    };
  };
  publicationTrends: {
    byYear: Array<{ year: string; count: number }>;
  };
  keywords: {
    top: Array<{ keyword: string; count: number }>;
  };
  authors: {
    top: Array<{ author: string; count: number }>;
  };
  journals: {
    top: Array<{ journal: string; count: number }>;
  };
  sources: Array<{ source: string; count: number }>;
  readingActivity: {
    last30Days: Array<{ date: string; action: string; count: number }>;
  };
  categories: Array<{ categoryName: string; count: number }>;
  topSearches: Array<{ query: string; count: number }>;
  mostCited: Array<{
    title: string;
    citationCount: number;
    authors: string;
  }>;
}

export default function StatisticsPage() {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStatistics() {
      try {
        setLoading(true);
        const response = await fetch('/api/statistics');
        if (!response.ok) {
          throw new Error('Failed to fetch statistics');
        }
        const data = await response.json();
        setStatistics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchStatistics();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[600px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">加载统计数据中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !statistics) {
    return (
      <div className="container mx-auto py-8">
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-8 text-center">
          <p className="text-red-600">加载统计数据失败: {error || '未知错误'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-blue-600" />
          文献统计分析
        </h1>
        <p className="text-gray-600 mt-2">
          查看您的阅读习惯、研究趋势和文献影响力分析
        </p>
      </div>

      {/* NEW: 洞察仪表盘 */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          智能洞察
        </h2>
        <InsightsDashboard insights={statistics.insights} />
      </section>

      {/* Overview Cards */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          总体概览
        </h2>
        <OverviewCards
          totalLiterature={statistics.overview.totalLiterature}
          readingStatus={statistics.overview.readingStatus}
          completionRate={statistics.overview.completionRate}
        />
      </section>

      {/* NEW: 可视化图表 */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          数据可视化
        </h2>
        <StatisticsCharts statistics={statistics} />
      </section>

      {/* Reading Status & Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
          <h2 className="text-lg font-semibold mb-4">阅读状态分布</h2>
          <ReadingStatusChart
            unread={statistics.overview.readingStatus.unread}
            reading={statistics.overview.readingStatus.reading}
            read={statistics.overview.readingStatus.read}
          />
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
          <h2 className="text-lg font-semibold mb-4">数据来源分布</h2>
          <SourcesChart sources={statistics.sources} />
        </section>
      </div>

      {/* Publication Trends */}
      <section className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          发表趋势分析
        </h2>
        <PublicationTrendsChart byYear={statistics.publicationTrends.byYear} />
      </section>

      {/* Keywords & Authors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
          <h2 className="text-lg font-semibold mb-4">热门研究关键词</h2>
          <KeywordsChart topKeywords={statistics.keywords.top} />
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            最常读的作者
          </h2>
          <AuthorsChart topAuthors={statistics.authors.top} />
        </section>
      </div>

      {/* Journals Distribution */}
      <section className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
        <h2 className="text-lg font-semibold mb-4">期刊/会议分布</h2>
        <JournalsChart topJournals={statistics.journals.top} />
      </section>

      {/* Most Cited Papers */}
      <section className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          高引用文献 Top 10
        </h2>
        <MostCitedTable papers={statistics.mostCited} />
      </section>

      {/* Categories & Top Searches */}
      {statistics.categories.length > 0 && (
        <section className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
          <h2 className="text-lg font-semibold mb-4">分类统计</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {statistics.categories.map((cat) => (
              <div
                key={cat.categoryName}
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center"
              >
                <p className="text-2xl font-bold text-blue-600">{cat.count}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {cat.categoryName}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {statistics.topSearches.length > 0 && (
        <section className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
          <h2 className="text-lg font-semibold mb-4">热门搜索关键词</h2>
          <div className="flex flex-wrap gap-2">
            {statistics.topSearches.map((search) => (
              <span
                key={search.query}
                className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full text-sm"
              >
                <span>{search.query}</span>
                <span className="bg-blue-200 dark:bg-blue-800 px-2 py-0.5 rounded-full text-xs">
                  {search.count}
                </span>
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { BarChart3, TrendingUp, BookOpen, Users, Trophy } from 'lucide-react';
import {
  OverviewCards,
  ReadingStatusChart,
  PublicationTrendsChart,
  KeywordsChart,
  AuthorsChart,
  JournalsChart,
  SourcesChart,
  MostCitedTable
} from '@/components/statistics';
import { DashboardWidget } from '@/components/dashboard/DashboardWidget';
import { DashboardControls } from '@/components/dashboard/DashboardControls';
import {
  getDefaultLayout,
  loadLayout,
  saveLayout,
  resetLayout,
  type WidgetLayout,
  AVAILABLE_WIDGETS
} from '@/lib/dashboard-config';

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

interface DraggableWidget {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

export default function CustomizableStatisticsPage() {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [widgets, setWidgets] = useState<DraggableWidget[]>([]);
  const [edited, setEdited] = useState(false);

  // Load statistics data
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

  // Load widget layout
  useEffect(() => {
    const layout = loadLayout();
    const draggableWidgets: DraggableWidget[] = layout.map(w => ({
      id: w.i,
      x: w.x,
      y: w.y,
      width: w.w * 300, // Convert grid units to pixels
      height: w.h * 100,
      visible: w.visible !== false
    }));
    setWidgets(draggableWidgets);
  }, []);

  // Handle widget position/size change
  const handleWidgetChange = useCallback((widgetId: string, updates: Partial<DraggableWidget>) => {
    setWidgets(prev =>
      prev.map(w =>
        w.id === widgetId ? { ...w, ...updates } : w
      )
    );
    setEdited(true);
  }, []);

  // Save layout
  const handleSaveLayout = useCallback(() => {
    const layout: WidgetLayout[] = widgets.map(w => {
      const widgetConfig = AVAILABLE_WIDGETS.find(c => c.id === w.id)!;
      return {
        i: w.id,
        x: Math.round(w.x / 300),
        y: Math.round(w.y / 100),
        w: Math.round(w.width / 300),
        h: Math.round(w.height / 100),
        minW: widgetConfig.minSize?.w,
        minH: widgetConfig.minSize?.h,
        maxW: widgetConfig.maxSize?.w,
        maxH: widgetConfig.maxSize?.h,
        isDraggable: true,
        isResizable: true,
        visible: w.visible
      };
    });
    saveLayout(layout);
    setEdited(false);
    alert('布局已保存！');
  }, [widgets]);

  // Reset layout
  const handleResetLayout = useCallback(() => {
    if (confirm('确定要重置为默认布局吗？')) {
      const layout = resetLayout();
      const draggableWidgets: DraggableWidget[] = layout.map(w => ({
        id: w.i,
        x: w.x,
        y: w.y,
        width: w.w * 300,
        height: w.h * 100,
        visible: w.visible !== false
      }));
      setWidgets(draggableWidgets);
      setEdited(false);
    }
  }, []);

  // Toggle widget visibility
  const handleToggleWidget = useCallback((widgetId: string) => {
    setWidgets(prev =>
      prev.map(w =>
        w.id === widgetId ? { ...w, visible: !w.visible } : w
      )
    );
    setEdited(true);
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[600px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
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

  // Render widget content based on widget ID
  const renderWidgetContent = (widgetId: string) => {
    switch (widgetId) {
      case 'overview-cards':
        return <OverviewCards {...statistics.overview} />;
      case 'reading-status':
        return <ReadingStatusChart {...statistics.overview.readingStatus} />;
      case 'source-distribution':
        return <SourcesChart sources={statistics.sources} />;
      case 'publication-trends':
        return <PublicationTrendsChart byYear={statistics.publicationTrends.byYear} />;
      case 'keywords':
        return <KeywordsChart topKeywords={statistics.keywords.top} />;
      case 'authors':
        return <AuthorsChart topAuthors={statistics.authors.top} />;
      case 'journals':
        return <JournalsChart topJournals={statistics.journals.top} />;
      case 'most-cited':
        return <MostCitedTable papers={statistics.mostCited} />;
      case 'categories':
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {statistics.categories.map((cat) => (
              <div
                key={cat.categoryName}
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center"
              >
                <p className="text-2xl font-bold text-accent">{cat.count}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {cat.categoryName}
                </p>
              </div>
            ))}
          </div>
        );
      case 'top-searches':
        return (
          <div className="flex flex-wrap gap-2">
            {statistics.topSearches.map((search) => (
              <span
                key={search.query}
                className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 text-accent rounded-full text-sm"
              >
                <span>{search.query}</span>
                <span className="bg-accent/30 px-2 py-0.5 rounded-full text-xs">
                  {search.count}
                </span>
              </span>
            ))}
          </div>
        );
      default:
        return <div>未知组件</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-accent" />
                文献统计分析
              </h1>
              <p className="text-gray-600 mt-2">
                拖拽组件自定义你的仪表板
              </p>
            </div>
            {edited && (
              <div className="text-sm text-clay-600 font-medium">
                布局已更改，记得保存！
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dashboard Area */}
      <div className="relative p-4" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {widgets
          .filter(w => w.visible)
          .map((widget) => {
            const widgetConfig = AVAILABLE_WIDGETS.find(c => c.id === widget.id)!;
            return (
              <Rnd
                key={widget.id}
                size={{
                  width: widget.width,
                  height: widget.height
                }}
                position={{
                  x: widget.x,
                  y: widget.y
                }}
                onDragStop={(e, d) => {
                  handleWidgetChange(widget.id, { x: d.x, y: d.y });
                }}
                onResizeStop={(e, direction, ref, delta, position) => {
                  handleWidgetChange(widget.id, {
                    width: ref.offsetWidth,
                    height: ref.offsetHeight,
                    x: position.x,
                    y: position.y
                  });
                }}
                minWidth={widgetConfig.minSize?.w * 300 || 300}
                minHeight={widgetConfig.minSize?.h * 100 || 200}
                maxWidth={widgetConfig.maxSize?.w * 300 || undefined}
                maxHeight={widgetConfig.maxSize?.h * 100 || undefined}
                bounds="parent"
                className="absolute"
                dragHandleClassName="drag-handle"
              >
                <DashboardWidget
                  title={widgetConfig.title}
                  onRemove={() => handleToggleWidget(widget.id)}
                >
                  <div className="drag-handle cursor-move">
                    {renderWidgetContent(widget.id)}
                  </div>
                </DashboardWidget>
              </Rnd>
            );
          })}
      </div>

      {/* Control Panel */}
      <DashboardControls
        layout={widgets.map(w => ({
          i: w.id,
          x: Math.round(w.x / 300),
          y: Math.round(w.y / 100),
          w: Math.round(w.width / 300),
          h: Math.round(w.height / 100),
          visible: w.visible
        }))}
        onSave={handleSaveLayout}
        onReset={handleResetLayout}
        onToggleWidget={handleToggleWidget}
      />
    </div>
  );
}

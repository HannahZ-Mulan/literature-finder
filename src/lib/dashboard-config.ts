/**
 * Dashboard Widget Configuration
 * Defines available widgets and their default layouts
 */

export interface WidgetConfig {
  id: string;
  title: string;
  component: string;
  size: 'small' | 'medium' | 'large' | 'wide';
  defaultPosition: { x: number; y: number; w: number; h: number };
  minSize?: { w: number; h: number };
  maxSize?: { w: number; h: number };
}

export interface DashboardLayout {
  widgets: WidgetLayout[];
  edited: boolean;
}

export interface WidgetLayout {
  i: string; // widget id
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  isDraggable?: boolean;
  isResizable?: boolean;
  visible?: boolean;
}

// Available widgets configuration
export const AVAILABLE_WIDGETS: WidgetConfig[] = [
  {
    id: 'overview-cards',
    title: '总体概览',
    component: 'OverviewCards',
    size: 'wide',
    defaultPosition: { x: 0, y: 0, w: 4, h: 2 },
    minSize: { w: 4, h: 2 },
    maxSize: { w: 4, h: 2 }
  },
  {
    id: 'reading-status',
    title: '阅读状态分布',
    component: 'ReadingStatusChart',
    size: 'medium',
    defaultPosition: { x: 0, y: 2, w: 2, h: 3 }
  },
  {
    id: 'source-distribution',
    title: '数据来源分布',
    component: 'SourcesChart',
    size: 'medium',
    defaultPosition: { x: 2, y: 2, w: 2, h: 3 }
  },
  {
    id: 'publication-trends',
    title: '发表趋势分析',
    component: 'PublicationTrendsChart',
    size: 'large',
    defaultPosition: { x: 0, y: 5, w: 2, h: 4 }
  },
  {
    id: 'keywords',
    title: '热门研究关键词',
    component: 'KeywordsChart',
    size: 'large',
    defaultPosition: { x: 2, y: 5, w: 2, h: 4 }
  },
  {
    id: 'authors',
    title: '最常读的作者',
    component: 'AuthorsChart',
    size: 'large',
    defaultPosition: { x: 0, y: 9, w: 2, h: 4 }
  },
  {
    id: 'journals',
    title: '期刊/会议分布',
    component: 'JournalsChart',
    size: 'large',
    defaultPosition: { x: 2, y: 9, w: 2, h: 4 }
  },
  {
    id: 'most-cited',
    title: '高引用文献 Top 10',
    component: 'MostCitedTable',
    size: 'large',
    defaultPosition: { x: 0, y: 13, w: 4, h: 4 }
  },
  {
    id: 'categories',
    title: '分类统计',
    component: 'CategoriesStats',
    size: 'medium',
    defaultPosition: { x: 0, y: 17, w: 2, h: 2 }
  },
  {
    id: 'top-searches',
    title: '热门搜索关键词',
    component: 'TopSearches',
    size: 'medium',
    defaultPosition: { x: 2, y: 17, w: 2, h: 2 }
  }
];

// Get default layout
export function getDefaultLayout(): WidgetLayout[] {
  return AVAILABLE_WIDGETS.map(widget => ({
    i: widget.id,
    x: widget.defaultPosition.x,
    y: widget.defaultPosition.y,
    w: widget.defaultPosition.w,
    h: widget.defaultPosition.h,
    minW: widget.minSize?.w,
    minH: widget.minSize?.h,
    maxW: widget.maxSize?.w,
    maxH: widget.maxSize?.h,
    isDraggable: true,
    isResizable: true,
    visible: true
  }));
}

// Save layout to localStorage
export function saveLayout(layout: WidgetLayout[]): void {
  try {
    localStorage.setItem('dashboard-layout', JSON.stringify(layout));
  } catch (error) {
    console.error('Failed to save layout:', error);
  }
}

// Load layout from localStorage
export function loadLayout(): WidgetLayout[] {
  try {
    const saved = localStorage.getItem('dashboard-layout');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Failed to load layout:', error);
  }
  return getDefaultLayout();
}

// Reset layout to default
export function resetLayout(): WidgetLayout[] {
  localStorage.removeItem('dashboard-layout');
  return getDefaultLayout();
}

// Get visible widgets from layout
export function getVisibleWidgets(layout: WidgetLayout[]): string[] {
  return layout.filter(w => w.visible !== false).map(w => w.i);
}

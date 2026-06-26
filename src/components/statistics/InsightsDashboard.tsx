'use client';

import { AlertTriangle, Clock, AlertCircle, TrendingUp, Calendar, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface Insights {
  overdue: {
    count: number;
    items: Array<{
      item_id: number;
      literature_id: number;
      title: string;
      authors: string[];
      due_date: Date;
      priority: string;
    }>;
  };
  todayTasks: {
    count: number;
    items: Array<{
      item_id: number;
      literature_id: number;
      title: string;
      authors: string[];
      due_date: Date | null;
      priority: string;
      reading_status: string;
    }>;
  };
  weekTasks: number;
  neglected: {
    count: number;
    items: Array<{
      item_id: number;
      literature_id: number;
      title: string;
      authors: string[];
      days_since_added: number;
    }>;
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
  goals: {
    daily: {
      goal: number;
      completed: number;
      remaining: number;
      percentage: number;
    };
    weekly: {
      goal: number;
      completed: number;
      remaining: number;
      percentage: number;
    };
  };
}

interface InsightsDashboardProps {
  insights: Insights;
}

const priorityColors = {
  urgent: 'bg-destructive',
  high: 'bg-clay-500',
  medium: 'bg-accent',
  low: 'bg-sage-500',
};

const priorityLabels = {
  urgent: '紧急',
  high: '高',
  medium: '中',
  low: '低',
};

export function InsightsDashboard({ insights }: InsightsDashboardProps) {
  const formatDate = (date: Date | null | string) => {
    if (!date) return '无截止日期';
    const d = new Date(date);
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const isOverdue = (dueDate: Date | null | string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-sage-500';
    if (percentage >= 75) return 'bg-accent';
    if (percentage >= 50) return 'bg-clay-400';
    return 'bg-destructive';
  };

  const getProgressStatus = (percentage: number) => {
    if (percentage >= 100) return { text: '已完成', color: 'text-sage-600' };
    if (percentage >= 75) return { text: '进展良好', color: 'text-accent' };
    if (percentage >= 50) return { text: '继续加油', color: 'text-clay-500' };
    return { text: '需加快进度', color: 'text-destructive' };
  };

  return (
    <div className="space-y-6">
      {/* 今日待办 & 逾期提醒 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 今日待办 */}
        <Card className="border-accent/30">
          <CardHeader className="bg-accent/10">
            <CardTitle className="flex items-center gap-2 text-accent">
              <Calendar className="h-5 w-5" />
              今日待办 ({insights.todayTasks.count})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {insights.todayTasks.count === 0 ? (
              <p className="text-center text-muted-foreground py-8">今天没有待办任务 🎉</p>
            ) : (
              <div className="space-y-3">
                {insights.todayTasks.items.slice(0, 5).map((item) => (
                  <div
                    key={item.item_id}
                    className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    onClick={() => window.open(`/literature/${item.literature_id}`, '_blank')}
                  >
                    <div className={`w-2 h-2 rounded-full mt-2 ${priorityColors[item.priority as keyof typeof priorityColors]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-2">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.authors.slice(0, 2).join(', ')}
                        {item.authors.length > 2 && ' 等'}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-600">
                          {priorityLabels[item.priority as keyof typeof priorityLabels]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(item.due_date)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 逾期提醒 */}
        {insights.overdue.count > 0 && (
          <Card className="border-red-200 dark:border-red-800">
            <CardHeader className="bg-red-50 dark:bg-red-950">
              <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <AlertTriangle className="h-5 w-5" />
                已逾期 ({insights.overdue.count})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                {insights.overdue.items.slice(0, 5).map((item) => (
                  <div
                    key={item.item_id}
                    className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                    onClick={() => window.open(`/literature/${item.literature_id}`, '_blank')}
                  >
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-2">{item.title}</p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        截止: {formatDate(item.due_date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 本周任务 & 阅读时长 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 本周任务 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-clay-500" />
              本周待完成
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-clay-600">{insights.weekTasks}</p>
            <p className="text-xs text-muted-foreground mt-1">篇文献</p>
          </CardContent>
        </Card>

        {/* 预计阅读时长 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              预计阅读时长
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-accent">{insights.readingTime.totalEstimatedHours}</p>
            <p className="text-xs text-muted-foreground mt-1">小时 ({insights.readingTime.itemsTracked} 篇已设置)</p>
          </CardContent>
        </Card>

        {/* 实际阅读时长 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-sage-500" />
              实际阅读时长
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-sage-600">{insights.readingTime.totalActualHours}</p>
            <p className="text-xs text-muted-foreground mt-1">小时</p>
          </CardContent>
        </Card>
      </div>

      {/* 阅读目标进度 */}
      <Card className="border-sage-200 dark:border-sage-800">
        <CardHeader className="bg-sage-50 dark:bg-sage-900">
          <CardTitle className="flex items-center gap-2 text-sage-700 dark:text-sage-300">
            <Target className="h-5 w-5" />
            阅读目标进度
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 每日目标 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">今日目标</h3>
                  <p className="text-sm text-muted-foreground">已完成 {insights.goals.daily.completed} / {insights.goals.daily.goal} 篇</p>
                </div>
                <div className={`text-2xl font-bold ${getProgressStatus(insights.goals.daily.percentage).color}`}>
                  {insights.goals.daily.percentage}%
                </div>
              </div>
              <Progress
                value={Math.min(insights.goals.daily.percentage, 100)}
                className="h-3"
              />
              <div className="flex items-center justify-between text-sm">
                <span className={`font-medium ${getProgressStatus(insights.goals.daily.percentage).color}`}>
                  {getProgressStatus(insights.goals.daily.percentage).text}
                </span>
                {insights.goals.daily.remaining > 0 && (
                  <span className="text-muted-foreground">
                    还需阅读 {insights.goals.daily.remaining} 篇
                  </span>
                )}
              </div>
            </div>

            {/* 每周目标 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">本周目标</h3>
                  <p className="text-sm text-muted-foreground">已完成 {insights.goals.weekly.completed} / {insights.goals.weekly.goal} 篇</p>
                </div>
                <div className={`text-2xl font-bold ${getProgressStatus(insights.goals.weekly.percentage).color}`}>
                  {insights.goals.weekly.percentage}%
                </div>
              </div>
              <Progress
                value={Math.min(insights.goals.weekly.percentage, 100)}
                className="h-3"
              />
              <div className="flex items-center justify-between text-sm">
                <span className={`font-medium ${getProgressStatus(insights.goals.weekly.percentage).color}`}>
                  {getProgressStatus(insights.goals.weekly.percentage).text}
                </span>
                {insights.goals.weekly.remaining > 0 && (
                  <span className="text-muted-foreground">
                    还需阅读 {insights.goals.weekly.remaining} 篇
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 冷落文献提醒 */}
      {insights.neglected.count > 0 && (
        <Card className="border-clay-200 dark:border-clay-800">
          <CardHeader className="bg-clay-50 dark:bg-clay-900">
            <CardTitle className="flex items-center gap-2 text-clay-700 dark:text-clay-300">
              <Clock className="h-5 w-5" />
              冷落文献提醒 ({insights.neglected.count})
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              这些文献已添加 30 天以上但仍未阅读
            </p>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {insights.neglected.items.map((item) => (
                <div
                  key={item.item_id}
                  className="p-3 bg-clay-50 dark:bg-clay-900/30 rounded-lg hover:bg-clay-100 dark:hover:bg-clay-900/50 transition-colors cursor-pointer"
                  onClick={() => window.open(`/literature/${item.literature_id}`, '_blank')}
                >
                  <p className="font-medium text-sm line-clamp-2">{item.title}</p>
                  <p className="text-xs text-clay-600 dark:text-clay-400 mt-2">
                    {item.days_since_added} 天前添加
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 优先级分布 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">优先级分布</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 mb-2">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-2xl font-bold text-red-600">{insights.priorityDistribution.urgent}</p>
              <p className="text-sm text-muted-foreground">紧急</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-clay-100 dark:bg-clay-900 mb-2">
                <div className="w-4 h-4 rounded-full bg-clay-500" />
              </div>
              <p className="text-2xl font-bold text-clay-600">{insights.priorityDistribution.high}</p>
              <p className="text-sm text-muted-foreground">高</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent/15 mb-2">
                <div className="w-4 h-4 rounded-full bg-accent" />
              </div>
              <p className="text-2xl font-bold text-accent">{insights.priorityDistribution.medium}</p>
              <p className="text-sm text-muted-foreground">中</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-sage-100 dark:bg-sage-900 mb-2">
                <div className="w-4 h-4 rounded-full bg-sage-500" />
              </div>
              <p className="text-2xl font-bold text-sage-600">{insights.priorityDistribution.low}</p>
              <p className="text-sm text-muted-foreground">低</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

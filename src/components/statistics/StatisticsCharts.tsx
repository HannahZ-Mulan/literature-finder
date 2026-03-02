'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface StatisticsChartsProps {
  statistics: {
    overview: {
      readingStatus: {
        unread: number;
        reading: number;
        read: number;
      };
      completionRate: number;
    };
    insights: {
      priorityDistribution: {
        urgent: number;
        high: number;
        medium: number;
        low: number;
      };
    };
    sources: Array<{
      source: string;
      count: number;
    }>;
    readingActivity: {
      last30Days: Array<{
        date: string;
        action: string;
        count: number;
      }>;
    };
  };
}

// 优先级颜色
const PRIORITY_COLORS = {
  urgent: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

// 来源颜色
const SOURCE_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f59e0b', // amber
];

export function StatisticsCharts({ statistics }: StatisticsChartsProps) {
  // 1. 处理阅读活动数据（按日期聚合）
  const activityByDate = statistics.readingActivity.last30Days.reduce((acc, item) => {
    const date = item.date;
    if (!acc[date]) {
      acc[date] = { date, read: 0, viewed: 0 };
    }
    if (item.action === 'read') {
      acc[date].read += item.count;
    } else {
      acc[date].viewed += item.count;
    }
    return acc;
  }, {} as Record<string, { date: string; read: number; viewed: number }>);

  const activityData = Object.values(activityByDate).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  // 2. 优先级分布数据
  const priorityData = [
    { name: '紧急', value: statistics.insights.priorityDistribution.urgent, color: PRIORITY_COLORS.urgent },
    { name: '高', value: statistics.insights.priorityDistribution.high, color: PRIORITY_COLORS.high },
    { name: '中', value: statistics.insights.priorityDistribution.medium, color: PRIORITY_COLORS.medium },
    { name: '低', value: statistics.insights.priorityDistribution.low, color: PRIORITY_COLORS.low },
  ].filter(item => item.value > 0);

  // 3. 来源分布数据
  const sourceData = statistics.sources.map((item, index) => ({
    name: item.source.toUpperCase(),
    value: item.count,
    color: SOURCE_COLORS[index % SOURCE_COLORS.length],
  }));

  // 4. 阅读状态数据
  const statusData = [
    { name: '已读', value: statistics.overview.readingStatus.read },
    { name: '阅读中', value: statistics.overview.readingStatus.reading },
    { name: '未读', value: statistics.overview.readingStatus.unread },
  ];

  return (
    <div className="space-y-6">
      {/* 阅读趋势图 */}
      <Card>
        <CardHeader>
          <CardTitle>📈 最近30天阅读趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                className="text-xs"
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis className="text-xs" stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="read"
                stroke="#22c55e"
                strokeWidth={2}
                name="已完成"
                dot={{ fill: '#22c55e', r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="viewed"
                stroke="#3b82f6"
                strokeWidth={2}
                name="已查看"
                dot={{ fill: '#3b82f6', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 优先级分布 & 阅读完成率 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 优先级分布饼图 */}
        <Card>
          <CardHeader>
            <CardTitle>🎯 优先级分布</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 阅读完成率 */}
        <Card>
          <CardHeader>
            <CardTitle>📊 阅读状态分布</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#22c55e" /> {/* 已读 - 绿色 */}
                  <Cell fill="#3b82f6" /> {/* 阅读中 - 蓝色 */}
                  <Cell fill="#94a3b8" /> {/* 未读 - 灰色 */}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="text-center mt-4">
              <p className="text-3xl font-bold text-green-600">
                {statistics.overview.completionRate.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">整体完成率</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 来源分布柱状图 */}
      <Card>
        <CardHeader>
          <CardTitle>📚 文献来源分布</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sourceData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                className="text-xs"
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis className="text-xs" stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                {sourceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

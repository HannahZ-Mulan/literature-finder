'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface KeywordsChartProps {
  topKeywords: Array<{ keyword: string; count: number }>;
}

const COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#06b6d4', '#f97316', '#84cc16', '#14b8a6', '#a855f7'
];

export function KeywordsChart({ topKeywords }: KeywordsChartProps) {
  if (topKeywords.length === 0) {
    return (
      <div className="h-[350px] flex items-center justify-center text-gray-400">
        暂无关键词数据
      </div>
    );
  }

  // Capitalize first letter of each keyword for display
  const data = topKeywords.map(k => ({
    ...k,
    keyword: k.keyword.charAt(0).toUpperCase() + k.keyword.slice(1)
  }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data} layout="vertical" margin={{ left: 100 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis
          type="category"
          dataKey="keyword"
          width={90}
          tick={{ fontSize: 12 }}
        />
        <Tooltip />
        <Bar dataKey="count" name="出现次数">
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

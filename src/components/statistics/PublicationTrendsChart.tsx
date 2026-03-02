'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PublicationTrendsChartProps {
  byYear: Array<{ year: string; count: number }>;
}

export function PublicationTrendsChart({ byYear }: PublicationTrendsChartProps) {
  // Sort by year and limit to last 15 years for better visualization
  const sortedData = byYear
    .filter(d => d.year && d.year.match(/^\d{4}$/))
    .sort((a, b) => a.year.localeCompare(b.year))
    .slice(-15);

  if (sortedData.length === 0) {
    return (
      <div className="h-[350px] flex items-center justify-center text-gray-400">
        暂无发表趋势数据
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={sortedData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="year"
          angle={-45}
          textAnchor="end"
          height={80}
          fontSize={12}
        />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="count"
          stroke="#3b82f6"
          strokeWidth={2}
          name="文献数量"
          dot={{ fill: '#3b82f6', r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

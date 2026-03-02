'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AuthorsChartProps {
  topAuthors: Array<{ author: string; count: number }>;
}

export function AuthorsChart({ topAuthors }: AuthorsChartProps) {
  if (topAuthors.length === 0) {
    return (
      <div className="h-[350px] flex items-center justify-center text-gray-400">
        暂无作者数据
      </div>
    );
  }

  // Truncate long author names for display
  const data = topAuthors.map(a => ({
    ...a,
    author: a.author.length > 20 ? a.author.substring(0, 20) + '...' : a.author
  }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data} layout="vertical" margin={{ left: 100 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis
          type="category"
          dataKey="author"
          width={90}
          tick={{ fontSize: 11 }}
        />
        <Tooltip />
        <Bar dataKey="count" fill="#8b5cf6" name="文献数量" />
      </BarChart>
    </ResponsiveContainer>
  );
}

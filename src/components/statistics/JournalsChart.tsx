'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface JournalsChartProps {
  topJournals: Array<{ journal: string; count: number }>;
}

const COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#06b6d4', '#f97316', '#84cc16', '#14b8a6', '#a855f7',
  '#ef4444', '#f43f5e', '#d946ef', '#a855f7', '#6366f1'
];

export function JournalsChart({ topJournals }: JournalsChartProps) {
  if (topJournals.length === 0) {
    return (
      <div className="h-[350px] flex items-center justify-center text-gray-400">
        暂无期刊数据
      </div>
    );
  }

  // Truncate long journal names for display
  const data = topJournals.map(j => ({
    name: j.journal.length > 30 ? j.journal.substring(0, 30) + '...' : j.journal,
    value: j.count
  }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

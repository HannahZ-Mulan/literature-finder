'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface ReadingStatusChartProps {
  unread: number;
  reading: number;
  read: number;
}

const COLORS = {
  unread: '#94a3b8',
  reading: '#eab308',
  read: '#22c55e'
};

const LABELS = {
  unread: '未阅读',
  reading: '阅读中',
  read: '已完成'
};

export function ReadingStatusChart({ unread, reading, read }: ReadingStatusChartProps) {
  const data = [
    { name: LABELS.unread, value: unread, color: COLORS.unread },
    { name: LABELS.reading, value: reading, color: COLORS.reading },
    { name: LABELS.read, value: read, color: COLORS.read }
  ].filter(d => d.value > 0);

  const total = unread + reading + read;

  if (total === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-400">
        暂无阅读数据
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={true}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

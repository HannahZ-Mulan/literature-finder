'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface SourcesChartProps {
  sources: Array<{ source: string; count: number }>;
}

const SOURCE_COLORS: Record<string, string> = {
  'arxiv': '#ff6f61',
  'pubmed': '#4a90e2',
  'semantic-scholar': '#50c878',
  'crossref': '#9b59b6'
};

const SOURCE_LABELS: Record<string, string> = {
  'arxiv': 'arXiv',
  'pubmed': 'PubMed',
  'semantic-scholar': 'Semantic Scholar',
  'crossref': 'Crossref'
};

export function SourcesChart({ sources }: SourcesChartProps) {
  if (sources.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-400">
        暂无来源数据
      </div>
    );
  }

  const data = sources.map(s => ({
    name: SOURCE_LABELS[s.source] || s.source,
    value: s.count,
    color: SOURCE_COLORS[s.source] || '#999999'
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
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

'use client';

import { Trophy } from 'lucide-react';

interface MostCitedTableProps {
  papers: Array<{
    title: string;
    citationCount: number;
    authors: string;
  }>;
}

export function MostCitedTable({ papers }: MostCitedTableProps) {
  if (papers.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        暂无引用数据
      </div>
    );
  }

  const parseAuthors = (authorsJson: string) => {
    try {
      const authors = JSON.parse(authorsJson) as string[];
      return authors.slice(0, 3).join(', ') + (authors.length > 3 ? ' et al.' : '');
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className="space-y-3">
      {papers.map((paper, index) => (
        <div
          key={index}
          className="flex items-start gap-4 p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="flex-shrink-0">
            {index < 3 ? (
              <Trophy className={`h-6 w-6 ${
                index === 0 ? 'text-accent' :
                index === 1 ? 'text-muted-foreground/70' :
                'text-clay-600'
              }`} />
            ) : (
              <span className="text-lg font-bold text-muted-foreground/70">#{index + 1}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm line-clamp-2">{paper.title}</h4>
            <p className="text-xs text-muted-foreground mt-1">{parseAuthors(paper.authors)}</p>
          </div>
          <div className="flex-shrink-0">
            <div className="text-right">
              <span className="text-2xl font-bold text-accent">
                {paper.citationCount}
              </span>
              <p className="text-xs text-muted-foreground">引用</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

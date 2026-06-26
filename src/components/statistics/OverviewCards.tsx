'use client';

import { BookOpen, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface OverviewCardsProps {
  totalLiterature: number;
  readingStatus: {
    unread: number;
    reading: number;
    read: number;
  };
  completionRate: number;
}

export function OverviewCards({
  totalLiterature,
  readingStatus,
  completionRate
}: OverviewCardsProps) {
  const cards = [
    {
      title: '文献总数',
      value: totalLiterature,
      icon: BookOpen,
      color: 'text-accent',
      bgColor: 'bg-accent/10'
    },
    {
      title: '已完成',
      value: readingStatus.read,
      icon: CheckCircle,
      color: 'text-sage-600',
      bgColor: 'bg-sage-50 dark:bg-sage-900'
    },
    {
      title: '阅读中',
      value: readingStatus.reading,
      icon: Clock,
      color: 'text-clay-600',
      bgColor: 'bg-clay-50 dark:bg-clay-900'
    },
    {
      title: '未阅读',
      value: readingStatus.unread,
      icon: AlertCircle,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className={`${card.bgColor} rounded-lg p-6 border border-border`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {card.title}
              </p>
              <p className="text-3xl font-bold mt-2">{card.value}</p>
            </div>
            <card.icon className={`h-8 w-8 ${card.color}`} />
          </div>
        </div>
      ))}
      <div className="bg-accent/10 rounded-lg p-6 border border-accent/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              完成率
            </p>
            <p className="text-3xl font-bold mt-2 text-accent">
              {completionRate}%
            </p>
          </div>
          <div className="h-8 w-8 rounded-full border-4 border-accent flex items-center justify-center">
            <span className="text-xs font-bold text-accent">
              {Math.round(completionRate)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

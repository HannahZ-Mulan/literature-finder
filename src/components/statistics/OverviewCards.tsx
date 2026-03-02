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
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950'
    },
    {
      title: '已完成',
      value: readingStatus.read,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950'
    },
    {
      title: '阅读中',
      value: readingStatus.reading,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950'
    },
    {
      title: '未阅读',
      value: readingStatus.unread,
      icon: AlertCircle,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50 dark:bg-gray-950'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className={`${card.bgColor} rounded-lg p-6 border`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {card.title}
              </p>
              <p className="text-3xl font-bold mt-2">{card.value}</p>
            </div>
            <card.icon className={`h-8 w-8 ${card.color}`} />
          </div>
        </div>
      ))}
      <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              完成率
            </p>
            <p className="text-3xl font-bold mt-2 text-purple-600">
              {completionRate}%
            </p>
          </div>
          <div className="h-8 w-8 rounded-full border-4 border-purple-600 flex items-center justify-center">
            <span className="text-xs font-bold text-purple-600">
              {Math.round(completionRate)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

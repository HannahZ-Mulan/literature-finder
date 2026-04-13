'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';

interface CitationMessageProps {
  content: string;
  onCitationClick?: (citation: string) => void;
}

export function CitationMessage({ content, onCitationClick }: CitationMessageProps) {
  // 解析引用标注的正则表达式
  const citationRegex = /\[引用:\s*(开头部分|中间部分|结尾部分)\]/g;

  // 分割内容，保留引用标注
  const parts = content.split(citationRegex);

  // 渲染每个部分
  const renderContent = () => {
    const elements: React.ReactNode[] = [];

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      // 如果匹配到引用标注
      if (part === '开头部分' || part === '中间部分' || part === '结尾部分') {
        elements.push(
          <Badge
            key={`citation-${i}`}
            variant="outline"
            className="mx-1 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
            onClick={() => onCitationClick?.(part)}
          >
            <FileText className="w-3 h-3 mr-1" />
            {part === '开头部分' ? '引言/方法' :
             part === '中间部分' ? '结果/分析' : '结论/讨论'}
          </Badge>
        );
      } else if (part) {
        // 普通文本，渲染并保留换行
        elements.push(
          <span key={`text-${i}`} className="whitespace-pre-wrap">
            {part}
          </span>
        );
      }
    }

    return elements;
  };

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      {renderContent()}
    </div>
  );
}

// 辅助函数：提取引用位置
export function extractCitations(content: string): string[] {
  const citationRegex = /\[引用:\s*(开头部分|中间部分|结尾部分)\]/g;
  const citations: string[] = [];
  let match;

  while ((match = citationRegex.exec(content)) !== null) {
    citations.push(match[1]);
  }

  return citations;
}

// 辅助函数：根据引用位置估算PDF页码范围（简化版本）
export function estimatePageRange(citation: string, totalPages: number): { start: number; end: number } {
  if (!totalPages || totalPages <= 0) {
    return { start: 1, end: 1 };
  }

  switch (citation) {
    case '开头部分':
      // 前30%的页面
      return {
        start: 1,
        end: Math.max(1, Math.floor(totalPages * 0.3))
      };
    case '中间部分':
      // 中间40%的页面
      return {
        start: Math.floor(totalPages * 0.3) + 1,
        end: Math.floor(totalPages * 0.7)
      };
    case '结尾部分':
      // 后30%的页面
      return {
        start: Math.floor(totalPages * 0.7) + 1,
        end: totalPages
      };
    default:
      return { start: 1, end: 1 };
  }
}

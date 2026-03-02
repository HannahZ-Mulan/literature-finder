'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { CitationFormat } from '@/lib/citation/format';
import { formatCitation } from '@/lib/citation/format';

// 测试文献数据
const testLiterature = {
  id: 1,
  title: 'Deep Learning for Natural Language Processing: A Survey',
  authors: [
    { name: 'Zhang, Wei' },
    { name: 'Li, Ming' },
    { name: 'Wang, Xiaoming' },
    { name: 'Chen, Yuxin' }
  ],
  abstract: 'This paper provides a comprehensive survey of deep learning approaches applied to natural language processing tasks.',
  publication_date: '2023-03-15',
  journal: 'Journal of Artificial Intelligence Research',
  volume: '78',
  issue: '2',
  pages: '123-156',
  doi: '10.1234/jair.2023.001',
  citation_count: 245,
  source: 'semantic-scholar' as const,
  keywords: ['deep learning', 'natural language processing', 'neural networks'],
};

const formats: CitationFormat[] = ['apa', 'mla', 'chicago', 'harvard', 'vancouver'];

const formatNames: Record<CitationFormat, string> = {
  apa: 'APA 第7版',
  mla: 'MLA 第9版',
  chicago: 'Chicago 第18版 (作者-日期)',
  harvard: 'Harvard 引用格式',
  vancouver: 'Vancouver 引用格式',
};

export default function TestCitationPage() {
  const [selectedFormat, setSelectedFormat] = useState<CitationFormat>('apa');
  const [copied, setCopied] = useState(false);

  const citation = formatCitation(testLiterature, selectedFormat, testLiterature.id.toString());

  const handleCopy = async () => {
    await navigator.clipboard.writeText(citation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">引用格式测试页面</h1>
        <p className="text-muted-foreground">
          测试文献的不同学术引用格式
        </p>
      </div>

      {/* 文献信息 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>测试文献</CardTitle>
          <CardDescription>用于测试引用格式的文献数据</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <span className="font-semibold">标题：</span>
            {testLiterature.title}
          </div>
          <div>
            <span className="font-semibold">作者：</span>
            {testLiterature.authors.map((a, i) => (
              <span key={i}>
                {i > 0 && ', '}
                {a.name}
              </span>
            ))}
          </div>
          <div>
            <span className="font-semibold">期刊：</span>
            {testLiterature.journal}
          </div>
          <div>
            <span className="font-semibold">卷期：</span>
            Vol. {testLiterature.volume}, No. {testLiterature.issue}
          </div>
          <div>
            <span className="font-semibold">页码：</span>
            {testLiterature.pages}
          </div>
          <div>
            <span className="font-semibold">发表日期：</span>
            {testLiterature.publication_date}
          </div>
          <div>
            <span className="font-semibold">DOI：</span>
            {testLiterature.doi}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="font-semibold">关键词：</span>
            {testLiterature.keywords?.map((keyword, i) => (
              <Badge key={i} variant="secondary">
                {keyword}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 格式选择器 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>选择引用格式</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {formats.map((format) => (
              <Button
                key={format}
                variant={selectedFormat === format ? 'default' : 'outline'}
                onClick={() => setSelectedFormat(format)}
              >
                {formatNames[format]}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 引用结果 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{formatNames[selectedFormat]} 引用</CardTitle>
              <CardDescription>点击下方按钮复制引用</CardDescription>
            </div>
            <Button onClick={handleCopy}>
              {copied ? '✓ 已复制' : '📋 复制引用'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg">
            <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
              {citation}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 格式说明 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>格式说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h3 className="font-semibold mb-1">APA (American Psychological Association) 第7版</h3>
            <p className="text-muted-foreground">
              作者姓名使用首字母缩写，发表年份放在作者后括号内。
              期刊名和卷号使用斜体。
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-1">MLA (Modern Language Association) 第9版</h3>
            <p className="text-muted-foreground">
              作者姓名使用完整形式，期刊名使用斜体。
              在卷号前标注"vol."，期号前标注"no."。
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-1">Chicago 第18版 (作者-日期)</h3>
            <p className="text-muted-foreground">
              作者姓名使用完整形式，年份放在作者后。
              期刊名使用斜体，年份在期号后的括号中，页码前使用冒号。
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-1">Harvard 引用格式</h3>
            <p className="text-muted-foreground">
              作者姓名使用首字母缩写（无句点），年份放在括号内。
              文章标题使用单引号，期刊名使用斜体。
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-1">Vancouver 引用格式</h3>
            <p className="text-muted-foreground">
              使用数字编号系统，作者姓名使用首字母缩写（无句点）。
              年份后使用分号，卷号和期号间无空格，页码前使用冒号。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

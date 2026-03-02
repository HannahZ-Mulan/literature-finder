'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { CitationFormat } from '@/lib/citation/format-citation-js';
import { formatCitation } from '@/lib/citation/format-citation-js';

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

export default function TestCitationJsPage() {
  const [selectedFormat, setSelectedFormat] = useState<CitationFormat>('apa');
  const [copied, setCopied] = useState(false);
  const [citation, setCitation] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleFormatChange = async (format: CitationFormat) => {
    setSelectedFormat(format);
    setLoading(true);
    try {
      const result = await formatCitation(testLiterature, format, testLiterature.id.toString());
      setCitation(result);
    } catch (error) {
      console.error('Format error:', error);
      setCitation('格式生成失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(citation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 初始加载
  useEffect(() => {
    formatCitation(testLiterature, 'apa', testLiterature.id.toString()).then(setCitation);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Citation.js 引用格式测试</h1>
        <p className="text-muted-foreground">
          使用专业的 citation-js 库生成学术引用格式
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
                onClick={() => handleFormatChange(format)}
                disabled={loading}
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
            <Button onClick={handleCopy} disabled={loading || !citation}>
              {copied ? '✓ 已复制' : '📋 复制引用'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="bg-muted p-4 rounded-lg text-center">
              正在生成引用...
            </div>
          ) : (
            <div className="bg-muted p-4 rounded-lg">
              <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                {citation}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 格式说明 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>关于 Citation.js</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Citation.js 是一个专业的学术引用格式转换库，支持多种格式：
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li><strong>APA (American Psychological Association)</strong> - 第7版</li>
            <li><strong>MLA (Modern Language Association)</strong> - 第9版</li>
            <li><strong>Chicago</strong> - 第18版作者-日期格式</li>
            <li><strong>Harvard</strong> - 哈佛引用格式</li>
            <li><strong>Vancouver</strong> - 温哥华引用格式</li>
          </ul>
          <p className="text-muted-foreground">
            这个库使用 Citation Style Language (CSL) 标准，确保格式准确性。
          </p>
          <div className="bg-blue-50 p-3 rounded border border-blue-200">
            <p className="text-blue-900 text-xs">
              💡 提示：这是使用专业库生成的引用格式，比手动实现的格式更准确、更规范。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

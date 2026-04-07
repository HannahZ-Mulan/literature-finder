'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, Copy, Check, ClipboardList, FileDown, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type CitationFormat = 'bibtex' | 'endnote' | 'ris' | 'plain' | 'apa' | 'mla' | 'chicago' | 'harvard' | 'vancouver';

interface ExportButtonProps {
  literatureId: number;
  format?: 'button' | 'icon';
  // 批量导出支持
  literatureIds?: number[];
}

const formatInfo: Record<CitationFormat, { label: string; icon: string; description: string; extension: string }> = {
  bibtex: {
    label: 'BibTeX',
    icon: '📄',
    description: '用于LaTeX和BiBTeX',
    extension: 'bib'
  },
  endnote: {
    label: 'EndNote',
    icon: '📝',
    description: '用于EndNote软件',
    extension: 'enw'
  },
  ris: {
    label: 'RIS',
    icon: '📚',
    description: '通用引用格式',
    extension: 'ris'
  },
  plain: {
    label: '纯文本',
    icon: '📋',
    description: '普通文本格式',
    extension: 'txt'
  },
  apa: {
    label: 'APA',
    icon: '🎓',
    description: '美国心理学会格式',
    extension: 'txt'
  },
  mla: {
    label: 'MLA',
    icon: '📖',
    description: '现代语言协会格式',
    extension: 'txt'
  },
  chicago: {
    label: 'Chicago',
    icon: '🏛️',
    description: '芝加哥格式',
    extension: 'txt'
  },
  harvard: {
    label: 'Harvard',
    icon: '🎯',
    description: '哈佛引用格式',
    extension: 'txt'
  },
  vancouver: {
    label: 'Vancouver',
    icon: '⚕️',
    description: '医学文献格式',
    extension: 'txt'
  }
};

export function ExportButton({ literatureId, format = 'button', literatureIds }: ExportButtonProps) {
  const { toast } = useToast();
  const [copiedFormat, setCopiedFormat] = useState<CitationFormat | null>(null);
  const [isExporting, setIsExporting] = useState<CitationFormat | null>(null);
  const [isCopying, setIsCopying] = useState<CitationFormat | null>(null);
  const [hasExportedAll, setHasExportedAll] = useState(false);

  // 单篇导出/复制
  const handleExport = async (selectedFormat: CitationFormat) => {
    try {
      setIsExporting(selectedFormat);

      const response = await fetch(`/api/literature/${literatureId}/export?format=${selectedFormat}`);

      if (!response.ok) {
        throw new Error('导出失败');
      }

      const citation = await response.text();

      // Download as file
      const blob = new Blob([citation], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `citation_${selectedFormat}.${formatInfo[selectedFormat].extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: '导出成功',
        description: `已下载为 ${formatInfo[selectedFormat].label} 格式`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: '导出失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(null);
    }
  };

  const handleCopy = async (selectedFormat: CitationFormat) => {
    try {
      setIsCopying(selectedFormat);

      const response = await fetch(`/api/literature/${literatureId}/export?format=${selectedFormat}`);

      if (!response.ok) {
        throw new Error('复制失败');
      }

      const citation = await response.text();

      await navigator.clipboard.writeText(citation);
      setCopiedFormat(selectedFormat);

      toast({
        title: '复制成功',
        description: `已复制 ${formatInfo[selectedFormat].label} 格式到剪贴板`,
      });

      setTimeout(() => setCopiedFormat(null), 2000);
    } catch (error) {
      console.error('Copy error:', error);
      toast({
        title: '复制失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setIsCopying(null);
    }
  };

  // 复制全部引用格式（批量复制）
  const handleCopyAllFormats = async () => {
    try {
      setIsCopying('all' as CitationFormat);

      // 获取所有格式的引用
      const formats: CitationFormat[] = ['apa', 'mla', 'chicago', 'harvard', 'vancouver', 'bibtex'];
      const citations: Record<CitationFormat, string> = {} as any;

      // 并行获取所有格式
      await Promise.all(formats.map(async (fmt) => {
        const response = await fetch(`/api/literature/${literatureId}/export?format=${fmt}`);
        if (response.ok) {
          citations[fmt] = await response.text();
        }
      }));

      // 组合成一个大的文本
      let allCitations = '=== 文献引用 ===\n\n';

      for (const fmt of formats) {
        if (citations[fmt]) {
          allCitations += `--- ${formatInfo[fmt].label} (${fmt.toUpperCase()}) ---\n`;
          allCitations += citations[fmt];
          allCitations += '\n\n';
        }
      }

      await navigator.clipboard.writeText(allCitations);

      toast({
        title: '复制成功',
        description: '已复制所有引用格式到剪贴板',
      });

      setTimeout(() => setIsCopying(null), 2000);
    } catch (error) {
      console.error('Copy all error:', error);
      toast({
        title: '复制失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setIsCopying(null);
    }
  };

  // 批量导出所有格式
  const handleExportAllFormats = async () => {
    try {
      setIsExporting('all' as CitationFormat);

      const formats: CitationFormat[] = ['apa', 'mla', 'chicago', 'harvard', 'vancouver', 'bibtex'];

      for (const fmt of formats) {
        const response = await fetch(`/api/literature/${literatureId}/export?format=${fmt}`);
        if (!response.ok) continue;

        const citation = await response.text();

        // 下载每个格式
        const blob = new Blob([citation], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `citation_${fmt}.${formatInfo[fmt].extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // 小延迟避免浏览器阻止多个下载
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      setHasExportedAll(true);

      toast({
        title: '导出完成',
        description: '已导出所有 6 种格式',
      });

      setTimeout(() => setHasExportedAll(false), 3000);
    } catch (error) {
      console.error('Export all error:', error);
      toast({
        title: '导出失败',
        description: '部分格式可能导出失败',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(null);
    }
  };

  // 批量导出（多文献列表）
  const handleBatchExport = async (format: CitationFormat) => {
    if (!literatureIds || literatureIds.length === 0) {
      toast({
        title: '导出失败',
        description: '没有选择要导出的文献',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsExporting(format);

      const response = await fetch('/api/literature/batch/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: literatureIds,
          format: format,
        }),
      });

      if (!response.ok) {
        throw new Error('批量导出失败');
      }

      const citations = await response.text();

      // 下载批量导出文件
      const blob = new Blob([citations], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `citations_batch_${format}.${formatInfo[format].extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: '导出成功',
        description: `已导出 ${literatureIds.length} 篇文献的 ${formatInfo[format].label} 格式`,
      });
    } catch (error) {
      console.error('Batch export error:', error);
      toast({
        title: '导出失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(null);
    }
  };

  if (format === 'icon') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <Download className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => handleCopyAllFormats()}>
            <Copy className="w-4 h-4 mr-2" />
            复制全部格式
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {(Object.keys(formatInfo) as CitationFormat[]).slice(0, 5).map((fmt) => (
            <DropdownMenuItem key={fmt} onClick={() => handleCopy(fmt)}>
              <span className="mr-2">{formatInfo[fmt].icon}</span>
              <span className="text-sm">复制 {formatInfo[fmt].label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={isExporting !== null || isCopying !== null}>
          {isExporting ? (
            <>
              <Download className="w-4 h-4 mr-2 animate-spin" />
              导出中...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              导出引用
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        {/* 快捷操作区域 */}
        <div className="px-2 py-2 border-b bg-muted/30">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8"
              onClick={handleCopyAllFormats}
              disabled={isCopying !== null}
            >
              <Copy className="w-3 h-3 mr-1" />
              复制全部
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8"
              onClick={handleExportAllFormats}
              disabled={isExporting !== null}
            >
              <FileDown className="w-3 h-3 mr-1" />
              导出全部
            </Button>
          </div>
        </div>

        {/* 格式列表 */}
        {(Object.keys(formatInfo) as CitationFormat[]).map((fmt, index) => {
          const isLoading = isExporting === fmt || isCopying === fmt;

          return (
            <div key={fmt} className="px-2 py-2">
              {index > 0 && <div className="h-px bg-border mx-2" />}
              <div className="flex items-center gap-2">
                <span className="text-lg">{formatInfo[fmt].icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{formatInfo[fmt].label}</p>
                    <span className="text-xs text-muted-foreground">{fmt.toUpperCase()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{formatInfo[fmt].description}</p>
                </div>
              </div>
              <div className="flex gap-1 ml-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => handleCopy(fmt)}
                  disabled={isLoading}
                  title={`复制 ${formatInfo[fmt].label} 格式`}
                >
                  <Copy className="w-3 h-3" />
                  {isCopying === fmt ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => handleExport(fmt)}
                  disabled={isLoading}
                  title={`下载 ${formatInfo[fmt].label} 文件`}
                >
                  <Download className="w-3 h-3" />
                  {isExporting === fmt ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                </Button>
              </div>
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

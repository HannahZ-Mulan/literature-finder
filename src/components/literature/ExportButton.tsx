'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type CitationFormat = 'bibtex' | 'endnote' | 'ris' | 'plain' | 'apa' | 'mla' | 'chicago' | 'harvard' | 'vancouver';

interface ExportButtonProps {
  literatureId: number;
  format?: 'button' | 'icon';
}

const formatInfo: Record<CitationFormat, { label: string; icon: string; description: string }> = {
  bibtex: {
    label: 'BibTeX',
    icon: '📄',
    description: '用于LaTeX和BiBTeX'
  },
  endnote: {
    label: 'EndNote',
    icon: '📝',
    description: '用于EndNote软件'
  },
  ris: {
    label: 'RIS',
    icon: '📚',
    description: '通用引用格式'
  },
  plain: {
    label: '纯文本',
    icon: '📋',
    description: '普通文本格式'
  },
  apa: {
    label: 'APA',
    icon: '🎓',
    description: '美国心理学会格式'
  },
  mla: {
    label: 'MLA',
    icon: '📖',
    description: '现代语言协会格式'
  },
  chicago: {
    label: 'Chicago',
    icon: '🏛️',
    description: '芝加哥格式'
  },
  harvard: {
    label: 'Harvard',
    icon: '🎯',
    description: '哈佛引用格式'
  },
  vancouver: {
    label: 'Vancouver',
    icon: '⚕️',
    description: '医学文献格式'
  }
};

export function ExportButton({ literatureId, format = 'button' }: ExportButtonProps) {
  const { toast } = useToast();
  const [copiedFormat, setCopiedFormat] = useState<CitationFormat | null>(null);

  const handleExport = async (selectedFormat: CitationFormat) => {
    try {
      const response = await fetch(`/api/literature/${literatureId}/export?format=${selectedFormat}`);

      if (!response.ok) {
        throw new Error('导出失败');
      }

      const citation = await response.text();

      // Download as file
      const extension =
        selectedFormat === 'bibtex' ? 'bib' :
        selectedFormat === 'endnote' ? 'enw' :
        selectedFormat === 'ris' ? 'ris' :
        selectedFormat === 'plain' ? 'txt' :
        selectedFormat === 'apa' ? 'txt' :
        selectedFormat === 'mla' ? 'txt' :
        selectedFormat === 'chicago' ? 'txt' :
        selectedFormat === 'harvard' ? 'txt' :
        selectedFormat === 'vancouver' ? 'txt' : 'txt';

      const blob = new Blob([citation], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `citation_${literatureId}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: '导出成功',
        description: `已导出为${formatInfo[selectedFormat].label}格式`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: '导出失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleCopy = async (selectedFormat: CitationFormat) => {
    try {
      const response = await fetch(`/api/literature/${literatureId}/export?format=${selectedFormat}`);

      if (!response.ok) {
        throw new Error('复制失败');
      }

      const citation = await response.text();

      await navigator.clipboard.writeText(citation);
      setCopiedFormat(selectedFormat);

      toast({
        title: '复制成功',
        description: `已复制${formatInfo[selectedFormat].label}格式到剪贴板`,
      });

      setTimeout(() => setCopiedFormat(null), 2000);
    } catch (error) {
      console.error('Copy error:', error);
      toast({
        title: '复制失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
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
        <DropdownMenuContent align="end" className="w-48">
          {(Object.keys(formatInfo) as CitationFormat[]).map((fmt) => (
            <DropdownMenuItem key={fmt} onClick={() => handleExport(fmt)}>
              <span className="mr-2">{formatInfo[fmt].icon}</span>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{formatInfo[fmt].label}</span>
                <span className="text-xs text-muted-foreground">{formatInfo[fmt].description}</span>
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleCopy('bibtex')}>
            <Copy className="w-4 h-4 mr-2" />
            复制 BibTeX
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <Download className="w-4 h-4 mr-2" />
          导出引用
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 max-h-96 overflow-y-auto">
        {(Object.keys(formatInfo) as CitationFormat[]).map((fmt) => (
          <div key={fmt} className="px-1">
            <div className="flex items-center gap-1 px-2 py-1.5">
              <span className="text-lg">{formatInfo[fmt].icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{formatInfo[fmt].label}</p>
                <p className="text-xs text-muted-foreground truncate">{formatInfo[fmt].description}</p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => handleCopy(fmt)}
                  title={`复制${formatInfo[fmt].label}格式`}
                >
                  <Copy className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => handleExport(fmt)}
                  title={`下载${formatInfo[fmt].label}格式`}
                >
                  <Download className="w-3 h-3" />
                </Button>
              </div>
            </div>
            {fmt !== Object.keys(formatInfo)[Object.keys(formatInfo).length - 1] && (
              <div className="px-2 pb-1">
                <div className="h-px bg-border" />
              </div>
            )}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

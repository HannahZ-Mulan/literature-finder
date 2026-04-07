'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Check, ExternalLink, FileText, Folder, BookOpen, Wand, ChevronDown, Save, Download, Search, MessageSquare, Sparkles } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TagSelector } from '@/components/tag-selector';
import { LiteratureNoteSidebar } from '@/components/notes/LiteratureNoteSidebar';
import { ExportButton } from '@/components/literature/ExportButton';

// 动态导入 PDFViewer，禁用 SSR
const PDFViewer = dynamic(
  () => import('@/components/pdf-viewer').then(mod => ({ default: mod.PDFViewer })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    ),
  }
);

interface Literature {
  id: number;
  title: string;
  authors: string;
  abstract: string | null;
  doi: string | null;
  publication_date: string | null;
  journal: string | null;
  citation_count: number;
  source: string;
  keywords: string | null;
  pdf_url: string | null;
}

type SummaryLength = 'short' | 'medium' | 'detailed';

export default function LiteratureDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [literature, setLiterature] = useState<Literature | null>(null);
  const [isLoadingLiterature, setIsLoadingLiterature] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // AI Summary states
  const [summary, setSummary] = useState('');
  const [summaryLength, setSummaryLength] = useState<SummaryLength>('medium');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [existingSummary, setExistingSummary] = useState<{ content: string; length_level: string } | null>(null);

  // AI Insights states
  const [insights, setInsights] = useState<any>(null);
  const [isExtractingInsights, setIsExtractingInsights] = useState(false);

  // AI Chat states
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isChatting, setIsChatting] = useState(false);
  const [showChat, setShowChat] = useState(false);


  // Quick actions states
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [readingLists, setReadingLists] = useState<Array<{ id: number; name: string; description?: string }>>([]);
  const [tags, setTags] = useState<Array<{ id: number; name: string; color: string }>>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingReadingLists, setIsLoadingReadingLists] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchLiterature();
      checkIfSaved();
    }
  }, [id]);

  const checkIfSaved = async () => {
    try {
      const response = await fetch('/api/literature/library?limit=1000');
      if (response.ok) {
        const data = await response.json();
        const savedIds = new Set(data.literature.map((lit: any) => lit.id));
        setIsSaved(savedIds.has(parseInt(id as string)));
      }
    } catch {
      setIsSaved(false);
    }
  };

  const fetchLiterature = async () => {
    try {
      // 测试模式：不需要 token
      const response = await fetch(`/api/literature/${id}`);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch literature');
      }

      // 转换数据库字段名（蛇形命名转驼峰命名）
      const lit = data.literature;
      const transformedLiterature: Literature = {
        id: lit.id,
        title: lit.title,
        authors: lit.authors || [],
        abstract: lit.abstract || '',
        publishedDate: lit.publication_date || '',
        journal: lit.journal,
        conference: lit.conference,
        doi: lit.doi,
        citationCount: lit.citation_count,
        keywords: lit.keywords ? JSON.parse(lit.keywords) : [],
        source: lit.source,
        sourceUrl: lit.source_url || lit.url,
        pdfUrl: lit.pdf_url,
        categories: lit.categories ? JSON.parse(lit.categories) : [],
      };

      setLiterature(transformedLiterature);
      // Also fetch tags when literature is loaded
      fetchTags();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingLiterature(false);
    }
  };

  const fetchCategories = async () => {
    setIsLoadingCategories(true);
    try {
      // 测试模式：不需要 token
      const response = await fetch('/api/categories');
      if (response.ok) {
        const result = await response.json();
        setCategories(result.categories || []);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const fetchReadingLists = async () => {
    setIsLoadingReadingLists(true);
    try {
      // 测试模式：不需要 token
      const response = await fetch('/api/reading-lists');
      if (response.ok) {
        const result = await response.json();
        setReadingLists(result.reading_lists || []);
      }
    } catch (err) {
      console.error('Failed to fetch reading lists:', err);
    } finally {
      setIsLoadingReadingLists(false);
    }
  };

  const fetchTags = async () => {
    try {
      // 测试模式：不需要 token
      const response = await fetch(`/api/literature/${id}/tags/list`);
      if (response.ok) {
        const result = await response.json();
        setTags(result.tags || []);
      }
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    }
  };

  const handleAddToCategory = async (categoryId: number) => {
    setIsLoadingCategories(true);
    setError('');
    try {
      // 测试模式：不需要 token
      const response = await fetch(`/api/literature/${id}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ category_id: categoryId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '添加失败');
      }

      const categoryName = categories.find(c => c.id === categoryId)?.name || '分类';
      setSuccessMessage(`已添加到 "${categoryName}"`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handleExport = async (format: string) => {
    setIsExporting(true);
    setError('');
    setSuccessMessage('');
    try {
      const response = await fetch(`/api/literature/${id}/export?format=${format}`);

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const citationText = await response.text();
      await navigator.clipboard.writeText(citationText);

      setSuccessMessage(`${format.toUpperCase()} 引用已复制到剪贴板`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError('导出失败: ' + err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  const fetchSummary = async (length: SummaryLength) => {
    try {
      // 测试模式：不需要 token
      const response = await fetch(`/api/literature/${id}/summary?length_level=${length}`);

      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
        setExistingSummary({ content: data.summary, length_level: data.length_level });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleGenerateSummary = async () => {
    if (!literature?.abstract) {
      setError('无法生成摘要：该文献没有摘要');
      return;
    }

    setIsGeneratingSummary(true);
    setError('');

    try {
      // 测试模式：不需要 token
      const response = await fetch(`/api/literature/${id}/summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ length_level: summaryLength }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '生成摘要失败');
      }

      setSummary(data.summary);
      setExistingSummary({ content: data.summary, length_level: data.length_level });
      setSuccessMessage('摘要生成成功！');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleExtractInsights = async () => {
    if (!literature?.abstract) {
      setError('无法提取洞察：该文献没有摘要');
      return;
    }

    setIsExtractingInsights(true);
    setError('');

    try {
      const response = await fetch(`/api/literature/${id}/insights`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '提取洞察失败');
      }

      setInsights(data.insights);
      setSuccessMessage('洞察提取成功！');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsExtractingInsights(false);
    }
  };

  const handleChat = async () => {
    if (!chatQuestion.trim()) return;

    setIsChatting(true);
    setError('');

    // Add user question to history
    const newHistory = [...chatHistory, { role: 'user' as const, content: chatQuestion }];
    setChatHistory(newHistory);

    try {
      const response = await fetch(`/api/literature/${id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: chatQuestion,
          chat_history: chatHistory.map(h => ({ role: h.role, content: h.content })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '聊天失败');
      }

      // Add assistant response to history
      setChatHistory([...newHistory, { role: 'assistant' as const, content: data.answer }]);
      setChatQuestion('');
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsChatting(false);
    }
  };

  const handleSave = async () => {
    if (!literature) return;

    setIsSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      // Safe JSON parsing
      let authors: Array<{ name: string }> = [];
      try {
        authors = JSON.parse(literature.authors || '[]');
      } catch {
        authors = [{ name: 'Unknown Author' }];
      }

      let keywords: string[] | null = null;
      try {
        keywords = literature.keywords ? JSON.parse(literature.keywords) : null;
      } catch {
        keywords = null;
      }

      const response = await fetch('/api/literature/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: literature.title,
          authors,
          abstract: literature.abstract,
          publication_date: literature.publication_date,
          journal: literature.journal,
          source: literature.source,
          keywords,
          pdf_url: literature.pdf_url,
          citation_count: literature.citation_count,
        }),
      });

      if (response.ok) {
        setIsSaved(true);
        setSuccessMessage('文献已保存到库！');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const data = await response.json();
        if (data.message === 'Literature already in library') {
          setIsSaved(true);
          setSuccessMessage('文献已在库中');
          setTimeout(() => setSuccessMessage(''), 3000);
        } else {
          throw new Error(data.error || '保存失败');
        }
      }
    } catch (err: any) {
      setError('保存失败: ' + err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingLiterature) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="ml-4">加载中...</p>
        </div>
      </div>
    );
  }

  if (!literature) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-md mx-auto">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">未找到文献</p>
            <Button onClick={() => router.push('/library')}>返回文献库</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Safe JSON parsing with fallback
  let authors: Array<{ name: string }> = [];
  try {
    authors = JSON.parse(literature.authors || '[]');
  } catch {
    authors = [{ name: 'Unknown Author' }];
  }

  let keywords: string[] = [];
  try {
    keywords = literature.keywords ? JSON.parse(literature.keywords) : [];
  } catch {
    keywords = [];
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span className="text-sm">{successMessage}</span>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-2xl">{literature.title || 'Untitled'}</CardTitle>
                <div className="text-muted-foreground mt-1">
                  {Array.isArray(authors) ? authors.map((a: any) => a?.name || 'Unknown').join(', ') : 'Unknown Author'}
                </div>
              </div>
              <ExportButton literatureId={parseInt(id as string)} format="button" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">期刊：</span>
                <span className="text-muted-foreground">{literature.journal || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium">发表年份：</span>
                <span className="text-muted-foreground">
                  {literature.publication_date ? new Date(literature.publication_date).getFullYear() : 'N/A'}
                </span>
              </div>
              <div>
                <span className="font-medium">引用数：</span>
                <span className="text-muted-foreground">{literature.citation_count ?? 0}</span>
              </div>
              {literature.doi && (
                <div>
                  <span className="font-medium">DOI：</span>
                  <a
                    href={`https://doi.org/${literature.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {literature.doi}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {Array.isArray(keywords) && keywords.length > 0 && (
              <div>
                <span className="font-medium text-sm mb-2 block">关键词：</span>
                <div className="flex flex-wrap gap-2">
                  {keywords.map((keyword: string, index: number) => (
                    <Badge key={index} variant="outline">{keyword || ''}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Abstract */}
            {literature.abstract && (
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  摘要
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed text-justify">
                  {literature.abstract}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions: Categories, Tags, Reading Lists */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">快速操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <DropdownMenu onOpenChange={(open) => {
                if (open && categories.length === 0) {
                  fetchCategories();
                }
              }}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={isLoadingCategories}>
                    {isLoadingCategories ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <>
                        <Folder className="w-4 h-4 mr-2" />
                        添加到分类
                        <ChevronDown className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {categories.map((category) => (
                    <DropdownMenuItem
                      key={category.id}
                      onClick={() => handleAddToCategory(category.id)}
                      disabled={isLoadingCategories}
                    >
                      <Folder className="w-4 h-4 mr-2" />
                      <span>{category.name}</span>
                    </DropdownMenuItem>
                  ))}
                  {categories.length === 0 && !isLoadingCategories && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      暂无分类
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu onOpenChange={(open) => {
                if (open && readingLists.length === 0) {
                  fetchReadingLists();
                }
              }}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={isLoadingReadingLists}>
                    {isLoadingReadingLists ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <>
                        <BookOpen className="w-4 h-4 mr-2" />
                        添加到列表
                        <ChevronDown className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {readingLists.map((list) => (
                    <DropdownMenuItem
                      key={list.id}
                      onClick={async () => {
                        setIsLoadingReadingLists(true);
                        try {
                          // 测试模式：不需要 token
                          const response = await fetch(`/api/literature/${id}/reading-lists`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ reading_list_id: list.id }),
                          });
                          if (response.ok) {
                            setSuccessMessage(`已添加到 "${list.name}"`);
                            setTimeout(() => setSuccessMessage(''), 3000);
                          } else {
                            const data = await response.json();
                            setError('添加失败: ' + (data.error || '未知错误'));
                          }
                        } catch (err) {
                          setError('添加失败');
                        } finally {
                          setIsLoadingReadingLists(false);
                        }
                      }}
                      disabled={isLoadingReadingLists}
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      <div className="flex flex-col">
                        <span className="font-medium">{list.name}</span>
                        {list.description && (
                          <span className="text-xs text-muted-foreground">{list.description}</span>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                  {readingLists.length === 0 && !isLoadingReadingLists && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      暂无阅读列表
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div>
              <span className="text-sm font-medium mb-2 block">标签</span>
              <TagSelector
                literatureId={parseInt(id as string)}
                currentTags={tags}
                onUpdate={fetchTags}
              />
            </div>
          </CardContent>
        </Card>

        {/* AI Summary Generation */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wand className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              AI 智能摘要生成
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <span className="text-sm font-medium whitespace-nowrap">摘要长度：</span>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={summaryLength === 'short' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSummaryLength('short');
                    fetchSummary('short');
                  }}
                  disabled={isGeneratingSummary}
                >
                  简短 (100字)
                </Button>
                <Button
                  variant={summaryLength === 'medium' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSummaryLength('medium');
                    fetchSummary('medium');
                  }}
                  disabled={isGeneratingSummary}
                >
                  中等 (300-500字)
                </Button>
                <Button
                  variant={summaryLength === 'detailed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSummaryLength('detailed');
                    fetchSummary('detailed');
                  }}
                  disabled={isGeneratingSummary}
                >
                  详细 (800-1200字)
                </Button>
              </div>
              <Button
                onClick={handleGenerateSummary}
                disabled={isGeneratingSummary}
                className="ml-auto"
              >
                {isGeneratingSummary ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Wand className="w-4 h-4 mr-2" />
                    {summary ? '重新生成' : '生成摘要'}
                  </>
                )}
              </Button>
            </div>

            {isGeneratingSummary && (
              <div className="flex items-center justify-center py-8 bg-white/50 dark:bg-black/20 rounded-lg">
                <Loader2 className="w-6 h-6 animate-spin mr-3 text-blue-600" />
                <span className="text-sm text-muted-foreground">AI 正在生成摘要，请稍候...</span>
              </div>
            )}

            {summary && !isGeneratingSummary && (
              <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-sm">
                    AI 生成的摘要 ({summaryLength === 'short' ? '简短' : summaryLength === 'medium' ? '中等' : '详细'})
                    {existingSummary && (
                      <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                        ✓ 已缓存
                      </span>
                    )}
                  </h4>
                </div>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {summary}
                  </p>
                </div>
              </div>
            )}

            {!summary && !isGeneratingSummary && (
              <div className="text-center py-8 text-muted-foreground bg-white/50 dark:bg-black/20 rounded-lg">
                <Wand className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">选择摘要长度并点击生成按钮，AI 将为您生成文献摘要</p>
                <p className="text-xs mt-1">摘要将包含：研究背景、核心方法、主要结果、关键结论</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Insights Extraction */}
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              AI 洞察提取
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                提取论文的关键洞察，包括研究问题、方法、发现、局限性和未来工作
              </p>
              <Button
                onClick={handleExtractInsights}
                disabled={isExtractingInsights}
                size="sm"
              >
                {isExtractingInsights ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    提取中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    提取洞察
                  </>
                )}
              </Button>
            </div>

            {isExtractingInsights && (
              <div className="flex items-center justify-center py-8 bg-white/50 dark:bg-black/20 rounded-lg">
                <Loader2 className="w-6 h-6 animate-spin mr-3 text-purple-600" />
                <span className="text-sm text-muted-foreground">AI 正在分析论文...</span>
              </div>
            )}

            {insights && !isExtractingInsights && (
              <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-purple-200 dark:border-purple-800 space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-purple-700 dark:text-purple-300">🔍 研究问题</h4>
                    <p className="text-sm text-muted-foreground">{insights.research_question}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-purple-700 dark:text-purple-300">⚙️ 方法论</h4>
                    <p className="text-sm text-muted-foreground">{insights.methodology}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-purple-700 dark:text-purple-300">🎯 关键发现</h4>
                    <p className="text-sm text-muted-foreground">{insights.key_findings}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-purple-700 dark:text-purple-300">⚠️ 局限性</h4>
                    <p className="text-sm text-muted-foreground">{insights.limitations}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-purple-700 dark:text-purple-300">🚀 未来工作</h4>
                    <p className="text-sm text-muted-foreground">{insights.future_work}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Chat with Paper */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
              AI 对话助手
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showChat ? (
              <div className="text-center py-6">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50 text-green-600" />
                <p className="text-sm text-muted-foreground mb-3">
                  向 AI 提问关于这篇论文的任何问题
                </p>
                <Button onClick={() => setShowChat(true)} variant="outline">
                  开始对话
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Chat History */}
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-green-200 dark:border-green-800 p-4 max-h-96 overflow-y-auto space-y-3">
                  {chatHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      开始提问吧！例如："这篇论文的主要贡献是什么？"
                    </p>
                  ) : (
                    chatHistory.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-lg p-3 ${
                          msg.role === 'user'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                        }`}>
                          <p className="text-sm">{msg.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                  {isChatting && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                        <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatQuestion}
                    onChange={(e) => setChatQuestion(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isChatting && handleChat()}
                    placeholder="输入您的问题..."
                    disabled={isChatting}
                    className="flex-1 px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <Button
                    onClick={handleChat}
                    disabled={isChatting || !chatQuestion.trim()}
                    size="sm"
                  >
                    {isChatting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4 mr-1" />
                        发送
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* PDF Preview - 只在有 PDF 时显示完整的预览卡片 */}
        {literature.pdf_url ? (
          <Card className="border-green-200 dark:border-green-900">
            <CardHeader>
              <CardTitle className="flex items-center justify-between flex-wrap gap-y-2">
                <div className="flex items-center gap-2 text-lg">
                  <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span>PDF 预览</span>
                  <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full">
                    📖 免费全文
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" disabled={isExporting}>
                        {isExporting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            导出中...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-1" />
                            导出引用
                          </>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleExport('apa')}>
                        APA 格式
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport('mla')}>
                        MLA 格式
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport('chicago')}>
                        Chicago 格式
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport('harvard')}>
                        Harvard 格式
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport('vancouver')}>
                        Vancouver 格式
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport('bibtex')}>
                        BibTeX 格式
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => router.push(`/literature/${id}/read`)}
                  >
                    <BookOpen className="w-4 h-4 mr-1" />
                    阅读模式
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (typeof window !== 'undefined' && literature.pdf_url) {
                        window.open(literature.pdf_url, '_blank');
                      }
                    }}
                  >
                    在新窗口打开
                  </Button>
                  <Button
                    variant={isSaved ? "default" : "outline"}
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                    title={isSaved ? "文献已在库中" : "保存到库"}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        保存中...
                      </>
                    ) : isSaved ? (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        已保存
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-1" />
                        保存
                      </>
                    )}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <PDFViewer url={literature.pdf_url} title={literature.title} />
            </CardContent>
          </Card>
        ) : (
          <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-medium">获取全文</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    该文献未提供免费 PDF。试试以下方式：
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {literature.sourceUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(literature.sourceUrl, '_blank')}
                        className="text-xs"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        原文链接
                      </Button>
                    )}
                    {literature.doi && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`https://doi.org/${literature.doi}`, '_blank')}
                        className="text-xs"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        DOI 解析
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`https://scholar.google.com/scholar?q=${encodeURIComponent(literature.title)}`, '_blank')}
                      className="text-xs"
                    >
                      <Search className="w-3 h-3 mr-1" />
                      Google Scholar
                    </Button>
                    {literature.source === 'semantic-scholar' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`https://arxiv.org/search/${encodeURIComponent(literature.title.split(' ').slice(0, 5).join(' '))}`, '_blank')}
                        className="text-xs"
                      >
                        <Search className="w-3 h-3 mr-1" />
                        在 arXiv 搜索
                      </Button>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    💡 提示：选择"arXiv"来源可获得更多免费 PDF
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="py-4">
              <p className="text-destructive text-sm">{error}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Note Sidebar */}
      <LiteratureNoteSidebar
        literatureId={parseInt(id as string)}
        literatureTitle={literature.title || ''}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
    </div>
  );
}

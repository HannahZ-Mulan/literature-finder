'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, FileText, Quote, Wand, Save, Folder, BookOpen, ChevronDown, Download } from 'lucide-react';
import { PDFViewer } from '@/components/pdf-viewer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TagSelector } from '@/components/tag-selector';

interface Literature {
  id: string;
  title: string;
  authors: any;
  abstract: string;
  doi: string;
  publication_date: string;
  journal: string;
  citation_count: number;
  source: string;
  keywords: any;
  pdf_url: string;
}

export default function LiteraturePreviewPage() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [literature, setLiterature] = useState<Literature | null>(null);
  const [isLoadingLiterature, setIsLoadingLiterature] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [savedLiteratureId, setSavedLiteratureId] = useState<number | null>(null);
  const [summary, setSummary] = useState('');
  const [quickPreviewEnglish, setQuickPreviewEnglish] = useState('');
  const [quickPreviewChinese, setQuickPreviewChinese] = useState('');
  const [showChinese, setShowChinese] = useState(false);
  const [summaryLength, setSummaryLength] = useState<'short' | 'medium' | 'detailed'>('medium');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Quick actions states (only available after saving)
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [readingLists, setReadingLists] = useState<Array<{ id: number; name: string; description?: string }>>([]);
  const [tags, setTags] = useState<Array<{ id: number; name: string; color: string }>>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingReadingLists, setIsLoadingReadingLists] = useState(false);

  useEffect(() => {
    // 从 sessionStorage 读取预览数据
    const previewData = sessionStorage.getItem('previewLiterature');
    if (previewData) {
      try {
        const data = JSON.parse(previewData);
        setLiterature(data);
        setIsLoadingLiterature(false);

        // 自动生成快速预览
        generateQuickPreview(data.title, data.abstract);
      } catch (err) {
        setError('无法加载预览数据');
        setIsLoadingLiterature(false);
      }
    } else {
      setError('没有预览数据');
      setIsLoadingLiterature(false);
    }
  }, []);

  const handleSave = async () => {
    if (!literature) return;

    setIsSaving(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/literature/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: literature.title,
          authors: literature.authors,
          abstract: literature.abstract,
          doi: literature.doi,
          publication_date: literature.publication_date,
          journal: literature.journal,
          citation_count: literature.citation_count,
          source: literature.source,
          keywords: literature.keywords,
          pdf_url: literature.pdf_url,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '保存失败');
      }

      setSavedLiteratureId(data.literature.id);
      toast({
        title: "保存成功",
        description: "正在跳转到文献详情...",
      });

      // Fetch tags after saving
      fetchTags(data.literature.id);

      // 跳转到已保存的文献详情页
      setTimeout(() => {
        router.push(`/literature/${data.literature.id}`);
      }, 500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async (format: string) => {
    if (!literature) return;

    setIsExporting(true);
    try {
      let citationText = '';

      // 如果已保存，使用已保存的 ID 导出（包含用户自定义数据）
      if (savedLiteratureId) {
        const response = await fetch(`/api/literature/${savedLiteratureId}/export?format=${format}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Export failed');
        }
        citationText = await response.text();
      } else {
        // 直接导出，不需要先保存
        const exportData = {
          title: literature.title,
          authors: literature.authors || [],
          abstract: literature.abstract || '',
          publication_date: literature.publication_date || '',
          journal: literature.journal || '',
          doi: literature.doi || '',
        };

        const response = await fetch(`/api/literature/export-direct?format=${format}&data=${encodeURIComponent(JSON.stringify(exportData))}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Export failed');
        }

        citationText = await response.text();
      }

      // Copy to clipboard
      await navigator.clipboard.writeText(citationText);

      // Show success message
      toast({
        title: "导出成功",
        description: `${format.toUpperCase()}引用已复制到剪贴板！`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "导出失败",
        description: err.message,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const fetchCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/categories', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
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
      const token = localStorage.getItem('token');
      const response = await fetch('/api/reading-lists', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
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

  const fetchTags = async (literatureId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/literature/${literatureId}/tags/list`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const result = await response.json();
        setTags(result.tags || []);
      }
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    }
  };

  const handleAddToCategory = async (categoryId: number) => {
    if (!savedLiteratureId) return;

    setIsLoadingCategories(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/literature/${savedLiteratureId}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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

  const generateQuickPreview = async (title: string, abstract: string) => {
    setIsLoadingPreview(true);
    setShowChinese(false); // 重置为英文
    try {
      const response = await fetch('/api/literature/preview/summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, abstract }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate preview');
      }

      setQuickPreviewEnglish(data.english);
      setQuickPreviewChinese(data.chinese);
    } catch (err: any) {
      console.error('生成预览失败:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!savedLiteratureId) {
      toast({
        variant: "destructive",
        title: "无法生成",
        description: "请先保存文献到库中",
      });
      return;
    }

    setIsGeneratingSummary(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/literature/${savedLiteratureId}/summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ length_level: summaryLength }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate summary');
      }

      setSummary(data.summary);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  if (isLoading || isLoadingLiterature) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="ml-4">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-md mx-auto">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">请先登录</p>
            <Button onClick={() => router.push('/login')}>前往登录</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!literature) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-md mx-auto">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">{error || '未找到预览数据'}</p>
            <Button onClick={() => router.back()}>返回</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const authors = literature.authors || [];
  const keywords = literature.keywords || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          {!savedLiteratureId && (
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  保存到库
                </>
              )}
            </Button>
          )}
          {savedLiteratureId && (
            <Badge variant="default" className="mb-4">已保存</Badge>
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{literature.title}</CardTitle>
                <CardDescription className="text-base">
                  {authors.map((a: any) => a.name).join(', ')}
                </CardDescription>
              </div>
              <Badge variant={literature.source === 'arxiv' ? 'default' : 'secondary'}>
                {literature.source}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {literature.journal && (
                <div>
                  <span className="font-medium">期刊：</span>
                  <span className="text-muted-foreground">{literature.journal}</span>
                </div>
              )}
              {literature.publication_date && (
                <div>
                  <span className="font-medium">发表年份：</span>
                  <span className="text-muted-foreground">
                    {new Date(literature.publication_date).getFullYear()}
                  </span>
                </div>
              )}
              <div>
                <span className="font-medium">引用数：</span>
                <span className="text-muted-foreground">{literature.citation_count}</span>
              </div>
              {literature.doi && (
                <div>
                  <span className="font-medium">DOI：</span>
                  <a
                    href={`https://doi.org/${literature.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {literature.doi}
                  </a>
                </div>
              )}
            </div>

            {keywords.length > 0 && (
              <div>
                <span className="font-medium text-sm">关键词：</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {keywords.map((keyword: string, index: number) => (
                    <Badge key={index} variant="outline">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {literature.abstract && (
              <div>
                <h3 className="font-medium mb-2">摘要</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {literature.abstract}
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-4 border-t">
              <Button
                onClick={() => handleExport('apa')}
                disabled={isExporting}
              >
                <Quote className="w-4 h-4 mr-2" />
                导出 APA
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport('mla')}
                disabled={isExporting}
              >
                <Quote className="w-4 h-4 mr-2" />
                导出 MLA
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport('chicago')}
                disabled={isExporting}
              >
                <Quote className="w-4 h-4 mr-2" />
                导出 Chicago
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport('harvard')}
                disabled={isExporting}
              >
                <Quote className="w-4 h-4 mr-2" />
                导出 Harvard
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport('vancouver')}
                disabled={isExporting}
              >
                <Quote className="w-4 h-4 mr-2" />
                导出 Vancouver
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-destructive">
            <CardContent className="py-4">
              <p className="text-destructive text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {successMessage && (
          <Card className="border-green-500 bg-green-50 dark:bg-green-950">
            <CardContent className="py-4">
              <p className="text-green-700 dark:text-green-300 text-sm">{successMessage}</p>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions - only show after saving */}
        {savedLiteratureId && (
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
                            const token = localStorage.getItem('token');
                            const response = await fetch(`/api/literature/${savedLiteratureId}/reading-lists`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`,
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
                  literatureId={savedLiteratureId}
                  currentTags={tags}
                  onUpdate={() => fetchTags(savedLiteratureId)}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* PDF 预览 */}
        {literature.pdf_url ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  PDF 预览
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(literature.pdf_url, '_blank')}
                >
                  <Download className="w-4 h-4 mr-1" />
                  新窗口打开
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <PDFViewer url={literature.pdf_url} title={literature.title} />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                PDF 预览
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 space-y-4">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium mb-2">暂无 PDF 预览</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    该文献未提供直接的 PDF 链接。您可以尝试以下方式获取：
                  </p>
                  <div className="space-y-2 text-sm text-left max-w-md mx-auto">
                    <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                      <span className="font-medium">1.</span>
                      <span>访问期刊官网或数据库查找</span>
                    </div>
                    {literature.doi && (
                      <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                        <span className="font-medium">2.</span>
                        <span>通过 DOI 查找：<a
                          href={`https://doi.org/${literature.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline ml-1"
                        >
                          {literature.doi}
                        </a></span>
                      </div>
                    )}
                    <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                      <span className="font-medium">3.</span>
                      <span>使用学校或机构图书馆资源</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI 快速预览 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Wand className="w-5 h-5" />
                AI 快速预览（无需保存）
              </CardTitle>
              {!isLoadingPreview && quickPreviewEnglish && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowChinese(!showChinese)}
                >
                  {showChinese ? '显示英文' : '显示中文'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingPreview && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">生成中...</span>
              </div>
            )}

            {!isLoadingPreview && !quickPreviewEnglish && !quickPreviewChinese && (
              <div className="text-center py-8 text-muted-foreground">
                暂无预览内容
              </div>
            )}

            {!isLoadingPreview && (quickPreviewEnglish || quickPreviewChinese) && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="prose prose-sm max-w-none">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap font-mono">
                    {showChinese ? quickPreviewChinese : quickPreviewEnglish}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI 详细摘要（需要保存后使用） */}
        {savedLiteratureId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand className="w-5 h-5" />
                AI 详细摘要生成
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">摘要长度：</span>
                <div className="flex gap-2">
                  <Button
                    variant={summaryLength === 'short' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSummaryLength('short')}
                    disabled={isGeneratingSummary}
                  >
                    简短
                  </Button>
                  <Button
                    variant={summaryLength === 'medium' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSummaryLength('medium')}
                    disabled={isGeneratingSummary}
                  >
                    中等
                  </Button>
                  <Button
                    variant={summaryLength === 'detailed' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSummaryLength('detailed')}
                    disabled={isGeneratingSummary}
                  >
                    详细
                  </Button>
                </div>
                <Button
                  onClick={handleGenerateSummary}
                  disabled={isGeneratingSummary}
                >
                  {isGeneratingSummary ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Wand className="w-4 h-4 mr-2" />
                      生成摘要
                    </>
                  )}
                </Button>
              </div>

              {summary && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">生成的摘要</h4>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{summary}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

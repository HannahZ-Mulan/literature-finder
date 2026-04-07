'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLibrary } from '@/hooks/use-api';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LiteratureCard } from '@/components/literature-card';
import { LibraryPageSkeleton } from '@/components/literature-card-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { CategorySidebar } from '@/components/category-sidebar';
import { TagSidebar } from '@/components/tag-sidebar';
import {
  CheckSquare,
  Square,
  Download,
  Plus,
  BookOpen,
  Loader2,
  ChevronDown,
  Copy,
  X,
  Check,
  Folder,
  ArrowRight,
  Trash2,
  FileDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

function LibraryContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const categoryParam = searchParams.get('category_id');
  const initialCategoryId = categoryParam ? parseInt(categoryParam) : null;
  const tagParam = searchParams.get('tag_id');
  const initialTagId = tagParam ? parseInt(tagParam) : null;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(searchQuery);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(initialCategoryId);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(initialTagId);
  const [addingDemo, setAddingDemo] = useState(false);

  // Batch operations state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [isAddingToList, setIsAddingToList] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [readingLists, setReadingLists] = useState<Array<{ id: number; name: string; description?: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [isMovingToCategory, setIsMovingToCategory] = useState(false);
  const [isRemovingFromCategory, setIsRemovingFromCategory] = useState(false);
  const [isMovingToOtherCategory, setIsMovingToOtherCategory] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading, error: fetchError } = useLibrary({
    search: search || undefined,
    page,
    limit: 10,
    sort: 'date',
    category_id: selectedCategoryId,
    tag_id: selectedTagId,
  });

  const { token } = useAuth();

  // Fetch reading lists and categories on mount
  useEffect(() => {
    if (token) {
      fetchReadingLists();
      fetchCategories();
    }
  }, [token]);

  const fetchReadingLists = async () => {
    try {
      const response = await fetch('/api/reading-lists', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const result = await response.json();
        setReadingLists(result.reading_lists || []);
      }
    } catch (err) {
      console.error('Failed to fetch reading lists:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const result = await response.json();
        setCategories(result.categories || []);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  useEffect(() => {
    setSearch(searchQuery);
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  // Toggle selection
  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Select all on current page
  const selectAll = () => {
    const currentPageIds = data?.literature?.map(lit => lit.id) || [];
    setSelectedIds(new Set([...selectedIds, ...currentPageIds]));
  };

  // Clear all selections
  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Batch export citations
  const handleBatchExport = async (format: string, downloadAsFile: boolean = false) => {
    if (selectedIds.size === 0) return;

    setIsExporting(true);
    setError('');
    setSuccessMessage('');
    try {
      // Export all selected items
      const citations = await Promise.all(
        Array.from(selectedIds).map(async (id) => {
          const response = await fetch(`/api/literature/${id}/export?format=${format}`);
          if (!response.ok) throw new Error(`Failed to export item ${id}`);
          return await response.text();
        })
      );

      // Combine all citations with double newline
      const combinedCitations = citations.join('\n\n');

      if (downloadAsFile) {
        // Download as file
        const extension = format === 'bibtex' ? '.bib' : format === 'endnote' ? '.enw' : format === 'ris' ? '.ris' : '.txt';
        const blob = new Blob([combinedCitations], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `citations_batch_${selectedIds.size}${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setSuccessMessage(`已下载 ${selectedIds.size} 条引用文件`);
      } else {
        // Copy to clipboard
        await navigator.clipboard.writeText(combinedCitations);
        setSuccessMessage(`已复制 ${selectedIds.size} 条引用到剪贴板`);
      }
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError('批量导出失败: ' + err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  // Batch copy all formats
  const handleBatchCopyAllFormats = async () => {
    if (selectedIds.size === 0) return;

    setIsExporting(true);
    setError('');
    setSuccessMessage('');
    try {
      const formats = ['apa', 'mla', 'chicago', 'harvard', 'vancouver', 'bibtex'];
      const allCitations: Record<string, string[]> = {};

      // Initialize formats array
      formats.forEach(fmt => allCitations[fmt] = []);

      // Fetch all formats for all selected items
      for (const id of selectedIds) {
        await Promise.all(formats.map(async (fmt) => {
          const response = await fetch(`/api/literature/${id}/export?format=${fmt}`);
          if (response.ok) {
            allCitations[fmt].push(await response.text());
          }
        }));
      }

      // Combine all citations by format
      let combinedText = `=== 批量文献引用 (${selectedIds.size} 篇) ===\n\n`;

      for (const fmt of formats) {
        if (allCitations[fmt].length > 0) {
          const formatLabels: Record<string, string> = {
            apa: 'APA',
            mla: 'MLA',
            chicago: 'Chicago',
            harvard: 'Harvard',
            vancouver: 'Vancouver',
            bibtex: 'BibTeX'
          };
          combinedText += `--- ${formatLabels[fmt]} 格式 ---\n`;
          combinedText += allCitations[fmt].join('\n\n');
          combinedText += '\n\n';
        }
      }

      await navigator.clipboard.writeText(combinedText);
      setSuccessMessage(`已复制 ${selectedIds.size} 篇文献的所有格式到剪贴板`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError('批量复制失败: ' + err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  // Batch export all formats as files
  const handleBatchExportAllFormats = async () => {
    if (selectedIds.size === 0) return;

    setIsExporting(true);
    setError('');
    setSuccessMessage('');
    try {
      const formats = ['apa', 'mla', 'chicago', 'harvard', 'vancouver', 'bibtex'];

      for (const fmt of formats) {
        const citations = await Promise.all(
          Array.from(selectedIds).map(async (id) => {
            const response = await fetch(`/api/literature/${id}/export?format=${fmt}`);
            if (!response.ok) throw new Error(`Failed to export item ${id}`);
            return await response.text();
          })
        );

        const combinedCitations = citations.join('\n\n');
        const extension = fmt === 'bibtex' ? '.bib' : '.txt';
        const blob = new Blob([combinedCitations], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `citations_batch_${fmt}_${selectedIds.size}${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Small delay to avoid browser blocking multiple downloads
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      setSuccessMessage(`已下载 ${selectedIds.size} 篇文献的 6 种格式`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError('批量导出失败: ' + err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  // Batch add to reading list
  const handleBatchAddToList = async (listId: number) => {
    if (selectedIds.size === 0) return;

    setIsAddingToList(true);
    setError('');
    setSuccessMessage('');
    try {
      let successCount = 0;

      for (const id of selectedIds) {
        const response = await fetch(`/api/reading-lists/${listId}/items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ literature_id: id }),
        });

        if (response.ok) {
          successCount++;
        }
      }

      setSuccessMessage(`成功添加 ${successCount}/${selectedIds.size} 篇文献到阅读列表`);
      setSelectedIds(new Set());
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError('批量添加失败: ' + err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsAddingToList(false);
    }
  };

  // Batch move to category (used for inline category buttons)
  const handleBatchMoveToCategory = async (categoryId: number) => {
    if (selectedIds.size === 0) return;

    setIsMovingToCategory(true);
    setError('');
    setSuccessMessage('');
    try {
      // If in a category view, remove from current category first
      if (selectedCategoryId) {
        await fetch('/api/literature/batch/categories/remove', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            literature_ids: Array.from(selectedIds),
            category_id: selectedCategoryId,
          }),
        });
      }

      // Then add to new category
      const response = await fetch('/api/literature/batch/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          literature_ids: Array.from(selectedIds),
          category_id: categoryId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '移动失败');
      }

      const categoryName = categories.find(c => c.id === categoryId)?.name || '分类';
      setSuccessMessage(`成功移动 ${selectedIds.size} 篇文献到 "${categoryName}"`);
      setSelectedIds(new Set());
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError('移动失败: ' + err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsMovingToCategory(false);
    }
  };

  // Batch move to another category (for dropdown menu)
  const handleBatchMoveToOtherCategory = async (targetCategoryId: number) => {
    if (selectedIds.size === 0 || !selectedCategoryId) return;

    setIsMovingToOtherCategory(true);
    setError('');
    setSuccessMessage('');
    try {
      // Remove from current category
      await fetch('/api/literature/batch/categories/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          literature_ids: Array.from(selectedIds),
          category_id: selectedCategoryId,
        }),
      });

      // Add to new category
      const response = await fetch('/api/literature/batch/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          literature_ids: Array.from(selectedIds),
          category_id: targetCategoryId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '移动失败');
      }

      const categoryName = categories.find(c => c.id === targetCategoryId)?.name || '分类';
      setSuccessMessage(`成功移动 ${selectedIds.size} 篇文献到 "${categoryName}"`);
      setSelectedIds(new Set());
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError('移动失败: ' + err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsMovingToOtherCategory(false);
    }
  };

  // Batch remove from category
  const handleBatchRemoveFromCategory = async () => {
    if (selectedIds.size === 0 || !selectedCategoryId) return;

    setIsRemovingFromCategory(true);
    setError('');
    setSuccessMessage('');
    try {
      const response = await fetch('/api/literature/batch/categories/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          literature_ids: Array.from(selectedIds),
          category_id: selectedCategoryId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '移除失败');
      }

      const categoryName = categories.find(c => c.id === selectedCategoryId)?.name || '分类';
      setSuccessMessage(`成功从 "${categoryName}" 移除 ${selectedIds.size} 篇文献`);
      setSelectedIds(new Set());
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError('移除失败: ' + err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsRemovingFromCategory(false);
    }
  };

  const handleAddDemo = async () => {
    if (!token) return;

    setAddingDemo(true);
    try {
      const response = await fetch('/api/demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "添加成功",
          description: `成功添加 ${result.success} 篇演示文献！`,
        });
        // 刷新页面
        window.location.reload();
      } else {
        toast({
          variant: "destructive",
          title: "添加失败",
          description: result.error,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "添加失败",
        description: "请重试",
      });
    } finally {
      setAddingDemo(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;

    if (!confirm(`确定要删除选中的 ${selectedIds.size} 篇文献吗？此操作无法撤销。`)) {
      return;
    }

    setIsDeleting(true);
    setError('');
    try {
      const response = await fetch('/api/literature/batch/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ literature_ids: Array.from(selectedIds) }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || '删除失败');
      }

      const result = await response.json();
      toast({
        title: "删除成功",
        description: `已删除 ${result.deleted_count} 篇文献`,
      });

      // Clear selection and refresh
      setSelectedIds(new Set());
      window.location.reload();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "删除失败",
        description: err.message,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-6">
          {/* Sidebar Skeleton */}
          <aside className="w-64 flex-shrink-0 space-y-6">
            <div className="space-y-3">
              <Skeleton className="h-6 w-24 rounded" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded" />
              ))}
            </div>
            <div className="space-y-3">
              <Skeleton className="h-6 w-24 rounded" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded" />
              ))}
            </div>
          </aside>

          {/* Main content Skeleton */}
          <div className="flex-1 space-y-6">
            <div className="space-y-4">
              <Skeleton className="h-10 w-48 rounded" />
              <Skeleton className="h-10 w-64 rounded" />
            </div>
            <Skeleton className="h-10 w-full max-w-md rounded" />
            <LibraryPageSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card className="border-destructive">
            <CardContent className="py-8 text-center">
              <p className="text-destructive font-medium mb-2">加载失败</p>
              <p className="text-muted-foreground text-sm">{error}</p>
              <p className="text-muted-foreground text-xs mt-4">
                请确保已登录并重试
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isEmpty = !data?.literature || data.literature.length === 0;
  const hasSelection = selectedIds.size > 0;
  const currentPageIds = data?.literature?.map(lit => lit.id) || [];
  const allCurrentSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedIds.has(id));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0">
          <div className="sticky top-8 space-y-6">
            <CategorySidebar
              selectedCategoryId={selectedCategoryId}
              onCategoryChange={(categoryId) => {
                setSelectedCategoryId(categoryId);
                setPage(1); // Reset to first page when changing category
              }}
              onUpdate={() => {
                // Refresh data when categories are updated
                window.location.reload();
              }}
            />
            <TagSidebar
              selectedTagId={selectedTagId}
              onTagChange={(tagId) => {
                setSelectedTagId(tagId);
                setPage(1); // Reset to first page when changing tag
              }}
            />
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 space-y-6">
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 px-4 py-3 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span className="text-sm">{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage('')}
              className="text-green-600 hover:text-green-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg flex items-center justify-between">
            <span className="text-sm">{error}</span>
            <button
              onClick={() => setError('')}
              className="text-red-600 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header with batch operations toolbar */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">我的文献库</h1>
            <div className="flex items-center gap-4">
              <p className="text-muted-foreground">
                共 {data?.pagination.total || 0} 篇文献
              </p>
              {isEmpty && (
                <Button
                  onClick={handleAddDemo}
                  disabled={addingDemo}
                  variant="outline"
                >
                  {addingDemo ? '添加中...' : '添加演示文献'}
                </Button>
              )}
            </div>
          </div>

          {/* Batch Operations Toolbar */}
          {hasSelection ? (
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">
                    已选择 <span className="text-blue-600">{selectedIds.size}</span> 篇文献
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {!allCurrentSelected && currentPageIds.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={selectAll}
                      className="h-8 px-2"
                    >
                      全选本页
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    className="h-8 px-2"
                  >
                    <X className="w-4 h-4 mr-1" />
                    取消选择
                  </Button>
                </div>
              </div>

              {/* Category shortcuts - inline */}
              {categories.length > 0 && (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-medium">快速分类：</span>
                  <div className="flex flex-wrap gap-2">
                    {categories.slice(0, 5).map((category) => (
                      <Button
                        key={category.id}
                        variant="outline"
                        size="sm"
                        onClick={() => handleBatchMoveToCategory(category.id)}
                        disabled={isMovingToCategory}
                        className="text-xs"
                      >
                        {isMovingToCategory ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <Folder className="w-3 h-3 mr-1" />
                            {category.name}
                          </>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t">
                {/* Quick Batch Actions */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBatchCopyAllFormats}
                  disabled={isExporting || selectedIds.size === 0}
                  title="复制所有 6 种引用格式"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  复制全部
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBatchExportAllFormats}
                  disabled={isExporting || selectedIds.size === 0}
                  title="下载所有 6 种引用格式"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  导出全部
                </Button>

                {/* Batch Export */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="default" size="sm" disabled={isExporting}>
                      {isExporting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          导出中...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          批量导出
                          <ChevronDown className="w-4 h-4 ml-1" />
                        </>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      引用管理软件格式
                    </div>
                    <DropdownMenuItem onClick={() => handleBatchExport('bibtex', false)}>
                      <Copy className="w-4 h-4 mr-2" />
                      BibTeX 格式
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBatchExport('endnote', false)}>
                      <Copy className="w-4 h-4 mr-2" />
                      EndNote 格式
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBatchExport('ris', false)}>
                      <Copy className="w-4 h-4 mr-2" />
                      RIS 格式
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      学术引用格式
                    </div>
                    <DropdownMenuItem onClick={() => handleBatchExport('apa', false)}>
                      <Copy className="w-4 h-4 mr-2" />
                      APA 格式
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBatchExport('mla', false)}>
                      <Copy className="w-4 h-4 mr-2" />
                      MLA 格式
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBatchExport('chicago', false)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Chicago 格式
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBatchExport('harvard', false)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Harvard 格式
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBatchExport('vancouver', false)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Vancouver 格式
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      下载为文件
                    </div>
                    <DropdownMenuItem onClick={() => handleBatchExport('bibtex', true)}>
                      <Download className="w-4 h-4 mr-2" />
                      BibTeX 文件 (.bib)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBatchExport('endnote', true)}>
                      <Download className="w-4 h-4 mr-2" />
                      EndNote 文件 (.enw)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBatchExport('ris', true)}>
                      <Download className="w-4 h-4 mr-2" />
                      RIS 文件 (.ris)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Batch Add to Reading List */}
                {readingLists.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" disabled={isAddingToList}>
                        {isAddingToList ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            添加中...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            添加到列表
                            <ChevronDown className="w-4 h-4 ml-1" />
                          </>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      {readingLists.map((list) => (
                        <DropdownMenuItem
                          key={list.id}
                          onClick={() => handleBatchAddToList(list.id)}
                          disabled={isAddingToList}
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
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Batch Delete */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBatchDelete}
                  disabled={isDeleting}
                  className="text-destructive hover:text-destructive border-destructive hover:bg-destructive/10"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      删除中...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      删除
                    </>
                  )}
                </Button>
              </div>

              {/* Batch Category Actions - only show when in a category view */}
              {selectedCategoryId && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isRemovingFromCategory || isMovingToOtherCategory}
                      >
                        {(isRemovingFromCategory || isMovingToOtherCategory) ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            处理中...
                          </>
                        ) : (
                          <>
                            <Folder className="w-4 h-4 mr-2" />
                            操作
                            <ChevronDown className="w-4 h-4 ml-1" />
                          </>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuItem
                        onClick={handleBatchRemoveFromCategory}
                        disabled={isRemovingFromCategory}
                        className="text-destructive focus:text-destructive"
                      >
                        <X className="w-4 h-4 mr-2" />
                        从分类移除
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                        移动到分类
                      </div>
                      {categories.filter(c => c.id !== selectedCategoryId).map((category) => (
                        <DropdownMenuItem
                          key={category.id}
                          onClick={() => handleBatchMoveToOtherCategory(category.id)}
                          disabled={isMovingToOtherCategory}
                        >
                          <ArrowRight className="w-4 h-4 mr-2" />
                          <span>{category.name}</span>
                        </DropdownMenuItem>
                      ))}
                      {categories.filter(c => c.id !== selectedCategoryId).length === 0 && (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          暂无其他分类
                        </div>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
          ) : currentPageIds.length > 0 ? (
            <div className="flex items-center justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                全选本页
              </Button>
            </div>
          ) : null}
        </div>

        <form onSubmit={handleSearch} className="flex space-x-2">
          <Input
            placeholder="搜索标题、作者或摘要..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
          <Button type="submit">搜索</Button>
        </form>

        {data?.literature && data.literature.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-4">
              {data.literature.map((literature) => (
                <LiteratureCard
                  key={literature.id}
                  literature={literature}
                  selected={selectedIds.has(literature.id)}
                  onToggle={toggleSelection}
                  onUpdate={() => {
                    // Refresh data when literature is updated
                    window.location.reload();
                  }}
                  onDelete={() => {
                    // Refresh data when literature is deleted
                    window.location.reload();
                  }}
                  currentCategoryId={selectedCategoryId}
                />
              ))}
            </div>

            {data.pagination.totalPages > 1 && (
              <div className="flex justify-center space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  上一页
                </Button>
                <span className="flex items-center px-4">
                  第 {page} / {data.pagination.totalPages} 页
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                  disabled={page === data.pagination.totalPages}
                >
                  下一页
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="py-16 text-center space-y-4">
              <p className="text-muted-foreground">
                {search ? '没有找到匹配的文献' : '您的文献库是空的'}
              </p>
              {search && (
                <Button variant="outline" onClick={() => { setSearch(''); setPage(1); }}>
                  清除搜索
                </Button>
              )}
              {!search && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    点击上方按钮添加演示文献，或者手动保存文献
                  </p>
                  <Button onClick={handleAddDemo} disabled={addingDemo}>
                    {addingDemo ? '添加中...' : '添加演示文献'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </div>
  );
}

// Wrapper component with Suspense boundary
export default function LibraryPage() {
  return (
    <Suspense fallback={<LibraryPageSkeleton />}>
      <LibraryContent />
    </Suspense>
  );
}

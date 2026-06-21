'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, FileText, Quote, BookOpen, Folder, ChevronDown, Loader2, X, ArrowRight, ListPlus, Check, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { TagSelector } from '@/components/tag-selector';

interface Literature {
  id: number;
  title: string;
  authors: Array<{ name: string }>;
  abstract: string;
  doi: string;
  publication_date: string;
  journal: string;
  citation_count: number;
  source: string;
  keywords: string[] | null;
  notes: string | null;
  saved_at: string;
}

interface LiteratureCardProps {
  literature: Literature;
  selected?: boolean;
  onToggle?: (id: number) => void;
  onUpdate?: () => void;
  currentCategoryId?: number | null;
  onDelete?: () => void;
}

export function LiteratureCard({ literature, selected = false, onToggle, onUpdate, currentCategoryId, onDelete }: LiteratureCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [tags, setTags] = useState<Array<{ id: number; name: string; color: string }>>([]);
  const [readingLists, setReadingLists] = useState<Array<{ id: number; name: string; description?: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const authorNames = literature.authors.map((a) => a.name).join(', ');

  const fetchCategories = async () => {
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
    }
  };

  const fetchReadingLists = async () => {
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
    }
  };

  const fetchTags = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/literature/${literature.id}/tags/list`, {
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

  useEffect(() => {
    fetchTags();
  }, [literature.id]);

  // Fetch categories when dropdown opens
  const handleDropdownOpen = () => {
    if (categories.length === 0) {
      fetchCategories();
    }
  };

  const handleAddToCategory = async (categoryId: number) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');

      // If in a category view and moving to a different category, remove from current first
      if (currentCategoryId && categoryId !== currentCategoryId) {
        await fetch(`/api/literature/${literature.id}/categories?category_id=${currentCategoryId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }

      const response = await fetch(`/api/literature/${literature.id}/categories`, {
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
      toast({
        title: currentCategoryId && categoryId !== currentCategoryId ? "已移动" : "已添加",
        description: currentCategoryId && categoryId !== currentCategoryId
          ? `已移动到 "${categoryName}"`
          : `已添加到 "${categoryName}"`,
      });
      onUpdate?.();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "操作失败",
        description: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFromCategory = async () => {
    if (!currentCategoryId) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/literature/${literature.id}/categories?category_id=${currentCategoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '移除失败');
      }

      toast({
        title: "已移除",
        description: "已从分类移除",
      });
      onUpdate?.();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "移除失败",
        description: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on buttons, checkbox, or interactive elements
    if ((e.target as HTMLElement).closest('button') ||
        (e.target as HTMLElement).closest('[data-radix-collection-item]') ||
        (e.target as HTMLElement).closest('input[type="checkbox"]')) {
      return;
    }
    // Navigate to detail page
    router.push(`/literature/${literature.id}`);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', literature.id.toString());
    // Add visual feedback
    (e.currentTarget as HTMLElement).classList.add('opacity-50');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).classList.remove('opacity-50');
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除这篇文献吗？此操作无法撤销。')) {
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/literature/${literature.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '删除失败');
      }

      toast({
        title: "删除成功",
        description: "文献已从您的库中移除",
      });
      onDelete?.();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "删除失败",
        description: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card
      className={`hover:shadow-md transition-shadow ${selected ? 'ring-2 ring-primary' : ''} cursor-move`}
      onClick={handleCardClick}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggle?.(literature.id)}
            className="mt-1"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl line-clamp-2">{literature.title}</CardTitle>
            <CardDescription className="mt-2">
              {authorNames}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="shrink-0">
              {literature.source}
            </Badge>
            <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white shrink-0">
              <Check className="w-3 h-3 mr-1" />
              已保存
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {literature.abstract}
        </p>

        <div className="flex flex-wrap gap-2 text-sm">
          {literature.journal && (
            <div className="flex items-center text-muted-foreground">
              <BookOpen className="w-4 h-4 mr-1" />
              {literature.journal}
            </div>
          )}
          {literature.publication_date && (
            <div className="flex items-center text-muted-foreground">
              <Calendar className="w-4 h-4 mr-1" />
              {new Date(literature.publication_date).getFullYear()}
            </div>
          )}
          {literature.citation_count > 0 && (
            <div className="flex items-center text-muted-foreground">
              <Quote className="w-4 h-4 mr-1" />
              {literature.citation_count} 引用
            </div>
          )}
        </div>

        {literature.keywords && literature.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {literature.keywords.slice(0, 5).map((keyword, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {keyword}
              </Badge>
            ))}
          </div>
        )}

        {/* Tags */}
        <div>
          <TagSelector
            literatureId={literature.id}
            currentTags={tags}
            onUpdate={() => {
              fetchTags();
              onUpdate?.();
            }}
          />
        </div>

        {literature.notes && (
          <div className="bg-muted p-3 rounded-md">
            <p className="text-sm"><strong>笔记:</strong> {literature.notes}</p>
          </div>
        )}

        <div className="flex space-x-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => router.push(`/literature/${literature.id}`)}
          >
            查看详情
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isLoading}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>

          {/* Add to Reading List Dropdown */}
          <DropdownMenu onOpenChange={(open) => {
            if (open && readingLists.length === 0) {
              fetchReadingLists();
            }
          }}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ListPlus className="w-4 h-4 mr-2" />
                    列表
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {readingLists.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  {isLoading ? '加载中...' : '暂无阅读列表'}
                </div>
              ) : (
                readingLists.map((list) => (
                  <DropdownMenuItem
                    key={list.id}
                    onClick={async () => {
                      setIsLoading(true);
                      try {
                        const token = localStorage.getItem('token');
                        const response = await fetch(`/api/literature/${literature.id}/reading-lists`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                          },
                          body: JSON.stringify({ reading_list_id: list.id }),
                        });
                        if (response.ok) {
                          toast({
                            title: "已添加",
                            description: `已添加到 "${list.name}"`,
                          });
                          onUpdate?.();
                        } else {
                          const data = await response.json();
                          toast({
                            variant: "destructive",
                            title: "添加失败",
                            description: data.error || '未知错误',
                          });
                        }
                      } catch (err) {
                        toast({
                          variant: "destructive",
                          title: "添加失败",
                        });
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    disabled={isLoading}
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    <div className="flex flex-col">
                      <span className="font-medium">{list.name}</span>
                      {list.description && (
                        <span className="text-xs text-muted-foreground">{list.description}</span>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Category Actions Dropdown - show when in a category view */}
          {currentCategoryId ? (
            <DropdownMenu onOpenChange={(open) => {
              if (open && categories.length === 0) {
                fetchCategories();
              }
            }}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Folder className="w-4 h-4 mr-2" />
                      操作
                      <ChevronDown className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={handleRemoveFromCategory}
                  disabled={isLoading}
                  className="text-destructive focus:text-destructive"
                >
                  <X className="w-4 h-4 mr-2" />
                  从分类移除
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                  移动到分类
                </div>
                {categories.filter(c => c.id !== currentCategoryId).map((category) => (
                  <DropdownMenuItem
                    key={category.id}
                    onClick={() => handleAddToCategory(category.id)}
                    disabled={isLoading}
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    <span>{category.name}</span>
                  </DropdownMenuItem>
                ))}
                {categories.filter(c => c.id !== currentCategoryId).length === 0 && (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    暂无其他分类
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            /* Regular add to category dropdown - show when not in a category view */
            <DropdownMenu onOpenChange={handleDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Folder className="w-4 h-4 mr-2" />
                      分类
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
                    disabled={isLoading}
                  >
                    <Folder className="w-4 h-4 mr-2" />
                    <span>{category.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

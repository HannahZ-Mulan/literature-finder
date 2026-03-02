'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Folder, FolderOpen, Plus, Loader2 } from 'lucide-react';
import { CategoryManager } from '@/components/category-manager';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Category {
  id: number;
  name: string;
  sort_order: number;
  is_default: boolean;
}

interface CategorySidebarProps {
  selectedCategoryId?: number | null;
  onCategoryChange?: (categoryId: number | null) => void;
  onUpdate?: () => void;
}

export function CategorySidebar({
  selectedCategoryId,
  onCategoryChange,
  onUpdate,
}: CategorySidebarProps) {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dragOverCategory, setDragOverCategory] = useState<number | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryClick = (categoryId: number | null) => {
    if (onCategoryChange) {
      onCategoryChange(categoryId);
    } else {
      // Update URL params
      const params = new URLSearchParams(searchParams);
      if (categoryId === null) {
        params.delete('category_id');
      } else {
        params.set('category_id', categoryId.toString());
      }
      router.push(`/library?${params.toString()}`);
    }
  };

  const handleDragOver = (e: React.DragEvent, categoryId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCategory(categoryId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    setDragOverCategory(null);
  };

  const handleDrop = async (e: React.DragEvent, categoryId: number) => {
    e.preventDefault();
    setDragOverCategory(null);

    const literatureId = parseInt(e.dataTransfer.getData('text/plain'));
    if (isNaN(literatureId)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/literature/${literatureId}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ category_id: categoryId }),
      });

      if (response.ok) {
        // Refresh to show updated state
        window.location.reload();
      } else {
        const data = await response.json();
        toast({
          variant: "destructive",
          title: "添加失败",
          description: data.error || '未知错误',
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "添加失败",
        description: err.message,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">分类</h3>
        <CategoryManager
          trigger={
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <Plus className="h-4 w-4" />
            </Button>
          }
          onUpdate={() => {
            fetchCategories();
            onUpdate?.();
          }}
        />
      </div>

      {/* Tip */}
      <div className="text-xs text-muted-foreground px-2">
        💡 拖拽文献到分类可快速添加
      </div>

      {/* All Papers */}
      <Button
        variant={selectedCategoryId === null ? 'secondary' : 'ghost'}
        className="w-full justify-start"
        onClick={() => handleCategoryClick(null)}
      >
        {selectedCategoryId === null ? (
          <FolderOpen className="w-4 h-4 mr-2" />
        ) : (
          <Folder className="w-4 h-4 mr-2" />
        )}
        全部文献
      </Button>

      {/* Category list */}
      <div className="space-y-1">
        {isLoading ? (
          <div className="text-sm text-muted-foreground px-2">加载中...</div>
        ) : categories.length === 0 ? (
          <div className="text-sm text-muted-foreground px-2">暂无分类</div>
        ) : (
          categories.map((category) => (
            <div
              key={category.id}
              className={`relative group rounded-md transition-all ${
                dragOverCategory === category.id
                  ? 'bg-blue-100 dark:bg-blue-900/30 scale-105'
                  : selectedCategoryId === category.id
                  ? 'bg-secondary'
                  : 'hover:bg-accent'
              }`}
              onDragOver={(e) => handleDragOver(e, category.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, category.id)}
            >
              <Button
                variant="ghost"
                className="w-full justify-start h-auto py-2"
                onClick={() => handleCategoryClick(category.id)}
              >
                {selectedCategoryId === category.id ? (
                  <FolderOpen className="w-4 h-4 mr-2" />
                ) : (
                  <Folder className="w-4 h-4 mr-2" />
                )}
                <span className="flex-1 text-left truncate">{category.name}</span>
                {category.is_default && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    默认
                  </Badge>
                )}
                {dragOverCategory === category.id && (
                  <Loader2 className="w-4 h-4 ml-2 animate-spin text-blue-600" />
                )}
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tag, Plus, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface Tag {
  id: number;
  name: string;
  color: string;
}

interface TagSelectorProps {
  literatureId: number;
  currentTags?: Tag[];
  onUpdate?: () => void;
}

export function TagSelector({ literatureId, currentTags = [], onUpdate }: TagSelectorProps) {
  const { toast } = useToast();
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Ensure currentTags is always an array, even if null is passed
  const safeCurrentTags = currentTags || [];

  const fetchTags = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/tags', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const result = await response.json();
        setTags(result.tags || []);
      }
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && tags.length === 0) {
      fetchTags();
    }
  }, [isOpen]);

  const handleAddTag = async (tagId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/literature/${literatureId}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ tag_id: tagId }),
      });

      if (response.ok) {
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
    }
  };

  const handleRemoveTag = async (tagId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/literature/${literatureId}/tags?tag_id=${tagId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        onUpdate?.();
      } else {
        const data = await response.json();
        toast({
          variant: "destructive",
          title: "移除失败",
          description: data.error || '未知错误',
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "移除失败",
      });
    }
  };

  const currentTagIds = new Set(safeCurrentTags.map(t => t.id));
  const availableTags = tags.filter(t => !currentTagIds.has(t.id));

  return (
    <div className="space-y-2">
      {/* Current Tags */}
      {safeCurrentTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {safeCurrentTags.map((tag) => (
            <Badge
              key={tag.id}
              variant="outline"
              className="group relative"
              style={{
                borderColor: tag.color,
                color: tag.color,
              }}
            >
              <Tag className="w-3 h-3 mr-1" />
              {tag.name}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveTag(tag.id);
                }}
                className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Add Tag Button */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isLoading}>
            {isLoading ? (
              '加载中...'
            ) : (
              <>
                <Plus className="w-4 h-4 mr-1" />
                添加标签
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {availableTags.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              {isLoading ? '加载中...' : tags.length === 0 ? '暂无标签' : '已添加所有标签'}
            </div>
          ) : (
            availableTags.map((tag) => (
              <DropdownMenuItem
                key={tag.id}
                onClick={() => handleAddTag(tag.id)}
                disabled={isLoading}
              >
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tag, Plus, Tag as TagIcon } from 'lucide-react';
import { TagManager } from '@/components/tag-manager';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Tag {
  id: number;
  name: string;
  color: string;
  usage_count?: number;
}

interface TagSidebarProps {
  selectedTagId?: number | null;
  onTagChange?: (tagId: number | null) => void;
}

export function TagSidebar({ selectedTagId, onTagChange }: TagSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/tags', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        // Fetch usage count for each tag
        const tagsWithCounts = await Promise.all(
          (data.tags || []).map(async (tag: Tag) => {
            try {
              const countResponse = await fetch(`/api/tags/${tag.id}`);
              if (countResponse.ok) {
                const countData = await countResponse.json();
                return { ...tag, usage_count: countData.tag.usage_count };
              }
              return tag;
            } catch {
              return tag;
            }
          })
        );
        setTags(tagsWithCounts);
      }
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTagClick = (tagId: number | null) => {
    if (onTagChange) {
      onTagChange(tagId);
    } else {
      // Update URL params
      const params = new URLSearchParams(searchParams);
      if (tagId === null) {
        params.delete('tag_id');
      } else {
        params.set('tag_id', tagId.toString());
      }
      router.push(`/library?${params.toString()}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">标签</h3>
        <TagManager
          trigger={
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <Plus className="h-4 w-4" />
            </Button>
          }
          onUpdate={() => {
            fetchTags();
          }}
        />
      </div>

      {/* All Papers */}
      <Button
        variant={selectedTagId === null ? 'secondary' : 'ghost'}
        className="w-full justify-start"
        onClick={() => handleTagClick(null)}
      >
        <TagIcon className="w-4 h-4 mr-2" />
        全部文献
      </Button>

      {/* Tag list */}
      <div className="space-y-1">
        {isLoading ? (
          <div className="text-sm text-muted-foreground px-2">加载中...</div>
        ) : tags.length === 0 ? (
          <div className="text-sm text-muted-foreground px-2">暂无标签</div>
        ) : (
          tags.map((tag) => (
            <div
              key={tag.id}
              className={`flex items-center justify-between rounded-md transition-colors ${
                selectedTagId === tag.id
                  ? 'bg-secondary'
                  : 'hover:bg-accent'
              }`}
            >
              <Button
                variant="ghost"
                className="flex-1 justify-start h-auto py-2 px-2"
                onClick={() => handleTagClick(tag.id)}
              >
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="flex-1 text-left truncate">{tag.name}</span>
                {tag.usage_count !== undefined && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {tag.usage_count}
                  </Badge>
                )}
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

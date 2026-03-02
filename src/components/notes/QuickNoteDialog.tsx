'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Star, Heart, Bookmark, BookOpen, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QuickNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  literatureId: number;
  literatureTitle: string;
}

export function QuickNoteDialog({
  open,
  onOpenChange,
  literatureId,
  literatureTitle,
}: QuickNoteDialogProps) {
  const { toast } = useToast();
  const [note, setNote] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isToRead, setIsToRead] = useState(false);
  const [readingProgress, setReadingProgress] = useState('');
  const [saving, setSaving] = useState(false);

  // Load existing data when dialog opens
  useEffect(() => {
    if (open && literatureId) {
      loadNoteData();
    }
  }, [open, literatureId]);

  async function loadNoteData() {
    try {
      const response = await fetch(`/api/notes?literatureId=${literatureId}`);
      if (response.ok) {
        const data = await response.json();
        setNote(data.notes || '');
        setIsFavorite(data.is_favorite || false);
        setIsLiked(data.is_liked || false);
        setIsToRead(data.is_to_read || false);
        setReadingProgress(data.reading_progress?.toString() || '');
      }
    } catch (error) {
      console.error('Failed to load note:', error);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: '1',
          literatureId,
          note,
          is_favorite: isFavorite,
          is_liked: isLiked,
          is_to_read: isToRead,
          reading_progress: readingProgress ? parseInt(readingProgress) : null,
        }),
      });

      if (response.ok) {
        toast({
          title: "保存成功",
          description: "笔记和标记已更新",
        });
        onOpenChange(false);
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast({
        title: "保存失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            📝 快速笔记 & 标记
          </DialogTitle>
          <p className="text-sm text-muted-foreground font-normal">
            {literatureTitle.substring(0, 60)}
            {literatureTitle.length > 60 ? '...' : ''}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick Mark Buttons */}
          <div className="space-y-2">
            <label className="text-sm font-medium">快速标记</label>
            <div className="flex gap-2">
              <Button
                variant={isFavorite ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsFavorite(!isFavorite)}
                className="flex-1"
                title="标记为需要反复参考的重要文献"
              >
                <Star className={`w-4 h-4 mr-1 ${isFavorite ? 'fill-current' : ''}`} />
                收藏
              </Button>
              <Button
                variant={isLiked ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsLiked(!isLiked)}
                className="flex-1"
                title="标记为感兴趣的文献"
              >
                <Heart className={`w-4 h-4 mr-1 ${isLiked ? 'fill-current text-red-500' : ''}`} />
                喜欢
              </Button>
              <Button
                variant={isToRead ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsToRead(!isToRead)}
                className="flex-1"
                title="标记为需要深入研读的文献"
              >
                <Bookmark className={`w-4 h-4 mr-1 ${isToRead ? 'fill-current' : ''}`} />
                待细读
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              💡 提示：使用快速标记可以快速分类文献，然后在"我的笔记"页面按标记筛选查看
            </p>
          </div>

          {/* Reading Progress */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              阅读进度（页码）
            </label>
            <input
              type="number"
              value={readingProgress}
              onChange={(e) => setReadingProgress(e.target.value)}
              placeholder="例如：15"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Note */}
          <div className="space-y-2">
            <label className="text-sm font-medium">笔记</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="记录你的想法、笔记、灵感..."
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {note.length} 字符
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>保存中...</>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  保存
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

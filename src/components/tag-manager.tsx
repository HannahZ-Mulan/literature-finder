'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tag, Plus, Pencil, Trash2 } from 'lucide-react';

// 6种预设颜色
const PRESET_COLORS = [
  { name: '蓝色', value: '#3B82F6' },
  { name: '绿色', value: '#10B981' },
  { name: '黄色', value: '#F59E0B' },
  { name: '红色', value: '#EF4444' },
  { name: '紫色', value: '#8B5CF6' },
  { name: '粉色', value: '#EC4899' },
];

interface Tag {
  id: number;
  name: string;
  color: string;
  usage_count?: number;
}

interface TagManagerProps {
  trigger?: React.ReactNode;
  onUpdate?: () => void;
}

export function TagManager({ trigger, onUpdate }: TagManagerProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState(PRESET_COLORS[0].value);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
    if (open && tags.length === 0) {
      fetchTags();
    }
  }, [open]);

  const handleCreate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editingName,
          color: editingColor,
        }),
      });

      if (response.ok) {
        setEditingName('');
        setEditingColor(PRESET_COLORS[0].value);
        setIsEditing(false);
        fetchTags();
        onUpdate?.();
      } else {
        const data = await response.json();
        toast({
          variant: "destructive",
          title: "创建失败",
          description: data.error || '未知错误',
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "创建失败",
      });
    }
  };

  const handleUpdate = async () => {
    if (editingId === null) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tags/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editingName,
          color: editingColor,
        }),
      });

      if (response.ok) {
        setEditingId(null);
        setEditingName('');
        setIsEditing(false);
        fetchTags();
        onUpdate?.();
      } else {
        const data = await response.json();
        toast({
          variant: "destructive",
          title: "更新失败",
          description: data.error || '未知错误',
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "更新失败",
      });
    }
  };

  const handleDelete = async () => {
    if (deletingId === null) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tags/${deletingId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        setDeletingId(null);
        setShowDeleteDialog(false);
        fetchTags();
        onUpdate?.();
      } else {
        const data = await response.json();
        toast({
          variant: "destructive",
          title: "删除失败",
          description: data.error || '未知错误',
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "删除失败",
      });
    }
  };

  const startEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setEditingName(tag.name);
    setEditingColor(tag.color);
    setIsEditing(true);
  };

  const startCreate = () => {
    setEditingId(null);
    setEditingName('');
    setEditingColor(PRESET_COLORS[0].value);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditingId(null);
    setEditingName('');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="ghost" size="sm">
              <Tag className="w-4 h-4 mr-2" />
              管理标签
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>管理标签</DialogTitle>
            <DialogDescription>
              创建和管理标签，用于分类和筛选文献
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Create/Edit Form */}
            {isEditing ? (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                <h3 className="font-medium">
                  {editingId ? '编辑标签' : '创建新标签'}
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="tag-name">标签名称</Label>
                  <Input
                    id="tag-name"
                    placeholder="输入标签名称"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>标签颜色</Label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setEditingColor(color.value)}
                        className={`w-8 h-8 rounded-full border-2 ${
                          editingColor === color.value
                            ? 'border-primary ring-2 ring-primary'
                            : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={editingId ? handleUpdate : handleCreate}
                    disabled={!editingName.trim()}
                    size="sm"
                  >
                    {editingId ? '更新' : '创建'}
                  </Button>
                  <Button onClick={cancelEdit} variant="outline" size="sm">
                    取消
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={startCreate} className="w-full" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                创建新标签
              </Button>
            )}

            {/* Tags List */}
            <div className="space-y-2">
              {isLoading ? (
                <div className="text-center text-muted-foreground py-8">
                  加载中...
                </div>
              ) : tags.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  暂无标签，创建一个开始使用吧！
                </div>
              ) : (
                <div className="space-y-2">
                  {tags.map((tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          style={{
                            backgroundColor: tag.color,
                            color: 'white',
                          }}
                        >
                          {tag.name}
                        </Badge>
                        {tag.usage_count !== undefined && (
                          <span className="text-sm text-muted-foreground">
                            {tag.usage_count} 篇文献
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => startEdit(tag)}
                          variant="ghost"
                          size="sm"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => {
                            setDeletingId(tag.id);
                            setShowDeleteDialog(true);
                          }}
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除标签</AlertDialogTitle>
            <AlertDialogDescription>
              删除标签后，该标签将从所有文献中移除。此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

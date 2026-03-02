'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { BookOpen, Plus, Pencil, Trash2 } from 'lucide-react';

interface ReadingList {
  id: number;
  name: string;
  description: string | null;
  item_count?: number;
}

interface ReadingListManagerProps {
  trigger?: React.ReactNode;
  onUpdate?: () => void;
}

export function ReadingListManager({ trigger, onUpdate }: ReadingListManagerProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<ReadingList[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const fetchLists = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/reading-lists', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const result = await response.json();
        // Fetch item count for each list
        const listWithCounts = await Promise.all(
          (result.reading_lists || []).map(async (list: ReadingList) => {
            try {
              const countResponse = await fetch(`/api/reading-lists/${list.id}`);
              if (countResponse.ok) {
                const countData = await countResponse.json();
                return { ...list, item_count: countData.reading_list.item_count };
              }
              return list;
            } catch {
              return list;
            }
          })
        );
        setLists(listWithCounts);
      }
    } catch (err) {
      console.error('Failed to fetch reading lists:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && lists.length === 0) {
      fetchLists();
    }
  }, [open]);

  const handleCreate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/reading-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editingName,
          description: editingDescription || undefined,
        }),
      });

      if (response.ok) {
        setEditingName('');
        setEditingDescription('');
        setIsEditing(false);
        fetchLists();
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
      const response = await fetch(`/api/reading-lists/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editingName,
          description: editingDescription || undefined,
        }),
      });

      if (response.ok) {
        setEditingId(null);
        setEditingName('');
        setEditingDescription('');
        setIsEditing(false);
        fetchLists();
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
      const response = await fetch(`/api/reading-lists/${deletingId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        setDeletingId(null);
        setShowDeleteDialog(false);
        fetchLists();
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

  const startEdit = (list: ReadingList) => {
    setEditingId(list.id);
    setEditingName(list.name);
    setEditingDescription(list.description || '');
    setIsEditing(true);
  };

  const startCreate = () => {
    setEditingId(null);
    setEditingName('');
    setEditingDescription('');
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditingId(null);
    setEditingName('');
    setEditingDescription('');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(newOpen: boolean) => {
        setOpen(newOpen);
      }}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="ghost" size="sm">
              <BookOpen className="w-4 h-4 mr-2" />
              管理阅读列表
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>管理阅读列表</DialogTitle>
            <DialogDescription>
              创建和管理阅读列表，组织和规划您的阅读任务
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Create/Edit Form */}
            {isEditing ? (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                <h3 className="font-medium">
                  {editingId ? '编辑阅读列表' : '创建新列表'}
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="list-name">列表名称</Label>
                  <Input
                    id="list-name"
                    placeholder="输入列表名称"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="list-description">描述（可选）</Label>
                  <Textarea
                    id="list-description"
                    placeholder="输入列表描述"
                    value={editingDescription}
                    onChange={(e) => setEditingDescription(e.target.value)}
                    rows={3}
                  />
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
                创建新列表
              </Button>
            )}

            {/* Lists */}
            <div className="space-y-2">
              {isLoading ? (
                <div className="text-center text-muted-foreground py-8">
                  加载中...
                </div>
              ) : lists.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  暂无阅读列表，创建一个开始使用吧！
                </div>
              ) : (
                <div className="space-y-2">
                  {lists.map((list) => (
                    <div
                      key={list.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{list.name}</div>
                        {list.description && (
                          <div className="text-sm text-muted-foreground truncate">
                            {list.description}
                          </div>
                        )}
                        {list.item_count !== undefined && (
                          <Badge variant="outline" className="mt-1">
                            {list.item_count} 篇文献
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => startEdit(list)}
                          variant="ghost"
                          size="sm"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => {
                            setDeletingId(list.id);
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
            <AlertDialogTitle>确认删除阅读列表</AlertDialogTitle>
            <AlertDialogDescription>
              删除阅读列表后，列表中的文献不会被删除，但会从该列表中移除。此操作无法撤销。
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
